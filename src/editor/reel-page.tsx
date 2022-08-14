import { React } from '../react'
import * as monaco from '../monaco'
import { Disposable } from '../disposable'
import * as Rx from "../rx"
import { useDisposable, useSubscription } from '../hooks'
import { invariant } from '../errors'
import { consoleLogger, logPrefix } from '../logger'
import { View } from '../hoc'
import { Change, ChangeMessage, SessionResponse } from './editor-types'
import { Player, PlayBtn, TimeRange } from './player'
import { Editor as TextEditor } from './editor'
import { doNothing, identity } from '../utils'

export function indexChanges(changes: ChangeMessage[]): ChangeMessage[][] {
  return changes.reduce<ChangeMessage[][]>((acc, change) => {
    const second = Math.floor(change.timestamp / 1000)
    if (acc.length > second) {
      acc[second].push(change)
    } else {
      while(acc.length > 0 && acc.length < second) {
        acc.push([])
      }

      acc.push([change])
    }

    return acc
  }, [])
}

export function getChangesInRange(changesIndex: ChangeMessage[][], timeStart: number, timeEnd: number) {
  let from: number
  let to: number
  if (timeEnd < timeStart) {
    from = timeEnd
    to = timeStart
  } else {
    from = timeStart
    to = timeEnd
  }

  const fromSec = Math.floor(from / 1000)
  const toSec = Math.floor(to / 1000)

  return changesIndex
            .slice(fromSec, toSec + 1)
            .flatMap(identity)
            .filter(c => c.timestamp >= from && c.timestamp < to)
}

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
  private _changesIndex: ChangeMessage[][] = []
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
        return { response, body: body as SessionResponse }
      }))
      .then<void>(({ response, body }) => {
        if (response.ok) {
          this._changesIndex = indexChanges(body.changes)
          this._logger.info('index', this._changesIndex)
          const state = this._state.getValue()
          this._state.next({...state, videoDuration: body.duration})
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

    void this._playerVideo.current.play()
    this._playerVideo.current.ontimeupdate = (e => {
      const videoPosition = (e.target as HTMLVideoElement).currentTime * 1000
      this.updateState(s => ({...s, videoPosition }))
    })
    this._state.next({...state, playing: true})
    const intervalMs = 20
    const startFrom = state.videoPosition
    this._changesSub = Rx.interval(intervalMs).pipe(
      Rx.map(t => t * intervalMs + startFrom),
      Rx.startWith(startFrom),
      Rx.pairwise(),
      Rx.tap(([from, to]) => {
        this.applyChanges(from, to)
      })
    ).subscribe()
  }

  private applyChanges(timeStart: number, timeEnd: number) {
    let forward = timeStart < timeEnd
    const changes = getChangesInRange(this._changesIndex, timeStart, timeEnd)

    if (forward) {
      changes.forEach(c => this._pushChanges(c.changes))
    } else {
      for (let index = changes.length - 1; index >= 0; index--) {
        this._pushChanges(changes[index].invertedChanges);
      }
    }
  }

  toggleSeek() {
    const state = this._state.getValue()

    if(state.playing) {
      this.togglePlay()
    }
  }

  setTime(timeMs: number) {
    const state = this._state.getValue()

    this._playerVideo.current.currentTime = timeMs / 1000
    this.applyChanges(state.videoPosition, timeMs)
    this.updateState(s => ({...s, videoPosition: timeMs}))
  }

  private updateState(update: (state: ReelState) => ReelState) {
    const prevState = this._state.getValue()
    this._state.next(update(prevState))
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
          {s => <TimeRange 
                  totalDuration={s.videoDuration} 
                  position={s.videoPosition}
                  onStartUpdatingPosition={() => model.toggleSeek()}
                  onEndUpdatingPosition={() => model.toggleSeek()}
                  onPositionUpdate={t => model.setTime(t)} />}
        </View>
      </div>
      <div>
        <View stream={model.state}>
          {s => <>
            <PlayBtn onClick={() => model.togglePlay()} isPlaying={s.playing} />
            <br/>
            {`duration: ${s.videoDuration / 1000} s`}
          </>}
        </View>
      </div>
    </div>
  )
}

