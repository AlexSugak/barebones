import { dbSchema } from '../dist/js/db/schema.js'
import { connect } from '../dist/js/db/connection.js'

console.log('Running db schema script...')

const db = connect()
await db.unsafe(dbSchema)
await db.end()

console.log('done.')
