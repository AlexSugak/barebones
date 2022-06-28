import { Subscription } from "./rx"

export interface Disposable {
  dispose(): void
}

export class SubscriptionKeeper implements Disposable {
  private _subs: (Subscription | Disposable)[] = []

  push(...s: (Subscription | Disposable)[]): void {
    this._subs.push(...s)
  }

  dispose(): void {
    this._subs.forEach(s => {
      if ('unsubscribe' in s) {
        s.unsubscribe()
      } else {
        s.dispose()
      }
    })
    this._subs = []
  }
}
