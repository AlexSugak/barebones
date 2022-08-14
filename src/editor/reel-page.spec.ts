import { Expect, test, spec, Specification } from '../spec'
import { getChangesInRange, indexChanges } from './reel-page'

export const specs: Specification[] = [
  spec('indexChanges', [
    test('should index changes by seconds', () => {

      const change1 = {timestamp: 123, changes: [], invertedChanges: []}
      const change2 = {timestamp: 2123, changes: [], invertedChanges: []}
      const change3 = {timestamp: 2567, changes: [], invertedChanges: []}
      const change4 = {timestamp: 5345, changes: [], invertedChanges: []}
      const result = indexChanges([change1, change2, change3, change4])
      
      Expect.equals([[change1], [], [change2, change3], [], [], [change4]], result)
    })
  ]),
  spec('getChangesInRange', [
    test('should find forward changes', () => {
      const change1 = {timestamp: 123, changes: [], invertedChanges: []}
      const change2 = {timestamp: 3550, changes: [], invertedChanges: []}
      const change3 = {timestamp: 3600, changes: [], invertedChanges: []}
      const change4 = {timestamp: 5345, changes: [], invertedChanges: []}
      const change5 = {timestamp: 5600, changes: [], invertedChanges: []}
      const index = [
        [change1],
        [],
        [],
        [change2, change3],
        [],
        [change4, change5]
      ]
      
      Expect.equals([change3, change4], getChangesInRange(index, 3570, 5400))
    }),
    test('should find backward changes', () => {
      const change1 = {timestamp: 123, changes: [], invertedChanges: []}
      const change2 = {timestamp: 3550, changes: [], invertedChanges: []}
      const change3 = {timestamp: 3600, changes: [], invertedChanges: []}
      const change4 = {timestamp: 5345, changes: [], invertedChanges: []}
      const change5 = {timestamp: 5600, changes: [], invertedChanges: []}
      const index = [
        [change1],
        [],
        [],
        [change2, change3],
        [],
        [change4, change5]
      ]
      
      Expect.equals([change2, change3, change4], getChangesInRange(index, 5600, 3500))
    }),
    test('should find initial change', () => {
      const change1 = {timestamp: 0, changes: [], invertedChanges: []}
      const change2 = {timestamp: 2233, changes: [], invertedChanges: []}
      const index = [
        [change1],
        [],
        [change2],
        []
      ]
      
      Expect.equals([change1], getChangesInRange(index, 0, 19))
    }),
    test('should find change inside same sec', () => {
      const change1 = {timestamp: 2220, changes: [], invertedChanges: []}
      const change2 = {timestamp: 2230, changes: [], invertedChanges: []}
      const change3 = {timestamp: 2240, changes: [], invertedChanges: []}
      const index = [
        [],
        [],
        [change1, change2, change3],
        []
      ]
      
      Expect.equals([change2], getChangesInRange(index, 2225, 2235))
    })
  ])
]
