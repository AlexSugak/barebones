import { Dependencies } from 'src/server'
import { WebSocket, MessageEvent } from 'ws'
import { Expect, test, spec, Specification } from '../spec'
import { request, withDatabase, withWebServer, withWSServer } from '../tests/server.spec'
import { editorWSPath } from './editor-server'
import { ChangeMessage } from './editor-types'

const receivedMsg = (ws: WebSocket, message: string, timeout: number = 1000): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    let received = false
    ws.onmessage = (e) => {
      const msg = e.data.toString()
      if (msg.startsWith(message)) {
        received = true
        resolve(msg.substring(`${message} `.length, msg.length))
      }
    }
    
    setTimeout(() => {
      if (!received) {
        const seconds = timeout / 1000
        reject(`did not receive ${message} message in ${seconds} sec`)
      }
    }, timeout)
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
      test('sends ready message', async () => {
        await withWSServer(fakeDeps, async port => {
          const ws = new WebSocket(getEditorWSUrl(port))
          await receivedMsg(ws, 'ready')
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

            const change: ChangeMessage = {timestamp: 123, changes: [], invertedChanges: []}
            const changeAck = receivedMsg(ws, 'change')
            ws.send(`change ${JSON.stringify(change)}`)
            await changeAck

            const change2: ChangeMessage = {timestamp: 124, changes: [], invertedChanges: []}
            const change2Ack = receivedMsg(ws, 'change')
            ws.send(`change ${JSON.stringify(change2)}`)
            await change2Ack

            const inDb = await sql<{changes: ChangeMessage[]}[]>`select changes from sessions where id = ${id}`
            Expect.equals(1, inDb.length)
            Expect.equals(2, inDb[0].changes.length)
            Expect.equals(change.timestamp, inDb[0].changes[0].timestamp)
            Expect.equals(change2.timestamp, inDb[0].changes[1].timestamp)
          })
        })
      }),
      test('writes duration', async () => {
        await withDatabase(async sql => {
          await withWSServer({sql}, async port => {
            const ws = new WebSocket(getEditorWSUrl(port))
            await opened(ws)

            const startAck = receivedMsg(ws, 'start')
            ws.send(`start`)
            const id = await startAck

            const durationAck = receivedMsg(ws, 'duration')
            ws.send('duration 1234')
            await durationAck

            const inDb = await sql<{duration: number}[]>`select duration from sessions where id = ${id}`
            Expect.equals(1, inDb.length)
            Expect.equals(1234, inDb[0].duration)
          })
        })
      }),
    ]
  ),
  spec(
    'editor sessions api', [
      test('returns session details', async () => {
        await withDatabase(async sql => 
          await withWebServer(
            { sql },
            async port => {
              await sql<{}[]>`insert into sessions (duration, changes) values (2, '[{"a": "123"}]')`

              return request({
                hostname: 'localhost',
                path: '/api/editor/sessions/1',
                port,
                method: 'GET'
              })
            },
            resp => {
              Expect.equals(200, resp.status)
              const expectedResponse = JSON.stringify({id: 1, duration: 2, changes: [{a: '123'}]})
              Expect.equals(expectedResponse, resp.data.toString())
            }
          ))
      }),
      test('returns 404 if session not found', async () => {
        await withDatabase(async sql => 
          await withWebServer(
            { sql },
            port => request({
              hostname: 'localhost',
              path: '/api/editor/sessions/2',
              port,
              method: 'GET'
            }),
            resp => {
              Expect.equals(404, resp.status)
            }
          ))
      })
    ]
  )
]
