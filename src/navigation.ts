const PATHS = [
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

export function matchLocationToPath(location: string): PathWithParams {
  console.log('new location', location)
  const exact = PATHS.filter(isStaticPath).find(p => p === location)
  if (exact) {
    console.log('exact match', {location, exact})
    return { path: exact, params: {} }
  }

  const regMatch = PATHS
                    .filter(isDynamicPath)
                    .map(path => ({path, match: location.match(new RegExp(path))}))
                    .find(r => r.match !== null)
  if (regMatch){
    console.log('reg match', {location, regMatch})
    // TODO: check if groups match path params
    // see https://github.com/microsoft/TypeScript/issues/32098
    const params = regMatch.match.groups as any
    return {path: regMatch.path, params }
  }

  return {path: '/not-found', params: {}}
}
