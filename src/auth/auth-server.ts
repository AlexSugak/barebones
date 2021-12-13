import express from 'express'
import crypto from 'crypto'
import { LoginRequest, LoginResponse } from './auth-types'

// TODO: set password for new users
// const salt = crypto.randomBytes(16).toString('hex')

function passwordHash(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}

const existingUsers = [
  {
    name: 'alex',
    password: 'd5bd4af1085f4eedf7f28ff2f964c600a1aec625413b41d7728d5d374086eaf92337602e47aab1a8fba5d5827f3c388434d44423893e322675e44e6ea6848d78.c427baec0270f2d819b1c647d4bb8355'
  }
]

export function init(app: express.Express) {
  app.post('/api/login', (req, res) => {

    // TODO: try parse
    const request: LoginRequest = req.body

    // TODO: read from DB
    const existingUser = existingUsers.find(u => u.name === request.user)

    if (!existingUser) {
      res.status(401).json({msg: 'wrong user name or password'} as LoginResponse)
      return
    }

    const [dbPasswordHash, salt] = existingUser.password.split('.')
    const reqPasswordHash = passwordHash(request.password, salt)

    if (reqPasswordHash === dbPasswordHash) {
      res.json({msg: 'logged in'})
      return
    }

    res.status(401).json({msg: 'wrong user name or password'} as LoginResponse)
  })
}
