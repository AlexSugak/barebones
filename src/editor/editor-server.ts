import * as http from 'http'
import fs from 'fs'
import path from 'path'
import { WebSocketServer } from 'ws'
import { Dependencies, EndpointInit, WSInit } from '../server'
import { consoleLogger, logPrefix } from '../logger'
import { ChangeRecord } from './editor-types'
import { msgPayload } from '../websocket'
import { invariant } from '../errors'

const tmpDir: string = process.env.TMP_DIR || './tmp'

export const editorWSPath = '/editor/ws'
export const videoWSPath = '/editor/video/ws'

export const initWS: WSInit = ({sql}: Dependencies, server: http.Server) => {
  const logger = logPrefix(`[editor ${(server.address() as any).port}]:`)(consoleLogger)

  const editorWSS = new WebSocketServer({
    noServer: true,
    path: editorWSPath,
  })

  const videoWSS = new WebSocketServer({
    noServer: true,
    path: videoWSPath,
  })

  server.on("upgrade", (request, socket, head) => {
    if (request.url === editorWSPath) {
      logger.info(`connecting: ${editorWSPath}`)
      editorWSS.handleUpgrade(request, socket, head, (websocket) => {
        editorWSS.emit("connection", websocket, request)
      })
    }

    if (request.url === videoWSPath) {
      logger.info(`connecting: ${videoWSPath}`)

      videoWSS.handleUpgrade(request, socket, head, (websocket) => {
        videoWSS.emit("connection", websocket, request)
      })
    }
  })

  editorWSS.on('connection', (ws) => {
    let sessionId = null
    ws.on('message', async (message) => {
      const msgStr = message.toString()
      logger.info('received: %s', msgStr)

      if (msgStr === 'ping') {
        ws.send('pong')
        return
      }

      if (msgStr === 'start') {
        logger.info('starting session')
        const id = await sql<{id: number}[]>`insert into sessions (changes) values ('[]') returning id`
        sessionId = id[0].id
        logger.info('sending session', sessionId)
        ws.send(`start ${sessionId}`)
        return
      }

      if (msgStr.startsWith('change')) {
        invariant(sessionId !== null, 'cannot receive changes before session is started')

        const change = '[' + msgPayload('change')(msgStr) + ']'
        await sql<any>`update sessions set changes = changes || ${change}::jsonb where id = ${sessionId}`

        // send ack
        ws.send(`change`)
        return
      }
  
      logger.warn('unknown message', message)
    })

    ws.send('ready')
  })

  videoWSS.on('connection', (ws) => {
    const fileName = `${tmpDir}/video.webm`
    fs.mkdirSync(path.dirname(fileName), { recursive: true });
    try {
      fs.rmSync(fileName)
    } catch {}

    const fileStream = fs.createWriteStream(`${tmpDir}/video.webm`, { flags: 'a' });
    logger.info(`starting to write video stream to file: ${fileName}`)

    ws.on('message', (message) => {
      // Only raw blob data can be sent
      fileStream.write(Buffer.from(new Uint8Array(message as any)));
    })
  })
}
