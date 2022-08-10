import { React } from '../react'
import * as Rx from '../rx'
import { View } from '../hoc'
import { Disposable } from '../disposable'
import { useDisposable } from '../hooks'

// TODO: do not hardcode localhost
const videoWs = 'ws://localhost:3000/editor/video/ws'

export interface PlayerState {
  isRecording: boolean
  isLive: boolean
  errors: string[]
}

export const initialState: PlayerState = {
  isRecording: false,
  isLive: false,
  errors: []
}

class PlayerManager implements Disposable {
  private _state: Rx.BehaviorSubject<PlayerState> =
    new Rx.BehaviorSubject(initialState)

  constructor() {
  }

  get state(): Rx.Observable<PlayerState> {
    return this._state
  }

  goLive() {
    const state = this._state.getValue()
    if (!state.isLive) {
      this._state.next({...state, isLive: true})
    }
  }

  startRecording() {
    const state = this._state.getValue()
    if (state.isLive && !state.isRecording) {
      this._state.next({...state, isRecording: true})
    }
  }

  stopRecording() {
    const state = this._state.getValue()
    if (state.isRecording) {
      this._state.next({...state, isRecording: false})
    }
  }

  dispose(): void {
      
  }
}

export const Player = ({}) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const cameraStream = React.useRef<MediaStream | null>(null)
  const recorder = React.useRef<MediaRecorder | null>(null)
  const ws = React.useRef<WebSocket | null>(null)

  const sm = new PlayerManager()

  const onPlay = async () => {
    if (videoRef.current && cameraStream.current === null) {
      sm.goLive()
      cameraStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      videoRef.current.srcObject = cameraStream.current
    }
  }

  const onRecord = () => {
    if (recorder.current !== null) {
      console.info('stopping recording')
      sm.stopRecording()

      recorder.current.onstop = () => {
        ws.current.close()
        ws.current = null  
      }
      recorder.current.stop()
      recorder.current = null

      return
    }

    sm.startRecording()
    const videoStream = cameraStream.current

    const recorderOptions = {
      mimeType: 'video/webm',
      videoBitsPerSecond: 200000 // 0.2 Mbit/sec.
    }

    recorder.current = new MediaRecorder(videoStream, recorderOptions)

    ws.current = new WebSocket(videoWs)

    ws.current.onopen = (() => {
      console.info('opening video ws')

      recorder.current.ondataavailable = (event) => {
        console.info('Got blob data:', event.data);
        if (event.data && event.data.size > 0) {
          ws.current.send(event.data);
        }
      }
  
      recorder.current.start(1000) // 1000 - the number of milliseconds to record into each Blob
    })
  }

  useDisposable({
    dispose: () => {
      ws.current?.close()
    }
  })

  return (
    <div>
      <div>
        <video style={{backgroundColor: 'gray'}} ref={videoRef} height={"200"} width={"300"} autoPlay muted />
      </div>
      <View stream={sm.state}>
        {s => <>
          <PlayBtn onClick={onPlay} isPlaying={s.isLive} />
          <RecordBtn onClick={onRecord} isRecording={s.isRecording} />
        </>}
      </View>
    </div>
  )
}

export const PlayBtn = ({onClick, isPlaying}: {onClick: () => void, isPlaying: boolean}) => {
  return (
    <button
      className="inline-flex pointer"
      name="play"
      onClick={onClick}>
        {isPlaying 
          ? <svg style={{height: "1.25rem", width: "1.25rem"}} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          : <svg style={{height: "1.25rem", width: "1.25rem"}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
    </button>
  )
}

export const RecordBtn = ({onClick, isRecording}: {onClick: () => void, isRecording: boolean}) => {
  return (
    <button
      className="inline-flex pointer"
      name="record"
      onClick={onClick}>
        {isRecording 
          ? <svg style={{height: "1.25rem", width: "1.25rem"}} className="redFill" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
          : <svg style={{height: "1.25rem", width: "1.25rem"}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>}
    </button>
  )
}
