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

// we cannot load api config immediately here
// as the initial app compilation may still be in progress
// e.g. when starting the dev server for the first time
function reloadAPIServer() {
  const seed = (new Date()).getMilliseconds().toString()
  import(`./dist/js/server.js?seed=${seed}`).catch(e => {
    console.log('failed to load dist/js/server.js module')
    return { init: () => {} }
  }).then(m => m.init).then(
    initAPI => {
      console.log('reloading api server')
      
      const doNotDelete = [
        'expressInit'
      ]

      app._router.stack = app._router.stack.filter(l => doNotDelete.includes(l.name))
      // api endpoints must go first
      // before the "serve static" wildcard endpoint added in reloadDevApi  
      initAPI(app)
      reloadDevApi()
      // console.log(app._router)
    }
  )
}

function reloadDevApi() {
  app.use(express.static(distDir));
  app.get('*', function(req, res) {
      res.sendFile(distDir + '/index.html');
  });
  app.post('/compileSuccess', (req, res) => {
    console.log('/compileSuccess')
    checkFiles()
    res.send('OK')
  })
}

reloadDevApi()

function checkFiles() {

  // TODO: getFilesRecursive
  const updatedFiles = fs.readdirSync(jsDir)
    .filter(fn => fn.endsWith('.js'))
    .filter(file => {
      const path = `${jsDir}/${file}`
      const stat = fs.statSync(path)
      const lastModified = files[file] || 0
      const time = stat.mtime.getTime()
      // side effect ????
      files[file] = time
      return time > lastModified
    })

  updatedFiles
    .forEach(file => {
      console.log('file updated', file)
      wss.clients.forEach(c => {
        c.send('updated ' + file)
      })
    })

  if (updatedFiles.filter(f => f.includes('server.js'))) {
    reloadAPIServer()
  }
}

const server = app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
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
