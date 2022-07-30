import { Dependencies } from 'src/server'
import { WebSocket, MessageEvent } from 'ws'
import { Expect, test, spec, Specification } from '../spec'
import { request, withDatabase, withWebServer, withWSServer } from '../tests/server.spec'
import { editorWSPath } from './editor-server'

const receivedMsg = (ws: WebSocket, message: string, timeout = 1000): Promise<boolean> => {
  return new Promise<boolean>((resolve, reject) => {
    let received = false
    ws.onmessage = (e) => {
      if (e.data === message) {
        received = true
        resolve(true)
      }
    }

    setTimeout(() => !received && reject(`did not receive ${message} message in ${timeout / 1000} sec`), timeout)
  })
}

const opened = (ws: WebSocket) => new Promise<WebSocket>(
  (resolve, reject) => {
    ws.onopen = () => resolve(ws)
    ws.onerror = (e) => reject(new Error('ws error: ' + e.error))
  })

const fakeDeps: Dependencies = {sql: {} as any}

export const specs: Specification[] = [
  spec(
    'editor ws', [
      test('sends session start message', async () => {
        await withWSServer(fakeDeps, async port => {
          const ws = new WebSocket(`ws://localhost:${port}${editorWSPath}`)
          const startReceived = receivedMsg(ws, 'start')

          await startReceived
        })
      }),
      test('responds to ping messages', async () => {
        await withWSServer(fakeDeps, async port => {
          const ws = new WebSocket(`ws://localhost:${port}${editorWSPath}`)
          const pongReceived = receivedMsg(ws, 'pong')

          await opened(ws)
          ws.send('ping')

          await pongReceived
        })
      })
    ]
  )
]
