import express from 'express'
import bodyParser from 'body-parser'
import { init as authInit } from './auth/auth-server'

export function configure(app: express.Express = express()) {
  app.use(bodyParser.urlencoded({ extended: true }))  
  app.use(bodyParser.json())
}

export type EndpointInit = (app: express.Express) => void

export function init(app: express.Express = express(), endpoints: EndpointInit[] = [authInit]) {
  configure(app)

  app.get('/api', (req, res) => {
    res.json({msg: 'OK'})
  })

  endpoints.forEach(e => e(app))

  app.use(function (err, req, res: express.Response<any, Record<string, any>>, next) {
    console.error('express error:', err.stack)
    res.status(500).send('Error processing request!')
    next(err)
  })
}
