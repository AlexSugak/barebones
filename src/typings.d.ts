// declare module 'https://unpkg.com/es-react@16.13.1/dev' {
declare module 'lib/react' {
    import * as React from 'react';
    import * as ReactDOM from 'react-dom';

    export {
        React,
        ReactDOM
    };
}

// declare module 'https://unpkg.com/@esm-bundle/rxjs@7.3.0/esm/es5/rxjs.min.js' {
declare module 'lib/rxjs' {
    export * from 'rxjs';
}
