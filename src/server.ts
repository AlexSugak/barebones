import express from 'express'
import bodyParser from 'body-parser'
import { init as authInit } from './auth/auth-server'
import { connect } from './db/connection'
import postgres from 'postgres'

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

export function init(
  app: express.Express = express(), 
  endpoints: EndpointInit[] = defaultEndpoints(),
  dependencies: Dependencies = buildDependencies()) {

  configure(app)

  app.get('/api', (req, res) => {
    res.json({msg: 'OK'})
  })

  endpoints.forEach(e => e(dependencies, app))

  app.use(function (err, req, res: express.Response<any, Record<string, any>>, next) {
    console.error('express error:', err.stack)
    res.status(500).send('Error processing request!')
    next(err)
  })
}
