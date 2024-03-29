import { React } from '../react'
import * as monaco from '../monaco'
import { Disposable } from '../disposable'
import * as Rx from "../rx"
import { useDisposable } from '../hooks'
import { invariant } from '../errors'
import { consoleLogger, logPrefix } from '../logger'
import { getWS, msgPayload, WS } from '../websocket'
import { View } from '../hoc'
import { Change, ChangeMessage, ChangesWithUndo, EditorChange } from './editor-types'
import { Player, RecordBtn } from './player'
import { Editor as TextEditor } from './editor'
import { Link } from '../router'

// TODO: do not hardcode localhost
// TODO: should be wss
const editorWsUrl = 'ws://localhost:3000/editor/ws'
const videoWsUrl = 'ws://localhost:3000/editor/video/ws'

export interface EditorState {
  sessionId: string | null
  recording: boolean
  cameraOn: boolean
  errors: string[]
}

export const initialState: EditorState = {
  sessionId: null,
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

        this.updateState(s => ({...s, sessionId}))

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
    if (this._recorder) {
      this._recorder.onstop = async () => {
        const duration = Date.now() - this._recordingStartedAt
        this._logger.info('duration', duration)
        this._editorWS.send(`duration ${duration}`)

        // wait for ack
        await Rx.firstValueFrom(
          this._editorWS!.messages.pipe(
            Rx.first(m => m.startsWith('duration'))
          )
        )

        this._editorWS?.dispose()
        this._editorWS = null
        this._videoWS?.dispose()
        this._videoWS = null
      }
    }

    this._recorder?.stop()
    this._recorder = null

    this._changesListener?.unsubscribe()
    this._changesListener = null
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

  private updateState(update: (state: EditorState) => EditorState) {
    const prevState = this._state.getValue()
    this._state.next(update(prevState))
  }

  dispose(): void {
    this.stopRecording()
    this._videoWS?.dispose()
  }
}

const defaultCode = 'function hello() {}'

export const Editor = ({navigate}: {navigate: (url: string) => void}) => {
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor>()
  const changesObs = new Rx.Subject<EditorChange>()
  const changesWithUndoObs = changesObs.pipe(
    Rx.map(c => ({changes: c.changes, invertedChanges: invertChanges(c.changes, c.prevContent)})),
  )

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
    changesObs.next({changes: e.changes, prevContent})
  }

  return (
    <div className='inline-flex flex-column m-1'>
      <div className='inline-flex'>
        <TextEditor ref={editorRef} onChange={onTextChange} defaultContent={defaultCode} />
        <div className='pl-1'>
          <Player ref={videoRef} autoPlay muted />
        </div>
      </div>
      <div>
        <View stream={editorModel.state}>
          {s => <>
            <RecordBtn onClick={() => editorModel.toggleRecording()} isRecording={s.recording} />
          </>}
        </View>
      </div>
      <div>
        <View stream={editorModel.state}>
          {s => !s.recording && s.sessionId 
                && <Link
                    label='go to recording'
                    navigate={navigate}
                    route={{path: '/reels/(?<id>.*)', params: {id: s.sessionId}}} />}
        </View>
      </div>
    </div>
  )
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
