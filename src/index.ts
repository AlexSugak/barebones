import { React, ReactDOM } from './react'
import { App } from './app'

const isServerRendered: boolean = Boolean((window as any).isServerRendered)

const e = React.createElement;    
const domContainer = document.querySelector('#app');

if (isServerRendered) {
  ReactDOM.hydrate(e(App), domContainer);
} else {
  ReactDOM.render(e(App), domContainer);
}   
