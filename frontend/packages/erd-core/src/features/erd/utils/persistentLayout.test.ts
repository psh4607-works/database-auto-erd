import type { Node } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import {
  areTableNodesMeasured,
  captureLivePositions,
  restorePositions,
} from './persistentLayout'

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

it('preserves live unsaved positions across content remounts without losing off-canvas positions', () => {
  const saved = { 'app.one': { x: 1, y: 2 }, 'infra.two': { x: 30, y: 40 } }
  const live: Node[] = [
    { id: 'app.one', type: 'table', data: {}, position: { x: 600, y: 700 } },
  ]
  expect(captureLivePositions(saved, live)).toEqual({
    'app.one': { x: 600, y: 700 },
    'infra.two': { x: 30, y: 40 },
  })
})

it('places newly discovered tall tables without overlap and beyond wide saved tables', () => {
  const nodes: Node[] = [
    {
      id: 'saved',
      type: 'table',
      data: {},
      position: { x: 0, y: 0 },
      measured: { width: 900, height: 100 },
    },
    {
      id: 'new1',
      type: 'table',
      data: {},
      position: { x: 100, y: 10 },
      measured: { width: 200, height: 900 },
    },
    {
      id: 'new2',
      type: 'table',
      data: {},
      position: { x: 100, y: 1000 },
      measured: { width: 200, height: 900 },
    },
  ]
  const result = restorePositions(nodes, { saved: { x: 1000, y: 0 } })
  expect(result[0]?.position).toEqual({ x: 1000, y: 0 })
  expect(result[1]?.position.x).toBeGreaterThan(1900)
  expect(result[2]?.position.y).toBeGreaterThan(
    (result[1]?.position.y ?? 0) + 900,
  )
})

it('ignores saved positions outside the rendered schema when placing new tables', () => {
  const nodes: Node[] = [
    { id: 'new', type: 'table', data: {}, position: { x: 20, y: 30 } },
  ]
  expect(restorePositions(nodes, { dropped: { x: 100000, y: 0 } })).toEqual(
    nodes,
  )
})
