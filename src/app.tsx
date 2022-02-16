import { Router } from './components'
import { React } from './react'
import { RouterState, matchLocationToView, restrictAnonymous, Views } from './router'
import { User } from './auth/auth-view'
import { Login } from './auth/auth-page'
import { tap } from './rx'
import { Stories } from './stories'

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
  stories: () => <Stories />
}

export const App = ({}) => {
  const matchLocation = restrictAnonymous(matchLocationToView(views), () => user.isLoggedIn())
  
  return (<>
    <Router location={router.location} match={matchLocation} />
  </>)
}
