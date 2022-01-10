import crypto from 'crypto'
import express from 'express'
import { Dependencies, EndpointInit } from '../server'
import { LoginRequest, LoginResponse } from './auth-types'

// TODO: set password for new users
// const salt = crypto.randomBytes(16).toString('hex')

function passwordHash(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}

interface DBUser {
  name: string,
  password: string
}

export const init: EndpointInit = (dependencies: Dependencies, app: express.Express) => {
  const { sql } = dependencies
  app.post('/api/login', async (req, res) => {
    // TODO: try parse
    const request: LoginRequest = req.body

    const existingUsers = await sql<DBUser[]>`SELECT * FROM users WHERE name = ${request.user}`

    if (existingUsers.length === 0) {
      return res.status(401).json({msg: 'wrong user name or password'} as LoginResponse)
    }

    const existingUser = existingUsers[0]
    const [dbPasswordHash, salt] = existingUser.password.split('.')
    const reqPasswordHash = passwordHash(request.password, salt)

    if (reqPasswordHash === dbPasswordHash) {
      return res.json({msg: 'logged in'} as LoginResponse)
    }

    return res.status(401).json({msg: 'wrong user name or password'} as LoginResponse)
  })
}
