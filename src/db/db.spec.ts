import { withDatabase } from '../tests/server.spec'
import { Expect, test, spec } from '../spec'
import { connect } from './connection'

export const specs = [
  spec(
    'db specs',
    [
      test('connection works', async () => {
        const sql = connect()

        try {
          const res = await sql`select * from test`
          return true
        } catch (error) {
          console.error('error connecting to db', error)
          return false
        }
      }),
      test('test isolation works', async () => {
        await withDatabase(async sql => {
          const dbName = await sql<{search_path: string}[]>`SHOW search_path`
          if(dbName.length === 0) {
            throw new Error('failed to read current db name')
          }

          Expect.startsWith('test_schema', dbName[0].search_path)
        })}
      ),
      test('admin user is created', async () => {
        await withDatabase(async sql => {
          const users = await sql<{name: string}[]>`SELECT * FROM users;`
          if(users.length === 0) {
            throw new Error('expected at least one user but read 0')
          }

          Expect.equals('admin', users[0].name)
        })}
      )
    ]
  )
]
