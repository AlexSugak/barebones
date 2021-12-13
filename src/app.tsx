import { Login, Router } from './components'
import { React } from './react'
import { RouterState, matchLocationToView, restrictAnonymous, Views } from './router'
import { User } from './auth/auth-view'
import { tap } from './rx'

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
  login: () => <Login onLogin={login} />
}

export const App = ({}) => {
  
  const navigate = (url: string) => router.navigate(url)
  
  // const NavLink = 
  //   (params: Omit<LinkParams, 'navigate'>) => 
  //     <Link {...{...params, navigate}} />

  const matchLocation = restrictAnonymous(matchLocationToView(views), () => user.isLoggedIn())

  return (<>
    <Router location={router.location} match={matchLocation} />
  </>)
}
