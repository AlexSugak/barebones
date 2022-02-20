import express from 'express'
import bodyParser from 'body-parser'
import postgres from 'postgres'
import { init as authInit } from './auth/auth-server'
import { connect } from './db/connection'

const distDir: string = process.env.DIST_DIR || './'

export function configure(app: express.Express = express()) {
  app.use(bodyParser.urlencoded({ extended: true }))  
  app.use(bodyParser.json())
}

export type EndpointInit = (dependencies: Dependencies, app: express.Express) => void

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
    authInit
  ]
} 

export function renderMarkup(
  body: string, 
  options: {
    includeIsServerRendered: boolean
  } = {includeIsServerRendered: false}): string {
  return `<!DOCTYPE html>
<html lang="en" class="text-gray-900 leading-tight">
    <head>
        <title>Bare Bones App</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="/tailwind.css" rel="stylesheet">
    </head>
    <body class="min-h-screen bg-gray-100">
        <div id="app">${body}</div>
        ${options.includeIsServerRendered ? `<script>window.isServerRendered = true</script>` : ``}
        <script type="importmap"> 
        {
          "imports": { 
          }
        }
        </script>
        <script type="module" src="/js/index.js"></script>
    </body>
</html>
  `
}

export function renderLoader(): string {
  return `Loading...`
}

export function init(
  app: express.Express = express(), 
  endpoints: EndpointInit[] = defaultEndpoints(),
  dependencies: Dependencies = buildDependencies()) {

  console.log('starting app server', { distDir })

  configure(app)

  app.get('/api', (_req, res) => {
    res.json({msg: 'welcome to bare bones API'})
  })

  endpoints.forEach(e => e(dependencies, app))

  app.use(express.static(distDir))

  // index.html
  app.get('*', function(_reg, res) {
    res.send(renderMarkup(renderLoader()))
    return res.status(200)
  })

  app.use(function (err, _req, res: express.Response<any, Record<string, any>>, next) {
    console.error('express error:', err.stack)
    res.status(500).send('Error processing request!')
    next(err)
  })
}
