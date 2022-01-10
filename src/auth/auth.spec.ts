import { Expect, test, spec } from '../spec'
import { request, withDatabase, withWebServer } from '../tests/server.spec'

export const specs = [
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
            resp => Expect.equals({msg: 'logged in'}, resp.data)
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
