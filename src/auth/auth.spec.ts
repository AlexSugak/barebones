import { Expect, test, spec } from '../spec'
import { request, withDatabase, withWebServer } from '../tests/server.spec'

export const specs = [
  spec(
    'login server', [
      test('server should render static login markup', async () => {
        await withDatabase(async sql =>
          await withWebServer(
            { sql },
            port => request({
              hostname: 'localhost',
              path: '/login',
              port,
              method: 'GET'
            }),
            resp => {
              Expect.contains('<title>Bare Bones App</title>', resp.data)
              Expect.contains('<form', resp.data)
            }
          ))
      })
    ]),
  spec(
    'login api',
    [
      test('returns OK on valid credentials', async () => {
        await withDatabase(async sql =>
          await withWebServer(
            { sql },
            port => request({
              hostname: 'localhost',
              path: '/api/login',
              port,
              method: 'POST',
              body: {
                user: 'admin',
                password: '123'
              }
            }),
            resp => Expect.equals({msg: 'logged in'}, JSON.parse(resp.data))
          ))
      }),
      test('returns 401 on invalid password', async () => {
        await withDatabase(async sql => 
          await withWebServer(
            { sql },
            port => request({
              hostname: 'localhost',
              path: '/api/login',
              port,
              method: 'POST',
              body: {
                user: 'admin',
                password: 'wrong password'
              }
            }),
            resp => Expect.equals(401, resp.status)
          ))
      }),
      test('returns 401 on non existing user name', async () => {
        await withDatabase(async sql => 
          await withWebServer(
            { sql },
            port => request({
              hostname: 'localhost',
              path: '/api/login',
              port,
              method: 'POST',
              body: {
                user: 'foo',
                password: '123'
              }
            }),
            resp => Expect.equals(401, resp.status)
          ))
      })
    ]
  ),
]
