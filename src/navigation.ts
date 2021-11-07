const PATHS = [
  '/',
  '/about',
  '/posts/(?<id>.*)',
  '/calendar/(?<year>.*)/(?<month>.*)',
  '/not-found'
] as const;

type ExtractRouteParams<T> = string extends T
    ? Record<string, string>
    : T extends `${infer _Start}(?<${infer Param}>.*)/${infer Rest}`
    ? { [k in Param | keyof ExtractRouteParams<Rest>]: string }
    : T extends `${infer _Start}(?<${infer Param}>.*)`
    ? { [k in Param]: string }
    : {}
export type Path = (typeof PATHS)[number]
export type PathParams<P extends Path> = ExtractRouteParams<P>


export type RouterConfig = {
  [k in Path]: (params: PathParams<k>) => React.ReactElement
}

export function matchLocationToPath(location: string): [Path, any] {
  console.log('new location', location)
  const exact = PATHS.find(p => p === location)
  if (exact) {
    console.log('exact match', {location, exact})
    return [exact, {}]
  }

  const regexes = PATHS
                    .filter(p => p.toString().includes('(?<'))
                    .map(path => ({path, regexp: new RegExp(path)}))
  const regMatch = regexes
                    .map(r => ({path: r.path, match: r.regexp.exec(location)}))
                    .find(r => r.match !== null)
  if (regMatch){
    console.log('reg match', {location, regMatch})
    const params = (regMatch.match as any).groups
    return [regMatch.path, params]
  }

  return ['/not-found', {}]
}
