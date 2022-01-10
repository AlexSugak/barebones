import postgres from 'postgres'

const DB_USER = process.env.POSTGRES_USER || 'postgres'
const DB_PASS = process.env.POSTGRES_PASSWORD || 'postgres'
const DB_HOST = process.env.POSTGRES_HOST || 'localhost'
const DB_PORT = process.env.POSTGRES_PORT || 5438

export function connect(dbName: string = 'postgres') {
  return postgres(`postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${dbName}`)
}
