import express from 'express'
import http from 'http'
import { Expect, test, spec } from '../spec'
import { init } from '../server'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

interface Response {
  status: number, data: any
}

function request(options: {
  hostname: string,
  port: number,
  path: string,
  method: 'GET' | 'POST',
  body?: any
}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const body = options.body ? JSON.stringify(options.body) : ''
    const req = http.request({
      hostname: options.hostname,
      port: options.port,
      path: options.path,
      method: options.method,
      headers: options.method === 'POST' ? {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      } : {},
      timeout: 2000,
    }, res => {
      if (res.statusCode >= 200 && res.statusCode <= 300) {
        res.on('data', data => {
          const response = {
            status: res.statusCode,
            data: JSON.parse(data)
          }
          // console.log('received response', response)
          resolve(response)
        })
      } else {
        // console.log('not OK response', res.statusCode)
        resolve({status: res.statusCode, data: ''})
      }
    })

    req.on('error', error => {
      console.log('request error', error)
      reject(error)
    })

    if (options.method === 'POST') {
      // console.log('writing', body)
      req.write(body)
    }

    req.end()
  })
}

async function withServer(port: number, 
    makeRequest: () => Promise<Response>,
    assert: (resp: Response) => void
  ) {
  const app = express()
  init(app)
  const server = app.listen(port)

  let resp: Response
  try {
    resp = await makeRequest()
  } catch(e) {
    console.log('request error', e)
  }
  
  server.close()
  assert(resp)
}

export const specs = [
  spec(
    'api server',
    [
      test('works', async () => {
        const port = 3001
        await withServer(
          port, 
          () => request({
            hostname: 'localhost',
            path: '/api',
            port,
            method: 'GET',
          }),
          resp => Expect.equals({msg: 'OK'}, resp.data)
        )
      })
    ]
  ),
  spec(
    'login api',
    [
      test('returns OK on valid credentials', async () => {
        const port = 3002
        await withServer(
          port, 
          () => request({
            hostname: 'localhost',
            path: '/api/login',
            port,
            method: 'POST',
            body: {
              user: 'alex',
              password: '123'
            }
          }),
          resp => Expect.equals({msg: 'logged in'}, resp.data)
        )
      }),
      test('returns 401 on invalid credentials', async () => {
        const port = 3003
        await withServer(
          port, 
          () => request({
            hostname: 'localhost',
            path: '/api/login',
            port,
            method: 'POST',
            body: {
              user: 'alex',
              password: 'wrong password'
            }
          }),
          resp => Expect.equals(401, resp.status)
        )
      })
    ]
  ),
]
