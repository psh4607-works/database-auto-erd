import { schemaSchema } from '@liam-hq/schema'
import * as v from 'valibot'

const shortText = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(256))
export const connectionInputSchema = v.object({
  name: shortText,
  host: shortText,
  port: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)),
  database: shortText,
  user: shortText,
  password: v.pipe(v.string(), v.maxLength(4096)),
  ssl: v.boolean(),
})
export type ConnectionInput = v.InferOutput<typeof connectionInputSchema>
const publicConnectionSchema = v.omit(connectionInputSchema, ['password'])
const positionSchema = v.object({
  x: v.pipe(v.number(), v.finite()),
  y: v.pipe(v.number(), v.finite()),
})
export const diagramSchema = v.object({
  positions: v.record(v.string(), positionSchema),
  hidden: v.array(v.string()),
  annotations: v.record(
    v.string(),
    v.object({
      color: v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/)),
      group: v.pipe(v.string(), v.maxLength(100)),
      note: v.pipe(v.string(), v.maxLength(4000)),
    }),
  ),
  relationships: v.array(
    v.object({
      id: shortText,
      source: shortText,
      sourceColumn: shortText,
      target: shortText,
      targetColumn: shortText,
      label: v.pipe(v.string(), v.maxLength(100)),
    }),
  ),
})
export type Diagram = v.InferOutput<typeof diagramSchema>
export const emptyDiagram = (): Diagram => ({
  positions: {},
  hidden: [],
  annotations: {},
  relationships: [],
})
export const workspaceSchema = v.object({
  id: v.string(),
  connection: publicConnectionSchema,
  configRevision: v.number(),
  diagramRevision: v.number(),
  snapshot: v.nullable(schemaSchema),
  baseline: v.nullable(schemaSchema),
  diagram: diagramSchema,
  lastSuccessAt: v.nullable(v.string()),
  lastError: v.nullable(v.string()),
})
export type Workspace = v.InferOutput<typeof workspaceSchema>
export type ActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }
