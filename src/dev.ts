import { filter, map, Observable, Subject } from "./rx"

type FileUpdatedEvent = {
  fileName: string 
}

const devServerWs = 'ws://localhost:3000/ws'

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

export const getSourceFilesUpdates = (serverMessages: Observable<string>): Observable<FileUpdatedEvent> => {
  return serverMessages.pipe(
    filter(m => m.startsWith('updated')),
    map(m => ({fileName: m.replace('updated ', '')}))
  )
}
