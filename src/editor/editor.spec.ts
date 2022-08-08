import { Dependencies } from 'src/server'
import { WebSocket, MessageEvent } from 'ws'
import { Expect, test, spec, Specification } from '../spec'
import { request, withDatabase, withWebServer, withWSServer } from '../tests/server.spec'
import { editorWSPath } from './editor-server'
import { ChangeRecord } from './editor-types'

const receivedMsg = (ws: WebSocket, message: string, timeout = 1000): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    let received = false
    ws.onmessage = (e) => {
      const msg = e.data.toString()
      if (msg.startsWith(message)) {
        received = true
        resolve(msg.substring(`${message} `.length, msg.length))
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

const getEditorWSUrl = (port: number) => `ws://localhost:${port}${editorWSPath}`

export const specs: Specification[] = [
  spec(
    'editor ws', [
      test('sends session start message', async () => {
        await withWSServer(fakeDeps, async port => {
          const ws = new WebSocket(getEditorWSUrl(port))
          await receivedMsg(ws, 'start')
        })
      }),
      test('responds to ping messages', async () => {
        await withWSServer(fakeDeps, async port => {
          const ws = new WebSocket(getEditorWSUrl(port))
          await opened(ws)
          
          const pongReceived = receivedMsg(ws, 'pong')
          ws.send('ping')

          await pongReceived
        })
      }),
      test('starts edit session', async () => {
        await withDatabase(async sql => {
          await withWSServer({sql}, async port => {
            const ws = new WebSocket(getEditorWSUrl(port))
            await opened(ws)

            const startAck = receivedMsg(ws, 'start')
            ws.send(`start`)

            const id = await startAck
            Expect.equals('1', id)
          })
        })
      }),
      test('writes edits', async () => {
        await withDatabase(async sql => {
          await withWSServer({sql}, async port => {
            const ws = new WebSocket(getEditorWSUrl(port))
            await opened(ws)

            const startAck = receivedMsg(ws, 'start')
            ws.send(`start`)
            const id = await startAck

            const edit: ChangeRecord = {timestamp: 123, changes: [], invertedChanges: []}
            const editAck = receivedMsg(ws, 'edit')
            ws.send(`edit ${JSON.stringify(edit)}`)
            await editAck

            const edit2: ChangeRecord = {timestamp: 124, changes: [], invertedChanges: []}
            const edit2Ack = receivedMsg(ws, 'edit')
            ws.send(`edit ${JSON.stringify(edit2)}`)
            await edit2Ack

            const inDb = await sql<{changes: ChangeRecord[]}[]>`select changes from sessions where id = ${id}`
            Expect.equals(1, inDb.length)
            Expect.equals(2, inDb[0].changes.length)
            Expect.equals(edit.timestamp, inDb[0].changes[0].timestamp)
            Expect.equals(edit2.timestamp, inDb[0].changes[1].timestamp)
          })
        })
      })
    ]
  )
]
