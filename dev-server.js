const express = require('express')
const ws = require('ws')
const fs = require('fs')

const app = express()
const port = 3000
const distDir = './dist/js'

const files = {}

app.get('/', (req, res) => {
  res.send('Bare Bones dev server')
})

function checkFiles() {
  fs.readdirSync(distDir)
    .filter(fn => fn.endsWith('.js'))
    .map(file => {
      const path = `${distDir}/${file}`
      const stat = fs.statSync(path)
      return [file, stat.mtime.getTime()]
    })
    .forEach(([file, time]) => {
      const lastModified = files[file] || 0

      if (time > lastModified) {
        console.log('file updated', file)
        wss.clients.forEach(c => {
          c.send('updated ' + file)
        })
      }

      files[file] = time
    })
}

app.post('/compileSuccess', (req, res) => {
  console.log('/compileSuccess')
  checkFiles()
  res.send('OK')
})

const server = app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

const wss = new ws.Server({
  noServer: true,
  path: "/ws",
})

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (websocket) => {
    wss.emit("connection", websocket, request)
  })
})

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log('received: %s', message)

    if(message.toString() === 'stats') {
      console.info('from client:', message)
      checkFiles()
    } else {
      console.warn('unknown message', message)
    }
  })

  ws.send('Hi from dev server')
})
