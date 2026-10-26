import type { Node } from '@xyflow/react'
export type SavedPositions = Record<string, { x: number; y: number }>
export const restorePositions = (nodes: Node[], positions: SavedPositions) => {
  const saved = Object.entries(positions)
  if (saved.length === 0) return nodes
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const nextX =
    Math.max(
      ...saved.map(
        ([id, position]) => position.x + (byId.get(id)?.measured?.width ?? 320),
      ),
    ) + 80
  const newNodes = nodes.filter((node) => !positions[node.id])
  const left = newNodes.length
    ? Math.min(...newNodes.map((node) => node.position.x))
    : 0
  return nodes.map((node) => {
    const position = positions[node.id] ?? {
      x: nextX + node.position.x - left,
      y: node.position.y,
    }
    return { ...node, position }
  })
}

export const areTableNodesMeasured = (nodes: Node[]) => {
  const visibleTables = nodes.filter(
    (node) => node.type === 'table' && !node.hidden,
  )
  return (
    visibleTables.length > 0 &&
    visibleTables.every((node) =>
      Boolean(node.measured?.width && node.measured?.height),
    )
  )
}

export const captureLivePositions = (
  saved: SavedPositions,
  nodes: Node[],
): SavedPositions => ({
  ...saved,
  ...Object.fromEntries(
    nodes
      .filter((node) => node.type === 'table')
      .map((node) => [node.id, node.position]),
  ),
})
