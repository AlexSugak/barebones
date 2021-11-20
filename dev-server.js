import express from 'express'
import { WebSocketServer } from 'ws';
import fs from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url';

const app = express()
const port = 3000
const jsDir = './dist/js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = __dirname + '/dist';

const files = {}

app.use(express.static(distDir));
app.get('*', function(req, res) {
    res.sendFile(distDir + '/index.html');
});

function checkFiles() {
  fs.readdirSync(jsDir)
    .filter(fn => fn.endsWith('.js'))
    .map(file => {
      const path = `${jsDir}/${file}`
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

const wss = new WebSocketServer({
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
