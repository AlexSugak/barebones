import { React } from './react'
import { BehaviorSubject } from './rx'
import { View } from './hoc'
import { getDevServerMessages, getSourceFilesUpdates } from './dev'

const isDev = true
const modules: Map<string, () => void> = new Map()

type Comp<P> = React.FunctionComponent<P>

const Empty = ({}) => <></>
const Hot = <P extends object>({module, component, ...props}: {module: string, component: (module: any) => Comp<P> } & P) => {
  const view = React.useRef(new BehaviorSubject<Comp<P>>(Empty))

  const reload = () => {
    const newSeed = (new Date()).getMilliseconds().toString()
    import(`${module}?seed=${newSeed}`).then(m => {
      view.current.next(component(m))
    })
  }

  modules.set(module, reload)

  React.useEffect(reload, [])

  return <View stream={view.current}>
    {V => <V {...props as P} />}
  </View>
}

const makeHot = <P extends object>(module: string, inner: (module: any) => Comp<P>): Comp<P> => {
  return (p: P) => <Hot module={module} component={inner} {...p} />
}

const cook = async <P extends object>(module: string, component: (module: any) => Comp<P>): Promise<Comp<P>> => {
  if (isDev) {
    return Promise.resolve(makeHot(module, component))
  } else {
    return await import(module).then(component)
  }
}

if (isDev) {
  const fileUpdates = getSourceFilesUpdates(getDevServerMessages())
  fileUpdates.subscribe(f => {
    const reload = Array.from(modules.entries())
                        .find(([k]) => f.fileName
                        .endsWith(k.replace('.\/', '\/')))
    if (reload) {
      console.info('reloading module: ', reload[0])
      reload[1]()
    }
  })
}

const hotImport = async <P extends object>(module: string, m: (module: any) => Comp<P>) => 
  await cook(module, m)

// TODO: make this type-safe
import { ClockType } from './clock'
const Clock = await hotImport('./clock', m => m.Clock as ClockType)

import { RouterType } from './router'
const Router = await hotImport('./router', m => m.Router as RouterType)

import { LinkType } from './router'
const Link = await hotImport('./router', m => m.Link as LinkType)

import { LoginViewType } from './auth/auth-view'
const LoginView = await hotImport('./auth/auth-view', m => m.LoginView as LoginViewType)

import { LayoutType } from './layout'
const Layout = await hotImport('./layout', m => m.Layout as LayoutType)

// TODO: do not make components hot if not isDev
export {
  Clock,
  Router,
  Link,
  LoginView,
  Layout
}
