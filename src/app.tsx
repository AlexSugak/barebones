import { getState as getClockState } from './clock.js'
import { Clock, Router } from './components.js'
import { React } from './react.js'
import { BehaviorSubject } from './rx.js'
import { RouterState, matchLocationToView } from './router.js'

const clockState = getClockState()
const clockStateMemo = new BehaviorSubject<number>(0)
clockState.subscribe(clockStateMemo)

const routerState = new RouterState()

export const App = ({}) => {
  
  return (<>
    <div>Bare Bones react+ts app</div>
    <Clock state={clockStateMemo} />
    {/* TODO: strongly typed Links */}
    <a href="#" onClick={e => {
      e.preventDefault()
      routerState.navigate('/')
    }}>Home</a>
    <br/>
    <a href="#" onClick={e => {
      e.preventDefault()
      routerState.navigate('/about')
    }}>About</a>
    <br/>
    <a href="#" onClick={e => {
      e.preventDefault()
      routerState.navigate('/posts/1')
    }}>Post 1</a>
    <br/>
    <a href="#" onClick={e => {
      e.preventDefault()
      routerState.navigate('/posts/2')
    }}>Post 2</a>
    <br/>
    <a href="#" onClick={e => {
      e.preventDefault()
      routerState.navigate('/calendar/2021/11')
    }}>Today</a>
    <br/>
    <Router location={routerState.location} match={matchLocationToView} />
  </>)
}
