import { React } from './react.js'
import { View } from './hoc.js'
import { Observable, map, BehaviorSubject } from './rx.js'
import { matchLocationToPath, RouterConfig } from './navigation.js'

/**
 * Router
 * 
 * - [+] Configure routes: [{ route: About }, { route: Home }, ...]
 * - [+-] Match current url to route: '/about' => { route: About }
 * - [+] Match route to react component: { route: About } => <About />
 * - [-] Listen window.location changes => '/about' => { route: About } => rendering <About />
 * - [+-] <Link /> onclick => window.location => ... => rendering <About />
 */


 export class RouterState {
  private _location: BehaviorSubject<string> = new BehaviorSubject<string>('/')
  constructor(){
  }

  get location(): Observable<string> {
    return this._location
  }

  navigate(to: string) {
    this._location.next(to)
  }
}

export const routerConfig: RouterConfig = {
  '/': () => <div>Home</div>,
  '/about': () => <div>About</div>,
  '/posts/(?<id>.*)': ({id}) => <div>Post: {id}</div>,
  '/calendar/(?<year>.*)/(?<month>.*)': ({year, month}) => <div>Calendar: {year} {month}</div>,
  '/not-found': () => <div>Not Found!</div>,
}

export function matchLocationToView(location: string): React.ReactElement {
  const [path, params] = matchLocationToPath(location)
  return routerConfig[path](params)
}

export const Router = ({
    location,
    match
  }: {
  location: Observable<string>,
  match: (location: string) => React.ReactElement
}) => {
  return (<>
    <View stream={location.pipe(map(match))}>
      { v => v }
    </View>
  </>)
}

export type RouterType = typeof Router 
