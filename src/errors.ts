export interface CustomError extends Error {}

// TS extends doesn't work with default Error object, so we need custom
export const CustomError = (function (this: Error, message = '(nomessage)') {
  Error.call(this, message)

  // better stack trace for V8 engine (Chrome + NodeJS)
  if ('captureStackTrace' in Error) {
    Error.captureStackTrace(this, this.constructor)
  } else {
    this.stack = new Error().stack
  }

  this.message = message
  this.name = this.constructor.name
} as any) as ErrorConstructor


export class MatchingNotExhaustiveError extends CustomError {
  constructor(actualValue?: any) {
    super(
      `Matching not exhaustive${
        Boolean(actualValue) ? `: unexpected value ${JSON.stringify(actualValue)}` : ''
      }`
    )
  }
}

export function assertNever(x: never): never {
  throw new MatchingNotExhaustiveError(x)
}

export class InvariantError extends CustomError {
  constructor(msg?: string, public input = 'empty') {
    super('Invariant condition failed: ' + (Boolean(msg) ? msg : '(unnamed)'))
  }

  toString() {
    return `${this.message} on input[${this.input}]`
  }
}

export function invariant(cond: boolean): asserts cond
export function invariant(cond: boolean, msg: string): asserts cond
export function invariant(cond: boolean, msg: string, input: string): asserts cond
export function invariant(cond: boolean, msg: string, input: () => string): asserts cond
export function invariant(cond: boolean, getMsg: () => string): asserts cond
export function invariant(
  cond: boolean,
  msg?: (() => string) | string,
  input?: (() => string) | string
): asserts cond {
  if (!cond) {
    const err = new InvariantError(
      typeof msg === 'string' ? msg : msg && msg(),
      input !== undefined && typeof input !== 'string' ? input() : input as string
    )
    // drop any signs to invariant closure to get a more clear stack trace in invariant errors
    // it works only in dev env, but it provides much better DX in debugging jest tests
    err.stack = err
      .stack!.split('\n')
      .filter(msg => msg.indexOf('errors.') === -1)
      .join('\n')

    throw err
  }
}
