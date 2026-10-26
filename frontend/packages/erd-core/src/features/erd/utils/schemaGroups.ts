import type { Node } from '@xyflow/react'

const unquote = (name: string) =>
  name.startsWith('"') && name.endsWith('"')
    ? name.slice(1, -1).replace(/""/g, '"')
    : name

export const splitTableName = (name: string) => {
  const qualified = name.match(/^("(?:[^"]|"")*"|[^.]+)\.(.+)$/)
  return qualified
    ? {
        schema: unquote(qualified[1] ?? ''),
        table: unquote(qualified[2] ?? name),
      }
    : { schema: '', table: unquote(name) }
}

export const groupTablesBySchema = <T extends Node>(nodes: T[]) => {
  const groups = new Map<string, T[]>()
  for (const node of nodes) {
    if (node.type !== 'table') continue
    const { schema } = splitTableName(node.id)
    const group = groups.get(schema) ?? []
    group.push(node)
    groups.set(schema, group)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
}

export const getSchemaGroups = (nodes: Node[]) =>
  groupTablesBySchema(nodes.filter((node) => !node.hidden)).map(
    ([schema, tables]) => {
      const x = Math.min(...tables.map((node) => node.position.x)) - 32
      const y = Math.min(...tables.map((node) => node.position.y)) - 64
      const right =
        Math.max(
          ...tables.map(
            (node) => node.position.x + (node.measured?.width ?? 200),
          ),
        ) + 32
      const bottom =
        Math.max(
          ...tables.map(
            (node) => node.position.y + (node.measured?.height ?? 140),
          ),
        ) + 32
      return {
        schema,
        x,
        y,
        width: right - x,
        height: bottom - y,
        count: tables.length,
      }
    },
  )

// Preserve absolute saved positions unless schema regions overlap. Move an entire
// schema together so existing relative table positions remain intact.
export const separateSchemaGroups = (nodes: Node[]) => {
  const placed: ReturnType<typeof getSchemaGroups> = []
  const offsets = new Map<string, number>()
  for (const group of getSchemaGroups(nodes)) {
    const overlaps = placed.some(
      (other) =>
        group.x < other.x + other.width + 80 &&
        group.x + group.width + 80 > other.x &&
        group.y < other.y + other.height + 80 &&
        group.y + group.height + 80 > other.y,
    )
    const x = overlaps
      ? Math.max(...placed.map((other) => other.x + other.width)) + 80
      : group.x
    offsets.set(group.schema, x - group.x)
    placed.push({ ...group, x })
  }
  return nodes.map((node) => ({
    ...node,
    position: {
      ...node.position,
      x: node.position.x + (offsets.get(splitTableName(node.id).schema) ?? 0),
    },
  }))
}
