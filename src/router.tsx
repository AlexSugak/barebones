import { React } from './react'
import { View } from './hoc'
import { Observable, map, BehaviorSubject } from './rx'
import { assertNever } from './errors'

/**
 * Router
 * 
 * - [+] Configure routes: [{ route: About }, { route: Home }, ...]
 * - [+] Match current url to route: '/about' => { route: About }
 * - [+] Match route to react component: { route: About } => <About />
 * - [+] Listen window.onpopstate changes => '/about' => { route: About } => rendering <About />
 * - [+] <Link /> onclick => window.location => ... => rendering <About />
 */

 export const PATHS = [
  '/',
  '/about',
  '/posts/(?<id>.*)',
  '/calendar/(?<year>.*)/(?<month>.*)',
  '/not-found'
] as const;

type ExtractPathParams<T> = string extends T
    ? Record<string, string>
    : T extends `${infer _Start}(?<${infer Param}>.*)/${infer Rest}`
    ? { [k in Param | keyof ExtractPathParams<Rest>]: string }
    : T extends `${infer _Start}(?<${infer Param}>.*)`
    ? { [k in Param]: string }
    : {}
export type Path = (typeof PATHS)[number]
export type PathParams<P extends Path> = ExtractPathParams<P>

type ExtractStaticPaths<T> = string extends T ? T : T extends `${infer _Start}(?<${infer _End}` ? never : T
export type StaticPath = ExtractStaticPaths<Path>
export function isStaticPath(p: Path): p is StaticPath {
  return !p.includes('(?<')
}

type ExtractDynamicPaths<T> = string extends T ? T : T extends `${infer _Start}(?<${infer _End}` ? T : never
export type DynamicPath = ExtractDynamicPaths<Path>
export function isDynamicPath(p: Path): p is DynamicPath {
  return !isStaticPath(p)
}

type DistributeParams<P> = P extends Path ? {path: P, params: PathParams<P>} : never
export type PathWithParams = DistributeParams<Path>

export function generatePathUrl<P extends Path>(
  path: P,
  params: PathParams<P>): string {
  if (isStaticPath(path)) {
    return path
  }

  let url = path.toString()
  Object.keys(params).forEach(key => {
    url = url.replace(`(?<${key}>.*)`, params[key])
  })

  return url
}

export class RouterState {
  private _location: BehaviorSubject<string> = 
    new BehaviorSubject<string>(document.location.pathname)

  constructor(){
    window.onpopstate = () => {
      this._location.next(document.location.pathname)
    }
  }

  get location(): Observable<string> {
    return this._location
  }

  navigate(to: string) {
    history.pushState({}, '', to)
    this._location.next(to)
  }
}

export function matchLocationToPath(location: string): PathWithParams {
  const exact = PATHS.filter(isStaticPath).find(p => p === location)
  if (exact) {
    return { path: exact, params: {} }
  }

  const regMatch = PATHS
                    .filter(isDynamicPath)
                    .map(path => ({path, match: location.match(new RegExp(path))}))
                    .find(r => r.match !== null)
  if (regMatch){
    // TODO: check if groups match path params
    // see https://github.com/microsoft/TypeScript/issues/32098
    const params = regMatch.match.groups as any
    return {path: regMatch.path, params }
  }

  return {path: '/not-found', params: {}}
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

export type LinkParams = 
  {route: PathWithParams, label: string, navigate: (url: string) => void}
export const Link = (
  {route, label, navigate}: LinkParams) => {
  return (<a href={"#"} onClick={e => {
    e.preventDefault()
    navigate(generatePathUrl(route.path, route.params))
  }}>{label}</a>)
}

export type LinkType = typeof Link 
