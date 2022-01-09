import postgres from 'postgres'

export function connect(dbName: string = 'postgres') {
  return postgres(`postgres://postgres:postgres@localhost:5438/${dbName}`)
}
