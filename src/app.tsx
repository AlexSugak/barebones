import { getState as getClockState } from './clock.js'
import { Clock } from './components.js'
import { React } from './react.js'
import { BehaviorSubject } from './rx.js'

const clockState = getClockState()
const clockStateMemo = new BehaviorSubject<number>(0)
clockState.subscribe(clockStateMemo)

export const App = ({}) => {
  
  return (<>
    <div>Bare Bones react+ts app</div>
    <Clock state={clockStateMemo} />
  </>)
}
