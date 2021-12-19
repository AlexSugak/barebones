import { Expect, test, spec } from '../spec'
import { request, withServer } from '../tests/server.spec'

export const specs = [
  spec(
    'login api',
    [
      test('returns OK on valid credentials', async () => {
        await withServer(
          port => request({
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
      test('returns 401 on invalid password', async () => {
        await withServer(
          port => request({
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
      }),
      test('returns 401 on non existing user name', async () => {
        await withServer(
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
        )
      })
    ]
  ),
]
