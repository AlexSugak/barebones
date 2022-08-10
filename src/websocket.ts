import { Disposable } from './disposable'
import * as Rx from "./rx"
import { consoleLogger, logPrefix } from './logger'
import { doNothing } from './utils'

export const msgPayload = (prefix: string) => (message: string) => 
  message.substring(`${prefix} `.length, message.length)

export interface WS<Req, Resp> extends Disposable{
  messages: Rx.Observable<Resp>
  send(msg: Req): void
}

export interface WSOptions {
  name: string
  url: string
  onOpen?: () => Promise<void>
  onClose?: () => Promise<void>
}

export const getWS = <Req, Resp>({url, name, onClose = doNothing, onOpen = doNothing}: WSOptions): WS<Req, Resp> => {
  const logger = logPrefix(`[${name} ws]:`)(consoleLogger)
  const serverMessages = new Rx.Subject<Resp>()

  const ws = new WebSocket(url)

  ws.onopen = (() => {
    logger.info('opening')
    void onOpen()
  })

  ws.onclose = (() => {
    logger.info('closing')
    void onClose()
  })

  ws.onmessage = (e => {
    logger.info('received: ', e.data)
    serverMessages.next(e.data as Resp)
  })

  ws.onerror = (e => logger.error('error', e))

  return {
    messages: serverMessages,
    send: msg => ws.send(msg as any),
    dispose: () => ws.close()
  }
}

