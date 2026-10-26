'use client'

import type { Schema } from '@liam-hq/schema'
import { Button, Input } from '@liam-hq/ui'
import { useId, useState } from 'react'
import type { Diagram } from './model'
import styles from './Workspace.module.css'

type Props = {
  schema: Schema
  diagram: Diagram
  busy: boolean
  onSave: (next: Diagram) => Promise<void>
}
export const DiagramEditor = ({ schema, diagram, busy, onSave }: Props) => {
  const formId = useId()
  const tables = Object.keys(schema.tables)
  const [selected, setSelected] = useState(tables[0] ?? '')
  const selectedTable = schema.tables[selected] ? selected : (tables[0] ?? '')
  const [source, setSource] = useState(tables[0] ?? '')
  const [target, setTarget] = useState(tables[1] ?? tables[0] ?? '')
  const annotation = diagram.annotations[selectedTable]
  return (
    <aside className={styles.editor}>
      <h2>Diagram notes</h2>
      <p className={styles.muted}>
        Display settings stay separate from the database.
      </p>
      <label>
        Table
        <select
          value={selectedTable}
          onChange={(event) => setSelected(event.target.value)}
        >
          {tables.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <form
        key={`${selectedTable}:${JSON.stringify(annotation)}`}
        onSubmit={async (event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          await onSave({
            ...diagram,
            annotations: {
              ...diagram.annotations,
              [selectedTable]: {
                color: String(form.get('color')),
                group: String(form.get('group')),
                note: String(form.get('note')),
              },
            },
          })
        }}
      >
        <fieldset disabled={busy || !selectedTable}>
          <label>
            Color
            <input
              type="color"
              name="color"
              defaultValue={annotation?.color ?? '#22c55e'}
            />
          </label>
          <label htmlFor={`${formId}-group`}>
            Group
            <Input
              id={`${formId}-group`}
              name="group"
              defaultValue={annotation?.group ?? ''}
              maxLength={100}
              placeholder="e.g. Accounts"
            />
          </label>
          <label>
            Note
            <textarea
              name="note"
              defaultValue={annotation?.note ?? ''}
              maxLength={4000}
              rows={4}
            />
          </label>
          <Button type="submit">Save annotation</Button>
        </fieldset>
      </form>
      <h2>Logical relationships</h2>
      <p className={styles.muted}>
        Dashed purple lines are diagram-only relationships. They never create
        foreign keys.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          await onSave({
            ...diagram,
            relationships: [
              ...diagram.relationships,
              {
                id: crypto.randomUUID(),
                source,
                target,
                sourceColumn: String(form.get('sourceColumn')),
                targetColumn: String(form.get('targetColumn')),
                label: String(form.get('label')),
              },
            ],
          })
        }}
      >
        <fieldset disabled={busy || tables.length === 0}>
          <label>
            Source table
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              {tables.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Source column
            <select name="sourceColumn" required key={source}>
              {Object.keys(schema.tables[source]?.columns ?? {}).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Target table
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              {tables.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Target column
            <select name="targetColumn" required key={target}>
              {Object.keys(schema.tables[target]?.columns ?? {}).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label htmlFor={`${formId}-label`}>
            Label
            <Input
              id={`${formId}-label`}
              name="label"
              maxLength={100}
              placeholder="Logical relationship"
            />
          </label>
          <Button type="submit" variant="outline-secondary">
            Add relationship
          </Button>
        </fieldset>
      </form>
      {diagram.relationships.map((relationship) => (
        <div className={styles.relationship} key={relationship.id}>
          <span>
            {relationship.source}.{relationship.sourceColumn} →{' '}
            {relationship.target}.{relationship.targetColumn}
          </span>
          {(!schema.tables[relationship.source]?.columns[
            relationship.sourceColumn
          ] ||
            !schema.tables[relationship.target]?.columns[
              relationship.targetColumn
            ]) && <small>Endpoint missing; relationship retained</small>}
          <Button
            size="xs"
            variant="ghost-secondary"
            disabled={busy}
            onClick={() =>
              onSave({
                ...diagram,
                relationships: diagram.relationships.filter(
                  (item) => item.id !== relationship.id,
                ),
              })
            }
          >
            Remove relationship
          </Button>
        </div>
      ))}
    </aside>
  )
}
