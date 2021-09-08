import { Clock, getState as getClockState } from './clock.js'
import { React } from './react.js'

export const App = ({}) => {
  const clockState = getClockState()
  return (<>
    <div>Bare Bones react+ts app</div>
    <Clock state={clockState} />
  </>)
}
