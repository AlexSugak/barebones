import * as http from 'http'
import express from 'express'
import bodyParser from 'body-parser'
import postgres from 'postgres'
import { promises as fs } from 'fs'
import { join } from 'path'
import { init as authInit } from './auth/auth-server'
import { init as editorInit } from './editor/editor-server'
import { initWS as editorWS } from './editor/editor-server'
import { connect } from './db/connection'

const distDir: string = process.env.DIST_DIR || './'

const importMapPath = join(distDir, '/js', 'importMap.json')

export const loadImportMap = async () => {
  const importMapStr = (await fs.readFile(importMapPath)).toString()
  const importMap = JSON.parse(importMapStr)
  
  return { importMap, importMapStr }
}

let importMapStr: string | null = null
let importMap: { imports: { [key: string]: string }} | null = null

void (async () => {
  const im = await loadImportMap()
  importMapStr = im.importMapStr
  importMap = im.importMap
})()

void loadImportMap()

export function configure(app: express.Express = express()) {
  app.use(bodyParser.urlencoded({ extended: true }))  
  app.use(bodyParser.json())
}

export type EndpointInit = (dependencies: Dependencies, app: express.Express) => void

export type WSInit = (dependencies: Dependencies, server: http.Server) => void

export interface Dependencies {
  readonly sql: postgres.Sql<{}>
}

export function buildDependencies(): Dependencies {
  return {
    sql: connect()
  }
}

export function defaultEndpoints(): EndpointInit[] {
  return [
    authInit,
    editorInit
  ]
}

export function defaultWS(): WSInit[] {
  return [
    editorWS
  ]
}

export function renderMarkup(
  body: string, 
  options: {
    includeIsServerRendered: boolean
  } = {includeIsServerRendered: false}): string {
  if (!!!importMap) {
    console.error('import map is not initialized')
  }
  const index = importMap.imports['/js/index']
  if (!!!index) {
    console.error('could not find index.js file in import map')
  }
  return `<!DOCTYPE html>
<html lang="en" class="text-gray-900 leading-tight">
    <head>
        <title>Bare Bones App</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="/styles.css" rel="stylesheet">
    </head>
    <body>
        <div id="app">${body}</div>
        ${options.includeIsServerRendered ? `<script>window.isServerRendered = true</script>` : ``}
        <script type="importmap"> 
        ${importMapStr}
        </script>
        <script type="module" src="${index}"></script>
    </body>
</html>
  `
}

export function renderLoader(): string {
  return `Loading...`
}

export function initEndpoints(
  app: express.Express = express(), 
  endpoints: EndpointInit[] = defaultEndpoints(),
  dependencies: Dependencies = buildDependencies()) {

  configure(app)

  app.get('/api', (_req, res) => {
    res.json({msg: 'welcome to bare bones API'})
  })

  endpoints.forEach(e => e(dependencies, app))

  app.use(express.static(distDir))

  // index.html
  app.get('*', function(reg, res, next) {
    if (reg.url.startsWith('/api') || reg.url.endsWith('.js')) {
      return next()
    }

    console.log('index.html <- ', reg.url)
    res.send(renderMarkup(renderLoader()))
    return res.status(200)
  })

  app.use(function (err, _req, res: express.Response<any, Record<string, any>>, next) {
    console.error('express error:', err.stack)
    res.status(500).send('Error processing request!')
    next(err)
  })
}

export function initWS(
  server: http.Server, 
  wsis: WSInit[] = defaultWS(),
  dependencies: Dependencies = buildDependencies()) {

  wsis.forEach(e => e(dependencies, server))
}

// TODO: add main function to run app server on itself, not through dev-server.js
