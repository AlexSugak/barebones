import { React } from '../react'
import * as monaco from '../monaco'
import { Disposable } from '../disposable'
import * as Rx from "../rx"
import { useDisposable, useSubscription } from '../hooks'
import { invariant } from '../errors'
import { consoleLogger, logPrefix } from '../logger'
import { getWS, msgPayload, WS } from '../websocket'
import { View } from '../hoc'
import { Change, ChangeMessage, ChangesWithUndo, EditorChange } from './editor-types'
import { Player, RecordBtn } from './player'
import { Editor as TextEditor } from './editor'

// TODO: do not hardcode localhost
// TODO: should be wss
const editorWsUrl = 'ws://localhost:3000/editor/ws'
const videoWsUrl = 'ws://localhost:3000/editor/video/ws'

export interface EditorState {
  recording: boolean
  cameraOn: boolean
  errors: string[]
}

export const initialState: EditorState = {
  recording: false,
  cameraOn: false,
  errors: []
}  

class EditorModel implements Disposable {
  private _state: Rx.BehaviorSubject<EditorState> =
    new Rx.BehaviorSubject(initialState)

  // TODO: use more narrow types of messages
  private _editorWS: WS<string, string> | null
  private _videoWS: WS<string | Blob, string> | null
  private _cameraStream: MediaStream | null
  private _recorder: MediaRecorder | null
  private _changesListener: Rx.Subscription | null
  private _recordingStartedAt: number = 0

  private _logger = logPrefix(`[editor model]:`)(consoleLogger)

  constructor(
    private _playerVideo: React.MutableRefObject<HTMLVideoElement>,
    private _changes: Rx.Observable<ChangesWithUndo>,
    private _getContent: () => string
  ) {
  }

  get state(): Rx.Observable<EditorState> {
    return this._state
  }

  async toggleCameraOn() {
    const state = this._state.getValue()
    this._logger.trace('toggleCameraOn', state)

    if (!state.cameraOn) {
      this._cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      this._playerVideo.current.srcObject = this._cameraStream
    } else {
      this._cameraStream = null
      this._playerVideo.current.srcObject = null

      if (state.recording && this._recorder) {
        // TODO: pause instead?
        this._recorder.onstop = () => {
          // ws.current.close()
          // ws.current = null  
        }
        this._recorder.stop()
        this._recorder = null
      }
    }

    this._state.next({...state, cameraOn: !state.cameraOn})
  }

  async toggleRecording() {
    const state = this._state.getValue()
    this._logger.trace('toggleRecording', state)

    if (state.recording) { // stop
      this.stopRecording()
      this._state.next({...state, recording: !state.recording})
      return
    }

    this._editorWS = getWS({
      url: editorWsUrl,
      name: 'changes',
      onOpen: async () => {
        this._logger.trace('start changes session')
        this._editorWS!.send('start')

        const sessionId = await Rx.firstValueFrom(
          this._editorWS!.messages.pipe(
            Rx.first(m => m.startsWith('start')),
            Rx.map(msgPayload('start'))
          )
        )

        this.startVideoRecording(sessionId)

        const firstChange = initialChange(this._getContent())
        const firstChangeMessage: ChangeMessage = {
          timestamp: 0,
          changes: [firstChange], 
          invertedChanges: invertChanges([firstChange], '')
        }

        this._changesListener = this._changes.pipe(
          Rx.map(c => {
            const msg: ChangeMessage = {
              ...c,
              timestamp: Date.now() - this._recordingStartedAt
            }
            return msg
          }),
          Rx.startWith(firstChangeMessage),
          Rx.tap(c => this._logger.trace('change', c)),
          Rx.tap(c => this._editorWS!.send(`change ${JSON.stringify(c)}`))
        ).subscribe()

        this._logger.trace('changes session started', sessionId)
      }
    })

    this._state.next({...state, recording: !state.recording})
  }

  private stopRecording() {
    this._recorder.onstop = () => {
      this._videoWS?.dispose()
      this._videoWS = null
    }
    this._recorder.stop()
    this._recorder = null

    this._changesListener?.unsubscribe()
    this._changesListener = null

    this._editorWS?.dispose()
    this._editorWS = null
  }

  private startVideoRecording(sessionId: string) {
    invariant(
      this._cameraStream !== null,
      'camera must be on before starting recording')

    const recorderOptions = {
      mimeType: 'video/webm',
      videoBitsPerSecond: 200000 // 0.2 Mbit/sec.
    }
    this._recorder = new MediaRecorder(this._cameraStream, recorderOptions)
    this._recorder.onstart = () => {
      this._recordingStartedAt = Date.now()
    }

    this._videoWS = getWS({
      url: videoWsUrl,
      name: 'video',
      onOpen: async () => {
        this._logger.trace('start video recording')
        this._videoWS.send(`start ${sessionId}`)

        this._recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this._videoWS.send(event.data);
          }
        }
    
        this._recorder.start(1000) // 1000 - the number of milliseconds to record into each Blob
      }
    }) 
  }

  dispose(): void {
    this.stopRecording()
    this._videoWS?.dispose()
  }
}

const defaultCode = 'function hello() {}'

export const Editor = ({}) => {
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor>()
  const changesObs = new Rx.Subject<EditorChange>()
  const isTimeTraveling = React.useRef(false)

  //start with an empty change to be able to rewind all the way to the empty state
  const changesWithUndo = React.useRef<ChangesWithUndo[]>([{changes: [], invertedChanges: []}])

  const changesWithUndoObs = changesObs.pipe(
    Rx.map(c => ({changes: c.changes, invertedChanges: invertChanges(c.changes, c.prevContent)})),
  )

  useSubscription(changesWithUndoObs.pipe(
    Rx.tap(c => console.log("change", c)),
    Rx.tap(c => {
      changesWithUndo.current.push(c)
      prevPosition.current = changesWithUndo.current.length - 1
    })
  ))

  const prevPosition = React.useRef(0)
  const timePosition = new Rx.Subject<number>()
  useSubscription(timePosition.pipe(
    // Rx.tap(p => console.log(p))
    Rx.tap(p => {
      timeTravel(p)
    })
  ))

  const timeTravel = (timePosition: number) => {
    // timePosition is from 0 to 100
    // prevPosition is index in changesArray

    isTimeTraveling.current = true

    const changesTotal = changesWithUndo.current.length
    const prev = prevPosition.current
    const scale = 100 / changesTotal
    const timeScaled = Math.floor(timePosition / scale)
    
    console.log({changesTotal, prev, timePosition, timeScaled, scale})

    if (timeScaled === prev) {
      return
    }

    if (timeScaled > prev) { // redo
      const delta = [...changesWithUndo.current].splice(prev + 1, timeScaled - prev)
      console.log(delta)
      redo(delta, () => {
        isTimeTraveling.current = false
        prevPosition.current = timeScaled
      })
    } else { // undo
      const delta = [...changesWithUndo.current].splice(timeScaled + 1, prev - timeScaled)
      console.log(delta)
      undo(delta, () => {
        isTimeTraveling.current = false
        prevPosition.current = timeScaled
      })
    }
  }

  const redo = (c: ChangesWithUndo[], onFinished: () => void, delay = 0) => {
    if (c.length === 0) {
      onFinished()
      return
    }

    const first = c.splice(0, 1)[0]

    editorRef.current.getModel().pushEditOperations(
      [], 
      first.changes.map(c => ({...c, forceMoveMarkers: true})), 
      null
    )
    if (delay > 0) {
      setTimeout(() => redo(c, onFinished, delay), delay)
    } else {
      redo(c, onFinished)
    }
  }

  const undo = (c: ChangesWithUndo[], onFinished: () => void, delay = 0) => {
    if (c.length === 0) {
      onFinished()
      return
    }

    const last = c.pop()

    editorRef.current.getModel().pushEditOperations(
      [], 
      last.invertedChanges.map(c => ({...c, forceMoveMarkers: true})), 
      null
    )
    if (delay > 0) {
      setTimeout(() => undo(c, onFinished, delay), delay)
    } else {
      undo(c, onFinished)
    }
  }

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const editorModel = new EditorModel(
    videoRef,
    changesWithUndoObs,
    () => editorRef.current.getModel().getValue()
  )
  useDisposable(editorModel)

  React.useEffect(() => {
    editorModel.toggleCameraOn()
  }, [])

  const onTextChange = (e, prevContent) => {
    if(!isTimeTraveling.current){
      changesObs.next({changes: e.changes, prevContent})
    }
  }

  return (
    <div className='inline-flex flex-column m-1'>
      <div className='inline-flex'>
        <TextEditor ref={editorRef} onChange={onTextChange} defaultContent={defaultCode} />
        <div className='pl-1'>
          <Player ref={videoRef} />
        </div>
      </div>
      <div style={{width: '100%'}}>
        <TimeRange positionListener={timePosition} />
      </div>
      <div>
        <View stream={editorModel.state}>
          {s => <>
            <RecordBtn onClick={() => editorModel.toggleRecording()} isRecording={s.recording} />
          </>}
        </View>
      </div>
    </div>
  )
}

const TimeRange = ({positionListener}: {positionListener: Rx.Observer<number>}) => {
  const [timeSliderValue, setTimeSliderValue] = React.useState(100)

  const updatePosition = (newPosition: number) => {
    setTimeSliderValue(newPosition)
    positionListener.next(newPosition)
  }

  return (<input 
    type="range"
    min="0" 
    max="100" 
    value={timeSliderValue}
    onChange={e => updatePosition(Number(e.target.value))}
    style={{width: '100%', cursor: 'pointer'}} 
  />)
}

function initialChange(text: string): Change {
  return {
    range: {startColumn: 1, endColumn: 1, startLineNumber: 1, endLineNumber: 1},
    rangeOffset: 0,
    rangeLength: 0,
    text
  }
} 

// TODO: move this to the server to not add load to the client ?

function invertChanges(changes: Change[], prevContent: string): Change[] {
  invariant(changes.length === 1, 'inverting array of changes is not implemented') 
  // TODO: support multiple changes

  const [change, ...rest] = changes

  if (change.rangeLength === 0) { // insert
    const newLineInserts = (change.text.match(/\n/g) || []).length
    const endsWithNewLine = change.text.endsWith("\n")
    return [
      {
        ...change,
        range: {
          ...change.range,
          endColumn: endsWithNewLine ? 1 : change.range.endColumn + change.text.length,
          endLineNumber: change.range.endLineNumber + newLineInserts
        },
        rangeLength: change.text.length,
        text: ''
      }
    ]
  } else { // delete
    // split text into lines but leave the \n char
    const lines = prevContent.match(/.*?\n|.+$/g)
    // TODO: handle multi-line deletes
    const deletedAtLine = lines[change.range.startLineNumber - 1]
    const deletedText = deletedAtLine.substring(change.range.startColumn - 1, change.range.endColumn - 1)

    return [
      {
        ...change,
        range: {
          ...change.range,
          endColumn: change.range.startColumn
        },
        rangeLength: 0,
        text: deletedText
      }
    ]
  }
}
