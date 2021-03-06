import { Observable } from './rx'
import { React } from './react'
import { Disposable } from './disposable'

export const useSubscription = <T>(obs: Observable<T>) =>
  React.useEffect(() => {
    const sub = obs.subscribe()
    return () => sub.unsubscribe()
  }, [obs])

export const useDisposable = <T extends Disposable>(disp: T) => {
    React.useEffect(() => {
    return () => disp.dispose()
  }, [disp])

  return disp
}

