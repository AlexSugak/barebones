import { View } from './hoc'
import { React } from './react'
import { interval, map, Observable, startWith } from './rx'

export type State = Observable<number>

export const getState = (): State => {
  return interval(1000).pipe(
    map(n => n + 1),
    startWith(0)
  )
}

export const Clock = ({state}: { readonly state: State}) => {
  const v = ''
  console.log('rendering clock v' + v)
  return (
  <div>
    Ticks {v}:
    <View stream={state}>
      { n => <span>{n}</span> }
    </View>
  </div>
)}

export type ClockType = typeof Clock 

