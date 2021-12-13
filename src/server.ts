import express from 'express'
import bodyParser from 'body-parser'
import { init as authInit } from './auth/auth-server'

export function configure(app: express.Express = express()) {
  app.use(bodyParser.urlencoded({ extended: true }))  
  app.use(bodyParser.json())
}

export function init(app: express.Express = express()) {
  configure(app)

  app.get('/api', (req, res) => {
    res.json({msg: 'OK'})
  })

  authInit(app)

  app.use(function (err, req, res, next) {
    console.error('express error:', err.stack)
    next(err)
  })
}
