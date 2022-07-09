import express from 'express'
import { WebSocketServer } from 'ws';
import fs from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url';
import { getFilesRecursive } from './scripts/common.js'

const app = express()
const port = 3000

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = __dirname + '/dist';
const jsDir = distDir + '/js'
process.env.DIST_DIR = distDir

const doNothing = () => {}
const importNoCache = (module) => {
  const seed = (new Date()).getMilliseconds().toString()
  return import(`${module}?seed=${seed}`)
}

// we cannot load api config immediately here
// as the initial app compilation may still be in progress
// e.g. when starting the dev server for the first time
async function reloadAPIServer() {
  const jsFiles = await getFilesRecursive(jsDir, {ignore: ['lib']})
  // XXX: convention: all server files should end with '-server.js'
  // e.g.:
  // auth-server.js
  // auth-server.a3e41f5b608ff89d47801ac4db1fec3eb8949663.js
  const serverFiles = jsFiles.filter(fn => fn.match(/.*-server.(?!spec)(?:[a-z0-9]*.)?js$/))
  // TODO: how to hot-reload modules required for server rendering?
  // console.log('server files', serverFiles)

  // the /server.js is the main server entry file
  const serverMainFile = jsFiles.filter(fn => fn.match(/.*\/server.(?!spec)(?:[a-z0-9]*.)?js$/))

  Promise.all(
    // reloading only /server.js will not work
    // as it will not update the modules referenced in it
    // so we need to reload all the /server.js dependencies here manually
    serverFiles
      .map(f => {
        const modulePath = `./dist${f.replace(distDir, '')}`
        return importNoCache(modulePath)
                .then(m => {
                  // console.log('reloaded', modulePath)
                  return m
                })
                .catch(e => console.error('failed to load module: ' + modulePath, e))
      })
  )
  .then(ms => {
    return ms.map(m => m.init || doNothing)
  })
  .then(inits => importNoCache(serverMainFile).then(m => [m.init, inits]))
  .catch(e => console.error('failed to load server.js module', e))
  .then(
    ([initAPI, endpointInits]) => {
      console.log('reloading api server')
      
      const doNotDelete = [
        'expressInit'
      ]

      if(app._router) {
        app._router.stack = app._router.stack.filter(l => doNotDelete.includes(l.name))
      }

      initAPI(app, [...endpointInits, initDevApi])
    }
  )
  .catch(e => console.error('error reloading api server', e))
}

function initDevApi(_dependencies, app) {
  console.log('configuring dev endpoints')
  app.post('/compileSuccess', (req, res) => {
    console.log('/compileSuccess')
    checkFiles()
    res.send('OK')
  })

  const storiesFile = __dirname + '/stories.json'
  app.get('/devApi/stories', (_req, res) => {
    res.contentType('application/json')
    res.sendFile(storiesFile);
  })

  app.post('/devApi/stories', (req, res) => {
    console.log('POST /devApi/stories', req.body)
    const story = req.body
    const stories = JSON.parse(fs.readFileSync(storiesFile))

    const newStories = [
      ...stories.filter(s => s.name !== story.name),
      story
    ]

    fs.writeFileSync(storiesFile, JSON.stringify(newStories, null, 2))
    res.status(201)
    res.send()
  })
}

reloadAPIServer()

const files = {}
async function checkFiles() {
  const appFiles = await getFilesRecursive(distDir, {ignore: ['lib']})

  const updatedFiles = appFiles
    .filter(file => {
      const stat = fs.statSync(file)
      const lastModified = files[file] || 0
      const time = stat.mtime.getTime()
      // side effect ????
      files[file] = time
      return time > lastModified
    })

  updatedFiles
    .forEach(file => {
      const fileName = file.replace(distDir, '')
      console.log('file updated', fileName)

      wss.clients.forEach(c => {
        c.send('updated ' + fileName)
      })
    })

  const jsFiles = updatedFiles.filter(fn => fn.endsWith('.js'))
  if(jsFiles.length > 0) {
    await reloadAPIServer()
  }
}

const server = app.listen(port, () => {
  console.log(`Dev server listening at http://localhost:${port}`)
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
