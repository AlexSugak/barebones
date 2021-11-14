import { React } from './react.js'
import { BehaviorSubject } from './rx.js'
import { View } from './hoc.js'
import { getDevServerMessages, getSourceFilesUpdates } from './dev.js'

const isDev = true
const modules: Map<string, () => void> = new Map()

type Comp<P> = React.FunctionComponent<P>

const Empty = ({}) => <></>
const Hot = <P extends object>({module, component, ...props}: {module: string, component: (module: any) => Comp<P> } & P) => {
  const view = new BehaviorSubject<Comp<P>>(Empty)

  const reload = () => {
    const newSeed = (new Date()).getMilliseconds().toString()
    import(`${module}?seed=${newSeed}`).then(m => {
      view.next(component(m))
    })
  }

  modules.set(module, reload)

  React.useEffect(reload, [])

  return <View stream={view}>
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
    console.info('reloading module: ', f.fileName)
    const reload = Array.from(modules.entries()).find(([k]) => k.endsWith(f.fileName))
    if (reload) {
      reload[1]()
    }
  })
}

const hotImport = async <P extends object>(module: string, m: (module: any) => Comp<P>) => 
  await cook(module, m)

// TODO: make this type-safe
import { ClockType } from './clock.js'
const Clock = await hotImport('./clock.js', m => m.Clock as ClockType)

import { RouterType } from './router.js'
const Router = await hotImport('./router.js', m => m.Router as RouterType)

import { LinkType } from './router.js'
const Link = await hotImport('./router.js', m => m.Link as LinkType)

// TODO: do not make components hot if not isDev
export {
  Clock,
  Router,
  Link
}
