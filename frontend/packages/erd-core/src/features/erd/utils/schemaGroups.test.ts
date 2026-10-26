import type { Node } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import {
  getSchemaGroups,
  separateSchemaGroups,
  splitTableName,
} from './schemaGroups'

const table = (id: string, x: number, y: number, hidden = false): Node => ({
  id,
  type: 'table',
  data: {},
  position: { x, y },
  measured: { width: 200, height: 100 },
  hidden,
})
describe('schema presentation without changing table identities', () => {
  it('splits qualified SQL identifiers, including quoted dots and escaped quotes', () => {
    expect(splitTableName('lesson_app.accounts')).toEqual({
      schema: 'lesson_app',
      table: 'accounts',
    })
    expect(splitTableName('"sales.eu"."order.items"')).toEqual({
      schema: 'sales.eu',
      table: 'order.items',
    })
    expect(splitTableName('"team""name"."a""b"')).toEqual({
      schema: 'team"name',
      table: 'a"b',
    })
    expect(splitTableName('accounts')).toEqual({
      schema: '',
      table: 'accounts',
    })
  })
  it('encloses visible tables with header space, follows movement, and excludes hidden tables', () => {
    const groups = getSchemaGroups([
      table('app.users', 100, 100),
      table('app.posts', 500, 400),
      table('app.hidden', 9999, 9999, true),
      table('infra.users', 900, 100),
    ])
    const app = groups.find((group) => group.schema === 'app')
    expect(app).toMatchObject({ count: 2 })
    expect(app?.x).toBeLessThan(100)
    expect(app?.y).toBeLessThanOrEqual(44)
    expect((app?.x ?? 0) + (app?.width ?? 0)).toBeGreaterThan(700)
    expect((app?.y ?? 0) + (app?.height ?? 0)).toBeGreaterThan(500)
    expect(app?.width).toBeLessThan(1000)
    expect(
      getSchemaGroups([table('app.users', -100, -100)])[0]?.x,
    ).toBeLessThan(-100)
    expect(getSchemaGroups([table('app.hidden', 0, 0, true)])).toEqual([])
  })
  it('separates overlapping schemas while preserving table IDs and relative saved positions', () => {
    const input = [
      table('app.users', 100, 100),
      table('app.posts', 400, 200),
      table('infra.users', 200, 100),
    ]
    const output = separateSchemaGroups(input)
    expect(output.map((node) => node.id)).toEqual(input.map((node) => node.id))
    expect(output[0]?.position).toEqual(input[0]?.position)
    expect(output[1]?.position).toEqual(input[1]?.position)
    const groups = getSchemaGroups(output)
    const app = groups.find((group) => group.schema === 'app')
    const infra = groups.find((group) => group.schema === 'infra')
    expect(infra?.x).toBeGreaterThan((app?.x ?? 0) + (app?.width ?? 0))
    expect(separateSchemaGroups(output)).toEqual(output)
    expect(input[2]?.position).toEqual({ x: 200, y: 100 })
  })
})
