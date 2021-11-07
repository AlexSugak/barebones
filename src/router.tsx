import { React } from './react.js'
import { View } from './hoc.js'
import { Observable, map, BehaviorSubject } from './rx.js'
import { matchLocationToPath } from './navigation.js'
import { assertNever } from './errors.js'

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

export function matchLocationToView(location: string): React.ReactElement {
  const p = matchLocationToPath(location)
  switch(p.path) {
    case '/':
      return <div>Home</div>
    case '/about':
      return <div>About</div>
    case '/not-found':
      return <div>Not Found!</div>
    case '/calendar/(?<year>.*)/(?<month>.*)':
      return <div>Calendar: {p.params.year} {p.params.month}</div>
    case '/posts/(?<id>.*)':
      return <div>Post: {p.params.id}</div>
    default:
      assertNever(p)
  }
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
