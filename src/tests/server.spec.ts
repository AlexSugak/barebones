import express from 'express'
import http from 'http'
import { WebSocket } from 'ws'
import { Expect, test, spec } from '../spec'
import { buildDependencies, defaultEndpoints, defaultWS, Dependencies, initEndpoints, initWS, WSInit } from '../server'
import postgres from 'postgres'
import { connect } from '../db/connection'
import { dbSchema } from '../db/schema'

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
            data
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

let _schemaIndex = 1
export async function withDatabase(
  test: (sql: postgres.Sql<{}>) => Promise<void>
) {
  // every test gets its own schema
  const schemaName = `test_schema_${_schemaIndex}`
  _schemaIndex = _schemaIndex + 1

  // create it from scratch
  const db = connect()
  // prevent 'cascading delete' notice in output 
  const dropCmd = `SET client_min_messages TO WARNING; DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`
  await db.unsafe(dropCmd)
  await db.unsafe(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)

  // run the test
  // TODO: is using transactions for isolation a good idea here?
  // maybe we should just prepend "set search_path" to each query automatically
  await db.begin(async sql => {
    await sql.unsafe(`SET search_path TO ${schemaName}`)
    await sql.unsafe(dbSchema)
    await test(sql)
  })
  
  await db.end()
}

let _port = 3001
export async function withWebServer(
    dependencies: Dependencies,
    makeRequest: (port: number) => Promise<Response>,
    assert: (resp: Response) => void
  ) {

  _port = _port + 1
  const app = express()
  initEndpoints(app, defaultEndpoints(), dependencies)
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

export async function withWSServer(
    dependencies: Dependencies,
    assert: (port: number) => Promise<void>,
    wsis: WSInit[] = defaultWS(),
  ) {

  _port = _port + 1
  const app = express()
  const server = app.listen(_port)
  initWS(server, wsis, dependencies)

  await assert(_port)
  server.close()
}

export const specs = [
  spec(
    'api server',
    [
      test('works', async () => {
        await withWebServer(
          buildDependencies(),
          port => request({
            hostname: 'localhost',
            path: '/api',
            port,
            method: 'GET',
          }),
          resp => Expect.equals({msg: 'welcome to bare bones API'}, JSON.parse(resp.data))
        )
      })
    ]
  ),
]
