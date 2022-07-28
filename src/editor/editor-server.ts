import * as http from 'http'
import fs from 'fs'
import path from 'path'
import { WebSocketServer } from 'ws';
import { Dependencies, EndpointInit, WSInit } from '../server'

const tmpDir: string = process.env.TMP_DIR || './tmp'

const editorWSPath = '/editor/ws'

const editorWSS = new WebSocketServer({
  noServer: true,
  path: editorWSPath,
})

const videoWSPath = '/editor/video/ws'

const videoWSS = new WebSocketServer({
  noServer: true,
  path: videoWSPath,
})

const log = (message: string, data?: any) => data ? console.log(`[editor] ${message}`, data) : console.log(`[editor] ${message}`)
const warn = (message: string, data?: any) => data ? console.warn(`[editor] ${message}`, data) : console.warn(`[editor] ${message}`)

export const initWS: WSInit = (dependencies: Dependencies, server: http.Server) => {
  server.on("upgrade", (request, socket, head) => {
    if (request.url === editorWSPath) {
      log(`connecting: ${editorWSPath}`)
      editorWSS.handleUpgrade(request, socket, head, (websocket) => {
        editorWSS.emit("connection", websocket, request)
      })
    }

    if (request.url === videoWSPath) {
      log(`connecting: ${videoWSPath}`)

      videoWSS.handleUpgrade(request, socket, head, (websocket) => {
        videoWSS.emit("connection", websocket, request)
      })
    }
  })

  editorWSS.on('connection', (ws) => {
    ws.on('message', (message) => {
      log('received: %s', message)
      // TODO: handle editor messages
  
      warn('unknown message', message)
    })
  
    ws.send('Hi from editor server')
  })

  videoWSS.on('connection', (ws) => {
    const fileName = `${tmpDir}/video.webm`
    fs.mkdirSync(path.dirname(fileName), { recursive: true });
    try {
      fs.rmSync(fileName)
    } catch {}

    const fileStream = fs.createWriteStream(`${tmpDir}/video.webm`, { flags: 'a' });
    log(`starting to write video stream to file: ${fileName}`)

    ws.on('message', (message) => {
      // Only raw blob data can be sent
      fileStream.write(Buffer.from(new Uint8Array(message)));
    })
  })
}
