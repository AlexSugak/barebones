import express from 'express'
import http from 'http'
import { Expect, test, spec } from '../spec'
import { init } from '../server'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export interface Response {
  status: number, data: any
}

export function request(options: {
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


// TODO: withDatabase

let _port = 3001
export async function withServer(
    makeRequest: (port: number) => Promise<Response>,
    assert: (resp: Response) => void
  ) {
    _port = _port + 1
  const app = express()
  init(app)
  const server = app.listen(_port)

  let resp: Response
  try {
    resp = await makeRequest(_port)
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
        await withServer(
          port => request({
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
]
