import type { Node } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { areTableNodesMeasured, restorePositions } from './persistentLayout'

describe('persistent diagram layout', () => {
  it('keeps saved coordinates and places new tables beyond the saved layout', () => {
    const nodes: Node[] = [
      { id: 'users', position: { x: 0, y: 0 }, data: {} },
      { id: 'orders', position: { x: 1, y: 1 }, data: {} },
    ]
    const result = restorePositions(nodes, { users: { x: 1000, y: -100 } })
    expect(result[0]?.position).toEqual({ x: 1000, y: -100 })
    expect(result[1]?.position.x).toBeGreaterThan(1000)
    expect(nodes[0]?.position).toEqual({ x: 0, y: 0 })
  })
  it('keeps automatic layout when there are no saved positions', () => {
    const nodes: Node[] = [
      { id: 'users', position: { x: 50, y: 70 }, data: {} },
    ]
    expect(restorePositions(nodes, {})).toEqual(nodes)
  })
})

describe('initial layout measurement', () => {
  it('waits for every visible table so tall tables cannot overlap from missing dimensions', () => {
    const measured: Node = {
      id: 'app.first',
      type: 'table',
      data: {},
      position: { x: 0, y: 0 },
      measured: { width: 200, height: 800 },
    }
    const pending: Node = {
      id: 'app.second',
      type: 'table',
      data: {},
      position: { x: 0, y: 0 },
    }
    expect(areTableNodesMeasured([measured, pending])).toBe(false)
    expect(
      areTableNodesMeasured([measured, { ...pending, hidden: true }]),
    ).toBe(true)
    expect(
      areTableNodesMeasured([
        measured,
        { ...pending, measured: { width: 200, height: 100 } },
      ]),
    ).toBe(true)
    expect(areTableNodesMeasured([])).toBe(false)
  })
})
