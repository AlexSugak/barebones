import express from 'express'
import bodyParser from 'body-parser'

export function configure(app: express.Express = express()) {
  app.use(bodyParser.urlencoded({ extended: true }))  
  app.use(bodyParser.json())
}

export function init(app: express.Express = express()) {
  configure(app)

  app.get('/api', (req, res) => {
    // console.log('server: /api')
    res.json({msg: 'OK'})
  })

  app.post('/api/login', (req, res) => {
    // console.log('server: /api/login', req.body)

    if (req.body.user === 'alex' && req.body.password === '123') {
      res.json({msg: 'logged in'})
    } else {
      res.status(401).json({msg: 'failed to login: wrong user or password'})
    }
  })

  app.use(function (err, req, res, next) {
    console.error('express error:', err.stack)
    next(err)
  })
}
