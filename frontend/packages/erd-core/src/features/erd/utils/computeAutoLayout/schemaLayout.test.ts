import type { Edge, Node } from '@xyflow/react'
import { expect, it } from 'vitest'
import { getSchemaGroups } from '../schemaGroups'
import { computeAutoLayout } from './computeAutoLayout'

it('lays out workspace tables in separate schema regions and keeps cross-schema edges', async () => {
  const nodes: Node[] = ['app.first', 'infra.middle', 'app.last'].map((id) => ({
    id,
    type: 'table',
    data: { persistent: true },
    position: { x: 0, y: 0 },
    measured: { width: 200, height: 100 },
  }))
  const edges: Edge[] = [
    { id: 'one', source: 'app.first', target: 'infra.middle' },
    { id: 'two', source: 'infra.middle', target: 'app.last' },
  ]
  const result = await computeAutoLayout(nodes, edges)
  const [app, infra] = getSchemaGroups(result.nodes)
  expect(app?.schema).toBe('app')
  expect(infra?.schema).toBe('infra')
  expect(infra?.x).toBeGreaterThan((app?.x ?? 0) + (app?.width ?? 0))
  expect(result.edges).toEqual(edges)
  expect(result.nodes.map((node) => node.id).sort()).toEqual(
    nodes.map((node) => node.id).sort(),
  )
})
