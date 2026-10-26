'use client'

import type { Schema } from '@liam-hq/schema'
import { Button } from '@liam-hq/ui'
import dynamic from 'next/dynamic'
import { ConnectionForm } from './ConnectionForm'
import { DiagramEditor } from './DiagramEditor'
import { emptyDiagram, type Workspace } from './model'
import { useWorkspace } from './useWorkspace'
import styles from './Workspace.module.css'

const WorkspaceCanvas = dynamic(
  () => import('./WorkspaceCanvas').then((module) => module.WorkspaceCanvas),
  { ssr: false },
)
const namespace = (table: string) =>
  table.match(/^("(?:[^"]|"")+"|[^.]+)\./)?.[1] ?? table
const filterSchema = (schema: Schema | null, selected: string): Schema | null =>
  schema && {
    ...schema,
    tables: Object.fromEntries(
      Object.entries(schema.tables).filter(
        ([name]) => !selected || namespace(name) === selected,
      ),
    ),
  }

export const WorkspaceApp = ({
  initialWorkspaces,
}: {
  initialWorkspaces: Workspace[]
}) => {
  const {
    workspaces,
    selectedId,
    setSelectedId,
    form,
    setForm,
    draft,
    setDraft,
    schemaFilter,
    setSchemaFilter,
    showDiff,
    setShowDiff,
    showEditor,
    setShowEditor,
    busy,
    setBusy,
    message,
    setMessage,
    capture,
    registerCapture,
    workspace,
    updateWorkspace,
    capturedDiagram,
    persist,
    handleSave,
    handleRefresh,
    handleOpenForm,
  } = useWorkspace(initialWorkspaces)
  const currentSchema = filterSchema(workspace?.snapshot ?? null, schemaFilter)
  const previousSchema = filterSchema(workspace?.baseline ?? null, schemaFilter)
  const hasVisibleTables =
    Object.keys({
      ...currentSchema?.tables,
      ...(showDiff ? previousSchema?.tables : {}),
    }).length > 0
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <h1>database-auto-erd</h1>
          <p className={styles.muted}>PostgreSQL · local workspace</p>
        </div>
        <div className={styles.actions}>
          <select
            aria-label="Saved connection"
            value={selectedId}
            disabled={busy}
            onChange={async (event) => {
              const id = event.target.value
              setBusy(true)
              try {
                if (workspace?.snapshot && !(await persist())) return
                const next = workspaces.find((item) => item.id === id)
                setSelectedId(id)
                setDraft(next?.diagram ?? emptyDiagram())
                setSchemaFilter('')
                capture.current = null
                setMessage('')
              } catch {
                setMessage('Could not save the current view. Please retry.')
              } finally {
                setBusy(false)
              }
            }}
          >
            <option value="" disabled>
              Select connection
            </option>
            {workspaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.connection.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline-secondary"
            disabled={busy}
            onClick={() => handleOpenForm('new')}
          >
            New connection
          </Button>
          {workspace && (
            <Button
              variant="ghost-secondary"
              disabled={busy}
              onClick={() => handleOpenForm('edit')}
            >
              Edit connection
            </Button>
          )}
        </div>
      </header>
      {form ? (
        <ConnectionForm
          key={`${form}:${selectedId}`}
          existing={form === 'edit' ? workspace : undefined}
          onCancel={() => setForm(null)}
          onSaved={(updated) => {
            updateWorkspace(updated)
            setSelectedId(updated.id)
            setForm(null)
            capture.current = null
            setSchemaFilter('')
            setMessage('Connection saved. Refresh to load the schema.')
          }}
        />
      ) : (
        <>
          {workspace && (
            <WorkspaceControls
              workspace={workspace}
              busy={busy}
              schemaFilter={schemaFilter}
              showDiff={showDiff}
              onSchemaChange={(value) => {
                setDraft(capturedDiagram())
                setSchemaFilter(value)
              }}
              onDiffChange={(value) => {
                setDraft(capturedDiagram())
                setShowDiff(value)
              }}
              onSave={() => handleSave()}
              onEditor={() => setShowEditor(!showEditor)}
              onRefresh={handleRefresh}
            />
          )}
          <div className={styles.statusBar}>
            <output>{message || workspace?.lastError || 'Ready'}</output>
            {workspace?.lastSuccessAt && (
              <span>
                Last success:{' '}
                {workspace.lastSuccessAt.slice(0, 19).replace('T', ' ')} UTC
              </span>
            )}
          </div>
          {currentSchema && hasVisibleTables ? (
            <div className={styles.content}>
              <div className={styles.canvas}>
                <WorkspaceCanvas
                  key={`${workspace?.id}:${workspace?.lastSuccessAt}:${schemaFilter}`}
                  schema={currentSchema}
                  baseline={previousSchema}
                  diagram={draft}
                  showDiff={showDiff}
                  registerCapture={registerCapture}
                />
              </div>
              {showEditor && workspace?.snapshot && (
                <DiagramEditor
                  key={`${workspace.id}:${workspace.lastSuccessAt}`}
                  schema={workspace.snapshot}
                  diagram={draft}
                  busy={busy}
                  onSave={handleSave}
                />
              )}
            </div>
          ) : (
            <EmptyWorkspace workspace={workspace} />
          )}
        </>
      )}
    </div>
  )
}

type ControlsProps = {
  workspace: Workspace
  busy: boolean
  schemaFilter: string
  showDiff: boolean
  onSchemaChange: (value: string) => void
  onDiffChange: (value: boolean) => void
  onSave: () => Promise<void>
  onEditor: () => void
  onRefresh: () => Promise<void>
}
const WorkspaceControls = ({
  workspace,
  busy,
  schemaFilter,
  showDiff,
  onSchemaChange,
  onDiffChange,
  onSave,
  onEditor,
  onRefresh,
}: ControlsProps) => (
  <div className={styles.controls}>
    <label>
      Schema
      <select
        value={schemaFilter}
        disabled={busy || !workspace.snapshot}
        onChange={(event) => onSchemaChange(event.target.value)}
      >
        <option value="">All schemas</option>
        {[
          ...new Set(
            Object.keys({
              ...workspace.snapshot?.tables,
              ...(showDiff ? workspace.baseline?.tables : {}),
            }).map(namespace),
          ),
        ].map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    </label>
    <label className={styles.checkbox}>
      <input
        type="checkbox"
        checked={showDiff}
        disabled={!workspace.baseline || busy}
        onChange={(event) => onDiffChange(event.target.checked)}
      />{' '}
      Compare last refresh
    </label>
    <Button
      disabled={busy || !workspace.snapshot}
      variant="outline-secondary"
      onClick={onSave}
    >
      Save view
    </Button>
    <Button
      disabled={busy || !workspace.snapshot}
      variant="outline-secondary"
      onClick={onEditor}
    >
      Notes & relationships
    </Button>
    <Button disabled={busy} isLoading={busy} onClick={onRefresh}>
      Refresh schema
    </Button>
  </div>
)

const EmptyWorkspace = ({ workspace }: { workspace?: Workspace }) => (
  <div className={styles.empty}>
    <h2>
      {workspace
        ? 'Your schema, one refresh away'
        : 'Start with a PostgreSQL connection'}
    </h2>
    <p>
      {workspace?.snapshot
        ? 'No tables are visible in this schema. Check the selected schema and database permissions.'
        : 'Connect a database to explore tables, relationships and changes.'}
    </p>
    <p>
      Refresh updates schema metadata. Your layout, groups and notes are kept
      separately.
    </p>
  </div>
)
