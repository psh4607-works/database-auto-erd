import type { SavedPositions } from '../utils/persistentLayout'

export type PersistentDiagram = {
  positions: SavedPositions
  hidden: string[]
  annotations: Record<string, { color: string; group: string; note: string }>
  relationships: {
    id: string
    source: string
    sourceColumn: string
    target: string
    targetColumn: string
    label: string
  }[]
}
