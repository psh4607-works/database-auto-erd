import type { Edge, Node } from '@xyflow/react'
import { groupTablesBySchema, separateSchemaGroups } from '../schemaGroups'
import { getElkLayout } from './getElkLayout'

export const computeAutoLayout = async (nodes: Node[], edges: Edge[]) => {
  const hiddenNodes: Node[] = []
  const visibleNodes: Node[] = []
  for (const node of nodes) {
    if (node.hidden) {
      hiddenNodes.push(node)
    } else {
      visibleNodes.push(node)
    }
  }

  // NOTE: Only include edges where both the source and target are in the nodes
  const nodeMap = new Map(visibleNodes.map((node) => [node.id, node]))
  const visibleEdges = edges.filter((edge) => {
    return nodeMap.get(edge.source) && nodeMap.get(edge.target)
  })

  const newNodes = visibleNodes.some((node) => node.data['persistent'])
    ? await layoutWorkspaceSchemas(visibleNodes, visibleEdges)
    : await getElkLayout({ nodes: visibleNodes, edges: visibleEdges })

  return {
    nodes: [...hiddenNodes, ...newNodes],
    edges,
  }
}

const layoutWorkspaceSchemas = async (nodes: Node[], edges: Edge[]) => {
  const groups = await Promise.all(
    groupTablesBySchema(nodes).map(async ([, tables]) => {
      const ids = new Set(tables.map((node) => node.id))
      return getElkLayout({
        nodes: tables,
        edges: edges.filter(
          (edge) => ids.has(edge.source) && ids.has(edge.target),
        ),
      })
    }),
  )
  return separateSchemaGroups(groups.flat())
}
