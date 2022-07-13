import { Disposable, SubscriptionKeeper } from "./disposable"
import { filter, map, tap, Observable, Subject } from "./rx"

// TODO: do not hardcode localhost
const devServerWs = 'ws://localhost:3000/ws'

export const isDevEnv = (): boolean => {
  // TODO: get from env var?
  return true
}

export const getDevServerMessages = (): Observable<string> => {
  const serverMessages = new Subject<string>()

  const ws = new WebSocket(devServerWs)

  ws.onopen = (() => {
    ws.send('hello from client')
  })

  ws.onmessage = (e => {
    console.info('from dev server: ', e.data)
    serverMessages.next(e.data)
  })

  ws.onerror = (e => console.error('ws error', e))

  return serverMessages
}

type FileUpdatedEvent = {
  fileName: string
}

export function isFileUpdatedMessage(m: string): FileUpdatedEvent | undefined {
  return m.startsWith('updated') ? { fileName: m.replace('updated ', '') } : undefined
}

export const getSourceFilesUpdates = (serverMessages: Observable<string>): Observable<FileUpdatedEvent> => {
  return serverMessages.pipe(
    map(isFileUpdatedMessage),
    filter(m => !!m)
  )
}

export class CssReloader implements Disposable {
  private _subs = new SubscriptionKeeper()
  constructor(private _messages: Observable<FileUpdatedEvent>) {
    this._subs.push(
      this._messages.pipe(
        filter(f => f.fileName.endsWith('css')),
        tap(() => {
          console.log('detected css file update, reloading css')

          var links = document.getElementsByTagName("link");
          for (var cl in links) {
            var link = links[cl];
            if (link.rel === "stylesheet")
              link.href += "";
          }
        })
      ).subscribe()
    )
  }

  dispose(): void {
    this._subs.dispose()
  }
}
