export interface CustomError extends Error {}

// TS extends doesn't work with default Error object, so we need custom
export const CustomError = (function (this: Error, message = '(nomessage)') {
  Error.call(this, message)

  // better stack trace for V8 engine (Chrome + NodeJS)
  if ('captureStackTrace' in Error) {
    // @ts-expect-error
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
