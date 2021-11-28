import { React } from './react'

export const Layout = ({children}) => {
  return (
    <div className="flex flex-col flex-grow items-center">
      {/* <Link 
        route={{path: '/', params: {}}} 
        label="Home"
        navigate={navigate} /> */}
      <div className="p-2">Bare Bones app</div>
      <div>{children}</div>
    </div>
  )
}

export type LayoutType = typeof Layout
