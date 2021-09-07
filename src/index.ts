import { React, ReactDOM } from './react.js'
import { App } from './app.js'

const e = React.createElement;    
const domContainer = document.querySelector('#app');
ReactDOM.render(e(App), domContainer);      
    