import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser'
import { Expect, test, spec } from '../spec'
import { init } from '../server'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const port = '3001'

export const specs = [
  spec(
    'api server',
    [
      test('works', async () => {
        const app = express()
        app.use(bodyParser.urlencoded({ extended: true }))  
        app.use(bodyParser.json())
        init(app)
        const server = app.listen(port)

        let resp = {}
        try {
          resp = (await axios.get(`http://localhost:${port}/api`)).data
        } catch(e) {
          console.log('request error', e)
        }
        
        Expect.equals({msg: 'OK'}, resp)
        server.close()
      })
    ]
  ),
]
