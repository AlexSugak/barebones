import { getState as getClockState } from './clock'
import { Clock, Link, Router } from './components'
import { React } from './react'
import { BehaviorSubject } from './rx'
import { RouterState, matchLocationToView, LinkParams } from './router'

const clockState = getClockState()
const clockStateMemo = new BehaviorSubject<number>(0)
clockState.subscribe(clockStateMemo)

const routerState = new RouterState()

export const App = ({}) => {
  
  const navigate = (url: string) => routerState.navigate(url)
  
  const NavLink = 
    (params: Omit<LinkParams, 'navigate'>) => 
      <Link {...{...params, navigate}} />

  return (<>
    <div>Bare Bones react+ts app</div>
    <Clock state={clockStateMemo} />
    <Link 
      route={{path: '/', params: {}}} 
      label="Home"
      navigate={navigate} />
    <br/> 
    <NavLink 
      route={{path: '/posts/(?<id>.*)', params: { id: '1' }}} 
      label="Post 1" />
    <br/>
    <NavLink 
      route={{path: '/posts/(?<id>.*)', params: { id: '2' }}} 
      label="Post 2" />
    <br/>
    <NavLink 
      route={{
        path: '/calendar/(?<year>.*)/(?<month>.*)', 
        params: { year: '2021', month: '11' }}} 
      label="Today" />
    <br/>
    <Router location={routerState.location} match={matchLocationToView} />
  </>)
}
