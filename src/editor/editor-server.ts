import * as http from 'http'
import fs from 'fs'
import path from 'path'
import { WebSocketServer } from 'ws'
import { Dependencies, EndpointInit, WSInit } from '../server'
import { consoleLogger, logPrefix } from '../logger'

const tmpDir: string = process.env.TMP_DIR || './tmp'

export const editorWSPath = '/editor/ws'
export const videoWSPath = '/editor/video/ws'

export const initWS: WSInit = (dependencies: Dependencies, server: http.Server) => {
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
    ws.on('message', (message) => {
      logger.info('received: %s', message)

      if (message.toString() === 'ping') {
        ws.send('pong')
        return
      }
  
      logger.warn('unknown message', message)
    })
  
    ws.send('start')
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
