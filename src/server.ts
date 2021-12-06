import express from 'express'

export function init(app: express.Express = express()) {
  app.get('/api', (req, res) => {
    res.json({msg: 'OK'})
  })
}
