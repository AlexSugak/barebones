import { React, ReactDOMServer } from '../react'
import { Subject } from '../rx'
import crypto from 'crypto'
import express from 'express'
import { Dependencies, EndpointInit, renderMarkup } from '../server'
import { LoginRequest, LoginResponse } from './auth-types'
import { matchLocationToPath } from '../router'
import { LoginView, AllActions, initialState } from './auth-view'

// TODO: set password for new users
// const salt = crypto.randomBytes(16).toString('hex')


/* 
TODO: auth flow:
- send auth token in login response
  - {token: <payload>.<signature>, expires_in: N}
    where payload: { userId, userRole, iat (Issued At Time), etc. }
    and signature is encrypted (sha512?) payload
  - read secret from env var on server
- on client, store token (cookie or local storage)
- on client, decode payload and store in state
  - https://stackoverflow.com/a/38552302
- on client, send token with every api request as 'Authorization: Bearer <token>'
- on server, verify token for protected routes (signature = crypto(payload, secret))
  if token is invalid:
  - if calling server rendering, redirect to /login 
  - if calling api, return 403
- on client, if got 403, redirect to /login and clear token
*/


function passwordHash(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}

interface DBUser {
  name: string,
  password: string
}

const serverRender = (app: express.Express) => {
  //TODO: use our router to match express requests
  app.get('*', (req, resp, next) => {
    const matched = matchLocationToPath(req.url)
    if (matched.path === '/login') {
      const actions = new Subject<AllActions>()
      const view = <LoginView state={initialState} actions={actions} />
      resp.send(
        renderMarkup(
          ReactDOMServer.renderToString(view), 
          { includeIsServerRendered: true }))
        
      return resp.status(200)
    }

    return next()
  })
}

export const init: EndpointInit = (dependencies: Dependencies, app: express.Express) => {
  const { sql } = dependencies

  serverRender(app)

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
      // TODO: generate token
      return res.json({msg: 'logged in'} as LoginResponse)
    }

    return res.status(401).json({msg: 'wrong user name or password'} as LoginResponse)
  })
}
