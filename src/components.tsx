import { React } from './react'
import { BehaviorSubject } from './rx'
import { View } from './hoc'
import { getDevServerMessages, getSourceFilesUpdates, isDevEnv } from './dev'

const isDev = isDevEnv()
const modules: Map<string, () => void> = new Map()

if (isDev) {
  const fileUpdates = getSourceFilesUpdates(getDevServerMessages())
  fileUpdates.subscribe(f => {
    // reload if updated file matches one of the hot modules
    const reload = Array.from(modules.entries())
                        .find(([k]) => f.fileName
                                        .match(new RegExp(`.*${k.replace('.\/', '\/')}.(?:[a-z0-9]*.)?js$`)))
    if (reload) {
      console.info('reloading module: ', reload[0])
      reload[1]()
    }
  })
}

let importMap: {imports: {[key:string]: string}} | null = null
void (async () => {
  importMap = await (await fetch(`/js/importMap.json`)).json()
})()

type Comp<P> = React.FunctionComponent<P>

const Hot = <P extends object>(
  {module, initialComponent, component, ...props}: 
  {module: string, initialComponent: Comp<P>, component: (module: any) => Comp<P> } & P) => {

  const view = React.useRef(new BehaviorSubject<Comp<P>>(initialComponent))
  const reload = () => {
    const newSeed = (new Date()).getMilliseconds().toString()
    const moduleKey = `/js/${module.replace('.\/', '')}`
    const modulePath = importMap.imports[moduleKey]
    import(`${modulePath}?seed=${newSeed}`).then(m => {
      view.current.next(component(m))
    })
  }

  modules.set(module, reload)

  return <View stream={view.current}>
    {V => <V {...props as P} />}
  </View>
}

const hotImport = <P extends object>(module: string, initial: Comp<P>, m: (module: any) => Comp<P>) => {
  if (isDev) {
    return (p: P) => <Hot module={module} initialComponent={initial} component={m} {...p} />
  } else {
    return initial
  }
}

// TODO: make this type-safe
import { Router as RouterComp } from './router'
const Router = hotImport('./router', RouterComp, m => m.Router)

import { Link as LinkComp } from './router'
const Link = hotImport('./router', LinkComp, m => m.Link)

import { LoginView as LoginViewComp } from './auth/auth-view'
const LoginView = hotImport('./auth/auth-view', LoginViewComp, m => m.LoginView)

import { Layout as LayoutComp } from './layout'
const Layout = hotImport('./layout', LayoutComp, m => m.Layout)

export {
  Router,
  Link,
  LoginView,
  Layout
}
