import { React } from '../react'
import { from, tap, EMPTY, withLatestFrom, BehaviorSubject, map, switchMap, Observable, Subject } from '../rx'
import { assertNever } from '../errors'
import { equals } from '../eq'
import { LoginRequest, LoginResponse } from './auth-types'
import { Layout } from '../layout'
import { Disposable, SubscriptionKeeper } from '../disposable'

export function loginRequest({ user, password }: LoginRequest): Observable<LoginResult> {
  return from(
    // TODO: catch request errors (e.g. no connection)
    fetch('/api/login', {
      method: 'POST',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user, password })
    })
      .then(response => response.json().then(body => {
        return { response, body: body as LoginResponse }
      }))
      .then<LoginResult>(({ response, body }) => {
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
      return loginRequest({ user, password }).pipe(
        tap(res => {
          if (res.kind === 'success') {
            this._state.next({ kind: 'registered', name: res.user })
          }
        })
      )
    }
  }
}

type ActionKind = 'updateLogin' | 'updatePassword' | 'clearErrors' | 'submit'

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

interface ClearErrors extends LoginFormAction {
  kind: 'clearErrors'
}

interface Submit extends LoginFormAction {
  kind: 'submit'
}

interface LoginFormState {
  login: string
  password: string
  errors: string[]
  isSubmitted: boolean,
  loggedInSuccessfully: boolean
}
export type AllActions = UpdateLogin | UpdatePassword | ClearErrors | Submit
export type Actions = Subject<AllActions>
export const initialState: LoginFormState = {
  login: '',
  password: '',
  errors: [],
  isSubmitted: false,
  loggedInSuccessfully: false
}

export class LoginFormStateManager implements Disposable {
  private _state: BehaviorSubject<LoginFormState> =
    new BehaviorSubject(initialState)
  private _subs = new SubscriptionKeeper()

  private _updateState(state: LoginFormState) {
    if (!equals(this._state.value, state)) {
      this._state.next(state)
    }
  }

  private _validate(state: LoginFormState): string[] {
    if (state.login === '') {
      return ['login required!']
    }

    if (state.password === '') {
      return ['password required!']
    }

    return []
  }

  constructor(actions: Actions, onLogin: OnLogin) {
    this._subs.push(
      actions.pipe(
        withLatestFrom(this._state),
        map(([a, s]) => {
          switch (a.kind) {
            case 'updateLogin':
              return { ...s, login: a.login }
            case 'updatePassword':
              return { ...s, password: a.password }
            case 'submit':
              const errors = this._validate(s)
              if (errors.length > 0) {
                return { ...s, errors }
              }

              return { ...s, isSubmitted: true, errors: [] }
            case 'clearErrors':
              return { ...s, errors: [] }
            default:
              assertNever(a)
          }
        }),
        tap(s => this._updateState(s)),
        switchMap(s => {
          if (!s.isSubmitted) {
            return EMPTY
          }

          return onLogin(s.login, s.password)
        }),
        tap(loginResult => {
          const currentState = this._state.value
          this._updateState({
            ...currentState,
            isSubmitted: false,
            loggedInSuccessfully: loginResult.kind === 'success',
            errors: loginResult.kind === 'failure' ? [loginResult.error] : []
          })
        })
      ).subscribe()
    )
  }

  dispose(): void {
    this._subs.dispose()
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

export type LoginResult = LoginSuccess | LoginFailure
export type OnLogin = (userName: string, password: string) => Observable<LoginResult>
export interface LoginProps {
  onLogin: OnLogin
}

export const LoginView = ({ state, actions }: { state: LoginFormState, actions: Actions }) => {
  if (state.loggedInSuccessfully) {
    return <Layout><div>Success!</div></Layout>
  }

  return (
    <Layout>
      <div>
        <form className="form" action="#" method="POST" onSubmit={e => {
          actions.next({ kind: 'submit' })
          e.preventDefault();
        }}>
          <label htmlFor="login" className="mt-1 lblPrimary">
            Login
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="login"
              id="login"
              autoComplete="username"
              value={state.login}
              onFocus={() => actions.next({ kind: 'clearErrors' })}
              onChange={e => {
                actions.next({ kind: 'updateLogin', login: e.target.value })
              }}
              className="inputPrimary"
            />
          </div>
          <label htmlFor="password" className="mt-1 lblPrimary">
            Password
          </label>
          <div className="mt-1">
            <input
              type="password"
              name="password"
              id="password"
              autoComplete="current-password"
              value={state.password}
              onFocus={() => actions.next({ kind: 'clearErrors' })}
              onChange={e => actions.next({ kind: 'updatePassword', password: e.target.value })}
              className="inputPrimary"
            />
          </div>

          <div>{state.errors.map(e => <div key={e} className="redError">{e}</div>)}</div>
          <div className="pt-1 text-left">
            <button type="submit" id="btnLogin" className="btnPrimary">
              Login
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
