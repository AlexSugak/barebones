import { getState as getClockState } from './clock.js'
import { Clock, Link, Router } from './components.js'
import { React } from './react.js'
import { BehaviorSubject } from './rx.js'
import { RouterState, matchLocationToView, LinkParams } from './router.js'

const clockState = getClockState()
const clockStateMemo = new BehaviorSubject<number>(0)
clockState.subscribe(clockStateMemo)

const routerState = new RouterState()

export const App = ({}) => {
  
  const navigate = (url: string) => routerState.navigate(url)
  
  const NLink = 
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
    <NLink 
      route={{path: '/posts/(?<id>.*)', params: { id: '1' }}} 
      label="Post 1" />
    <br/>
    <NLink 
      route={{path: '/posts/(?<id>.*)', params: { id: '2' }}} 
      label="Post 2" />
    <br/>
    <NLink 
      route={{
        path: '/calendar/(?<year>.*)/(?<month>.*)', 
        params: { year: '2021', month: '11' }}} 
      label="Today" />
    <br/>
    <Router location={routerState.location} match={matchLocationToView} />
  </>)
}
