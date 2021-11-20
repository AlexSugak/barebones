import { React, ReactDOM } from './react'
import { App } from './app'

const e = React.createElement;    
const domContainer = document.querySelector('#app');
ReactDOM.render(e(App), domContainer);      
    
