import { React } from './react'

export const Layout = ({children}) => {
  return (
    <div className="layout">
      {/* <Link 
        route={{path: '/', params: {}}} 
        label="Home"
        navigate={navigate} /> */}
      <div className="header">Bare Bones app</div>
      <div className="content">{children}</div>
    </div>
  )
}
