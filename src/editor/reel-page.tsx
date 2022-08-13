import { React } from '../react'
import * as monaco from '../monaco'
import { Disposable } from '../disposable'
import * as Rx from "../rx"
import { useDisposable, useSubscription } from '../hooks'
import { invariant } from '../errors'
import { consoleLogger, logPrefix } from '../logger'
import { View } from '../hoc'
import { Change, ChangeMessage, ChangesWithUndo, EditorChange } from './editor-types'
import { Player, PlayBtn, TimeRange } from './player'
import { Editor as TextEditor } from './editor'
import { doNothing } from '../utils'

export interface ReelState {
  videoDuration: number
  videoPosition: number
  playing: boolean
  errors: string[]
}

export const initialState: ReelState = {
  videoDuration: 0,
  videoPosition: 0,
  playing: false,
  errors: []
}

class ReelModel implements Disposable {
  private _changes: ChangeMessage[] = []
  private _changesLeft: ChangeMessage[] = []
  private _changesSub: Rx.Subscription

  private _state: Rx.BehaviorSubject<ReelState> =
    new Rx.BehaviorSubject(initialState)

  private _logger = logPrefix(`[reel model]:`)(consoleLogger)

  constructor(
    private _reelId: string,
    private _playerVideo: React.MutableRefObject<HTMLVideoElement>,
    private _pushChanges: (changes: Change[]) => void,
    private _setContent: (text: string) => void
  ) {
    (window as any).ref = _playerVideo
    fetch(`/api/editor/sessions/${this._reelId}`, {
      method: 'GET',
      credentials: 'same-origin'
    })
      .then(response => response.json().then(body => {
        return { response, body: body as ChangeMessage[] }
      }))
      .then<void>(({ response, body }) => {
        if (response.ok) {
          this._changes = body
          this._changesLeft = body
        }

        // TODO: display final session content as preview? 

        // TODO: errors
      })
  }

  get state(): Rx.Observable<ReelState> {
    return this._state
  }

  togglePlay() {
    const state = this._state.getValue()
    if (state.playing) {
      this._changesSub.unsubscribe()
      this._changesSub = null
      this._playerVideo.current.ontimeupdate = null
      void this._playerVideo.current.pause()
      this._state.next({...state, playing: false})
      return
    }

    this._changesLeft = this._changes
    const pushChanges = (msPassed: number, changes: ChangeMessage[]) => {
      const head = changes[0]
      if (head && head.timestamp < msPassed) {
        const toApply = changes.splice(0, 1)[0]
        this._pushChanges(toApply.changes)
        pushChanges(msPassed, changes)
      }
      
      return
    }
    
    void this._playerVideo.current.play()
    this._playerVideo.current.ontimeupdate = (e => {
      // this._logger.info('time', e)
    })
    this._state.next({...state, playing: true})
    this._setContent('')
    const intervalMs = 20
    this._changesSub = Rx.interval(intervalMs).pipe(
      Rx.tap(passed => {
        pushChanges(passed * intervalMs, this._changesLeft)
      })
    ).subscribe()
  }

  dispose(): void {
    this._changesSub?.unsubscribe()
    this._changesSub = null
  }
}

export const Reel = ({id}: {id: string}) => {
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor>()
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const model = new ReelModel(
    id, 
    videoRef,
    changes => {
      editorRef.current.getModel().pushEditOperations(
        [], 
        changes.map(c => ({...c, forceMoveMarkers: true})), 
        null
      )
    },
    text => editorRef.current.getModel().setValue(text)
  )
  useDisposable(model)

  const changesObs = new Rx.Subject<EditorChange>()
  const isTimeTraveling = React.useRef(false)

  const prevPosition = React.useRef(0)
  const timePosition = new Rx.Subject<number>()
  useSubscription(timePosition.pipe(
    Rx.tap(p => {
      timeTravel(p)
    })
  ))

  //start with an empty change to be able to rewind all the way to the empty state
  const changesWithUndo = React.useRef<ChangesWithUndo[]>([{changes: [], invertedChanges: []}])

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

  return (
    <div className='inline-flex flex-column m-1'>
      <div className='inline-flex'>
        <TextEditor ref={editorRef} onChange={doNothing} defaultContent={''} />
        <div className='pl-1'>
          <Player ref={videoRef} src={`/tmp/${id}.webm`} />
        </div>
      </div>
      <div style={{width: '100%'}}>
      <View stream={model.state}>
          {s => <TimeRange totalDuration={s.videoDuration} position={s.videoPosition} onPositionUpdate={doNothing} />}
        </View>
      </div>
      <div>
        <View stream={model.state}>
          {s => <>
            <PlayBtn onClick={() => model.togglePlay()} isPlaying={s.playing} />
          </>}
        </View>
      </div>
    </div>
  )
}

