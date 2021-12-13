import { React } from '../react'
import { View } from '../hoc'
import { Layout } from '../components'
import { from, tap, EMPTY, withLatestFrom, BehaviorSubject, map, switchMap, Observable, Subject } from '../rx'
import { assertNever } from '../errors'
import { LoginRequest, LoginResponse } from './auth-types'

export function loginRequest({user, password}: LoginRequest): Observable<LoginResult> {
  return from(
    // TODO: catch request errors (e.g. no connection)
    fetch('/api/login', {
      method: 'POST',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({user, password})
    })
    .then(response => response.json().then(body => {
      console.log('fetch response', {status: response.status, body})
      return {response, body: body as LoginResponse}
    }))
    .then<LoginResult>(({response, body}) => {
      if (response.ok) {
        return {
          kind: 'success',
          user
        }
      }

      return {
        kind: 'failure',
        error: body.msg
      }
    })
  )
}

export namespace User {
  export type UserKind = 'anonymous' | 'registered'

  interface BaseUser {
    kind: UserKind
  }
  
  interface AnonymousUser extends BaseUser {
    kind: 'anonymous',
  }
  
  interface RegisteredUser extends BaseUser {
    kind: 'registered',
    name: string
  }

  export type User = AnonymousUser | RegisteredUser


  const initialState: User = { kind: 'anonymous' }
  export class UserManager {
    private _state: BehaviorSubject<User> = 
      new BehaviorSubject(initialState)
    
    constructor() {
    }

    isLoggedIn(): boolean {
      return this._state.getValue().kind === 'registered'
    }

    get userName(): string {
      const state = this._state.getValue()
      return state.kind === 'registered' ? state.name : ''
    }

    login(user: string, password: string): Observable<LoginResult> {
      return loginRequest({user, password}).pipe(
        tap(res => {
          if (res.kind === 'success') {
            this._state.next({kind: 'registered', name: res.user})
          }
        })
      )
    }
  }
} 

type ActionKind = 'updateLogin' | 'updatePassword' | 'submit'

interface LoginFormAction {
  kind: ActionKind
}

interface UpdateLogin extends LoginFormAction {
  kind: 'updateLogin',
  login: string
}

interface UpdatePassword extends LoginFormAction {
  kind: 'updatePassword',
  password: string
}

interface Submit extends LoginFormAction {
  kind: 'submit'
}

interface LoginFormState {
  login: string
  password: string
  errors: string[]
  isSubmitted: boolean
}
type AllActions = UpdateLogin | UpdatePassword | Submit
export type Actions = Subject<AllActions>
export const initialState: LoginFormState = { login: '', password: '', errors: [], isSubmitted: false }

export class LoginFormStateManager {
  private _state: BehaviorSubject<LoginFormState> = 
    new BehaviorSubject(initialState)

  constructor(actions: Actions, onLogin: OnLogin){
    actions.pipe(
      withLatestFrom(this._state),
      map(([a, s]) => {
        switch(a.kind) {
          case 'updateLogin':
            return {...s, login: a.login}
          case 'updatePassword':
            return {...s, password: a.password}
          case 'submit':
            if (s.login === '') {
              return {...s, errors: ['login required!']}
            }

            if (s.password === '') {
              return {...s, errors: ['password required!']}
            }
            return {...s, isSubmitted: true, errors: []}
          default:
            assertNever(a)
        }
      }),
      tap(s => this._state.next(s)),
      switchMap(s => {
        if (!s.isSubmitted) {
          return EMPTY
        }

        return onLogin(s.login, s.password)
      }),
      tap(loginResult => {
        console.log('login result', loginResult)
        const currentState = this._state.value
        this._state.next({
          ...currentState, 
          isSubmitted: false, 
          errors: loginResult.kind === 'failure' ? [loginResult.error] : []
        })
      }),
      // TODO: make this disposable !!!!
    ).subscribe()
  }

  get state(): Observable<LoginFormState> {
    return this._state
  }
}

interface LoginSuccess {
  kind: 'success',
  user: string
}

interface LoginFailure {
  kind: 'failure',
  error: string
}

type LoginResult = LoginSuccess | LoginFailure 
type OnLogin = (userName: string, password: string) => Observable<LoginResult>
export interface LoginProps {
  onLogin: OnLogin
}

export const Login = ({onLogin}: LoginProps) => {
  const actions: Actions = new Subject()
  const sm = new LoginFormStateManager(actions, onLogin)

  return (
    <Layout>
      <div> 
        <View stream={sm.state}>
          { s => 
            <form action="#" method="POST" onSubmit={e => {
                actions.next({kind: 'submit'})
                e.preventDefault();
              }}>
              <label htmlFor="login" className="mt-1 block text-xs font-medium text-gray-700">
                Login
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="login" 
                  id="login"
                  autoComplete="username"
                  value={s.login} 
                  onChange={e => {
                    console.log('login change!', e.target.value)
                    actions.next({kind: 'updateLogin', login: e.target.value})
                  }}
                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-md sm:text-sm border-gray-300" 
                  />
              </div>
              <label htmlFor="password" className="mt-1 block text-xs font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="password"
                  name="password" 
                  id="password"
                  autoComplete="current-password"
                  value={s.password} 
                  onChange={e => actions.next({kind: 'updatePassword', password: e.target.value})}
                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-md sm:text-sm border-gray-300" 
                  />
              </div>
              <div>{s.errors.map(e => <div className="text-red-600">{e}</div>)}</div>
              <div className="pt-2 text-left">
                <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Login
                </button>
              </div>
            </form>
          }
        </View>
      </div>
    </Layout>
  )
}

export type LoginType = typeof Login 
