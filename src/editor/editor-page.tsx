import { React } from '../react'
import * as monaco from '../monaco'
import { Disposable } from '../disposable'
import * as Rx from "../rx"
import { useDisposable, useSubscription } from '../hooks'
import { invariant } from '../errors'
import { Player, RecordBtn } from './player'
import { consoleLogger, logPrefix } from '../logger'
import { getWS, msgPayload, WS, WSOptions } from '../websocket'
import { View } from '../hoc'

// TODO: do not hardcode localhost
// TODO: should be wss
const editorWsUrl = 'ws://localhost:3000/editor/ws'

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

  private _editorWS: WS | null
  private _videoWS: WS | null
  private _cameraStream: MediaStream | null
  private _recorder: MediaRecorder | null
  private _sessionId: string | null
  private _changesListener: Rx.Subscription | null

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
      this.stopEditor()
      this._state.next({...state, recording: !state.recording})
      return
    }

    this._editorWS = getWS({
      url: editorWsUrl,
      name: 'changes',
      onOpen: async () => {
        this._logger.trace('start changes session')
        this._editorWS!.send('start')

        this._sessionId = await Rx.firstValueFrom(
          this._editorWS!.messages.pipe(
            Rx.first(m => m.startsWith('start')),
            Rx.map(msgPayload('start'))
          )
        )

        const firstChange = initialChange(this._getContent())
        const firstChangeWithUndo: ChangesWithUndo = {
          changes: [firstChange], 
          invertedChanges: invertChanges([firstChange], '')
        }

        this._changesListener = this._changes.pipe(
          Rx.startWith(firstChangeWithUndo),
          Rx.tap(c => this._logger.trace('change', c)),
          Rx.tap(c => this._editorWS!.send(`change ${JSON.stringify(c)}`))
        ).subscribe()

        this._logger.trace('changes session started', this._sessionId)
      }
    })

    this._state.next({...state, recording: !state.recording})
  }

  private stopEditor() {
    this._changesListener?.unsubscribe()
    this._changesListener = null

    this._editorWS?.dispose()
    this._editorWS = null
  }

  dispose(): void {
    this.stopEditor()
    this._videoWS?.dispose()
  }
}


type Change = monaco.editor.IModelContentChange
type ChangesWithUndo = { changes: Change[], invertedChanges: Change[] } 
type EditorChange = { changes: Change[], prevContent: string }

const defaultCode = 'function hello() {}'

export const Editor = ({}) => {
  const editorElementRef = React.useRef<HTMLDivElement | undefined>(undefined)

  React.useEffect(() => {
    const loaderScript = document.createElement('script')
    loaderScript.src = '/js/lib/monaco/min/vs/loader.js'
    loaderScript.async = true;
    document.body.appendChild(loaderScript)

    const editorSettings: monaco.editor.IStandaloneEditorConstructionOptions = {
      value: '',
      language: 'javascript',
      minimap: {
        enabled: false
      },
      tabSize: 2,
      insertSpaces: true
    }
    const initScript = document.createElement('script')
    initScript.async = true;
    initScript.innerHTML = `
    require.config({ paths: { vs: '/js/lib/monaco/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      window.monacoEditor = monaco.editor.create(document.getElementById('editorContainer'), ${JSON.stringify(editorSettings)});
      window.initEditor(window.monacoEditor)
    });
    `

    loaderScript.onload = () => {
      document.body.appendChild(initScript)
    }
  
    return () => {
      document.body.removeChild(loaderScript)
      document.body.removeChild(initScript)
    }
  }, [])

  const changesObs = new Rx.Subject<EditorChange>()
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor>()
  const isTimeTraveling = React.useRef(false)
  const initEditor = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
    const model = editor.getModel()
    let content = model.getValue()

    model.onDidChangeContent(e => {
      if(!isTimeTraveling.current){
        changesObs.next({changes: e.changes, prevContent: content})
      }
      content = model.getValue()
    })

    requestAnimationFrame(() => 
      model.pushEditOperations(
        [], 
        [{
          forceMoveMarkers: true,
          range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1
          },
          text: defaultCode
        }],
        null
      ))
  }

  React.useEffect(() => {
    (window as any).initEditor = initEditor
  }, [])

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

  const undoAll = () => {
    isTimeTraveling.current = true
    undo(changesWithUndo.current, () => {isTimeTraveling.current = false}, 500)
  }

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const editorModel = new EditorModel(
    videoRef,
    changesWithUndoObs,
    () => editorRef.current.getModel().getValue()
  )
  useDisposable(editorModel)

  return (
    <div className='inline-flex flex-column m-1'>
      <div className='inline-flex'>
        <div 
          id="editorContainer" 
          ref={editorElementRef} 
          style={{width: '300px', height: '200px', border: '1px solid grey'}}>
        </div>
        <div className='pl-1'>
          <Player />
        </div>
      </div>
      {/* <div style={{margin: '10px'}}>
        <button className="btnPrimary" onClick={undoAll}>Undo all</button>
      </div> */}
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
