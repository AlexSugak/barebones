import { Router } from './components'
import { React } from './react'
import { RouterState, matchLocationToView, restrictAnonymous, Views } from './router'
import { User } from './auth/auth-view'
import { Login } from './auth/auth-page'
import { tap } from './rx'
import { Stories } from './stories'
import { CssReloader, getDevServerMessages, getSourceFilesUpdates, isDevEnv } from './dev'
import { useDisposable } from './hooks'
import { Disposable } from './disposable'
import { Editor } from './editor/editor-page'

const router = new RouterState()
const user = new User.UserManager()

const login = (userName: string, password: string) => {
  return user.login(userName, password).pipe(
    tap(r => {
      if (r.kind === 'success') {
        router.navigateTo('/', {})
      }
    })
  )
}

const views: Views = {
  login: () => <Login onLogin={login} />,
  stories: () => <Stories />,
  editor: () => <Editor />,
}

export const App = ({ }) => {
  // watch for css changes and reload it if in dev mode
  useDisposable(
    isDevEnv() 
    ? new CssReloader(getSourceFilesUpdates(getDevServerMessages())) 
    : Disposable.EMPTY)

  const matchLocation = restrictAnonymous(matchLocationToView(views), () => user.isLoggedIn())

  return (<>
    <Router location={router.location} match={matchLocation} />
  </>)
}
