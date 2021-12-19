import { Observable } from './rx'
import { React } from './react'

export const useSubscription = <T>(obs: Observable<T>) => 
  React.useEffect(() => {
    const sub = obs.subscribe()
    return () => sub.unsubscribe()
  }, [obs])
