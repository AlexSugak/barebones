import crypto from 'crypto'
import express from 'express'
import postgres from 'postgres'
import { Dependencies, EndpointInit } from '../server'
import { LoginRequest, LoginResponse } from './auth-types'

type HashAlgorithm = (password: string, salt: string) => string 

function passwordHash(password: string, salt: string): string {
  // TODO: set password for new users
  // const salt = crypto.randomBytes(16).toString('hex')

  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}

interface DBUser {
  name: string,
  password: string
}

interface SystemUser {
  name: string,
  password: string
  salt: string
}

/** TODO: 
 * S - single reason to change
 * O - code is immutable
 * L - clear semantics
 * I - single method interfaces (function types) 
 * D - depend on abstract interfaces, not on concrete implementation
 */


interface Failure<T> {
  kind: 'failure',
  error: T
}

type ErrorMessageFailure = Failure<string>

interface Success<T> {
  kind: 'success',
  value: T
}

function failure(error: string): ErrorMessageFailure {
  return { kind: 'failure', error }
}

function success<T>(value: T): Success<T> {
  return { kind: 'success', value }
}

type Result<F, T> = Failure<F> | Success<T>

interface UsersStorage {
  findUser(userName: string): Promise<Result<string, SystemUser>>
}

class SqlUsersStorage implements UsersStorage { 
  constructor( private _sql: postgres.Sql<{}> ){
  }
  async findUser(userName: string): Promise<Result<string, SystemUser>> {
    const existingUsers = await this._sql<DBUser[]>`SELECT * FROM users WHERE name = ${userName}`

    if (existingUsers.length === 1) {
      const dbUser = existingUsers[0]
      const [ password, salt ] = dbUser.password.split('.')
      return success({
        name: dbUser.name,
        password,
        salt
      })
    }

    return failure(`user ${userName} not found in DB`)
  }
}

type RequestValidator = (request: any) => Result<string, LoginRequest>

const getRequestParsingValidator = (): RequestValidator => {
  return (request) => {
    if ('user' in request && 'password' in request) {
      return success(request as LoginRequest)
    }

    return failure(`not valid request: ${request}`)
  }
}

type UserValidator = (user: SystemUser) => Result<string, SystemUser>

const getComposedUserValidator = (validators: UserValidator[]): UserValidator => {
  return (user) => {
    // TODO: compose all validators together
    return success(user)
  }
}

const getBanListUserValidator = (banList: string[]): UserValidator => {
  return user => {
    if (banList.includes(user.name)) {
      return failure('user is banned!')
    }

    return success(user)
  }
}

const getUserPasswordValidator = (algo: HashAlgorithm, requestPassword: string): UserValidator => {
  return user => {
    const storedPasswordHash = user.password
    const salt = user.salt
    const reqPasswordHash = algo(requestPassword, salt)

    if (reqPasswordHash === storedPasswordHash) {
      return success(user)
    }

    return failure('invalid user password')
  }
}

type LoginDependencies = {
  usersStorage: UsersStorage
  requestValidator: RequestValidator
  userValidator: (request: LoginRequest) => UserValidator
} 

type LoginAPIError = 'invalidRequest' | 'userNotFound' | 'invalidUser' 
type LoginAPI = (body: any) => Promise<Result<LoginAPIError, undefined>>

const getLoginAPI = (deps: LoginDependencies): LoginAPI => {
  return async body => {
    const requestResult = deps.requestValidator(body)
    let request: LoginRequest

    if (requestResult.kind === 'success') {
      request = requestResult.value
    } else {
      return { kind: 'failure', error: 'invalidRequest' }
    }
    
    const existingUser = await deps.usersStorage.findUser(request.user)
    
    if (existingUser.kind === 'failure') {
      return { kind: 'failure', error: 'userNotFound' }
    }
    
    const userValidator: UserValidator = deps.userValidator(request)

    if (userValidator(existingUser.value).kind === 'success') {
      return success(undefined)
    }

    return { kind: 'failure', error: 'invalidUser' }
  }
}

function initLogin(api: LoginAPI, app: express.Express) {
  app.post('/api/login', async (req, res) => {
    const result = await api(req.body)

    if (result.kind === 'success') {
      return res.json({msg: 'logged in'} as LoginResponse)
    }

    if(result.error === 'invalidRequest') {
      return res.status(400).json({msg: 'request error'})
    }

    if (result.error === 'userNotFound' || result.error === 'invalidUser') {
      return res.status(401).json({msg: 'wrong user name or password'} as LoginResponse)
    }

    return res.status(400).json({msg: 'request error'})
  })
}

export const init: EndpointInit = (dependencies: Dependencies, app: express.Express) => {
  const { sql } = dependencies

  function compositionRoot(sql: postgres.Sql<{}>): LoginDependencies {
    return {
      usersStorage: new SqlUsersStorage(sql),
      requestValidator: getRequestParsingValidator(),
      // TODO: extract to validator factory
      userValidator: (request) => getComposedUserValidator([
        getUserPasswordValidator(passwordHash, request.password), 
        getBanListUserValidator(['Bob'])])
    }
  }

  const deps: LoginDependencies = compositionRoot(sql) 
  const api = getLoginAPI(deps)

  initLogin(api, app)
}
