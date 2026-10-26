import type { Node } from '@xyflow/react'
export type SavedPositions = Record<string, { x: number; y: number }>
export const restorePositions = (nodes: Node[], positions: SavedPositions) => {
  const saved = Object.values(positions)
  if (saved.length === 0) return nodes
  const nextX = Math.max(...saved.map((position) => position.x)) + 400
  let added = 0
  return nodes.map((node) => {
    const position = positions[node.id] ?? {
      x: nextX + Math.floor(added / 4) * 400,
      y: (added++ % 4) * 500,
    }
    return { ...node, position }
  })
}
