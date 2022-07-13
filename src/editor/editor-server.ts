import * as http from 'http'
import { WebSocketServer } from 'ws';
import { Dependencies, EndpointInit, WSInit } from '../server'
import { Subject } from '../rx'

const wsPath = '/editor/ws'

const wss = new WebSocketServer({
  noServer: true,
  path: wsPath,
})

const log = (message: string, data?: any) => console.log(`[editor] ${message}`, data)
const warn = (message: string, data?: any) => console.warn(`[editor] ${message}`, data)

export const initWS: WSInit = (dependencies: Dependencies, server: http.Server) => {
  server.on("upgrade", (request, socket, head) => {
    if (request.url === wsPath) {
      log(`connecting: ${wsPath}`)
      wss.handleUpgrade(request, socket, head, (websocket) => {
        wss.emit("connection", websocket, request)
      })
    }
  })

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      log('received: %s', message)
      // TODO: handle editor messages
  
      warn('unknown message', message)
    })
  
    ws.send('Hi from editor server')
  })
}
