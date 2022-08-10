
export type LogLevel = 'trace'| 'info' | 'warn' | 'error'
export type Logger = { 
  [key in LogLevel]: (msg: string, ...data: any[]) => void 
}

export const consoleLogger: Logger = {
  'trace': console.log,
  'info': console.info,
  'warn': console.warn,
  'error': console.error
}

export const logPrefix = (prefix: string) => (logger: Logger): Logger => {
  const prefLogger = {...logger}
  Object.keys(prefLogger).map(k => {
    prefLogger[k] = (msg, data) => data ? logger[k](`${prefix} ${msg}`, data) : logger[k](`${prefix} ${msg}`)
  })

  return prefLogger
}
