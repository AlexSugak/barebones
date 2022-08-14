export const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
export const doNothing = () => undefined
export const identity = <A>(a: A) => a
