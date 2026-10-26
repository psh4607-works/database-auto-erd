'use client'

import { useCallback, useRef, useState } from 'react'
import {
  refreshAction,
  reloadWorkspaceAction,
  saveDiagramAction,
} from './actions'
import { type Diagram, emptyDiagram, type Workspace } from './model'
import type { CaptureView } from './WorkspaceCanvas'

export const useWorkspace = (initialWorkspaces: Workspace[]) => {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces)
  const [selectedId, setSelectedId] = useState(initialWorkspaces[0]?.id ?? '')
  const [form, setForm] = useState<'new' | 'edit' | null>(
    initialWorkspaces.length ? null : 'new',
  )
  const [draft, setDraft] = useState(
    initialWorkspaces[0]?.diagram ?? emptyDiagram(),
  )
  const [schemaFilter, setSchemaFilter] = useState('')
  const [showDiff, setShowDiff] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const capture = useRef<CaptureView | null>(null)
  const registerCapture = useCallback((value: CaptureView) => {
    capture.current = value
  }, [])
  const workspace = workspaces.find((item) => item.id === selectedId)
  const updateWorkspace = (updated: Workspace) => {
    setWorkspaces((current) =>
      current.some((item) => item.id === updated.id)
        ? current.map((item) => (item.id === updated.id ? updated : item))
        : [...current, updated],
    )
    setDraft(updated.diagram)
  }
  const capturedDiagram = (next = draft): Diagram => ({
    ...next,
    ...(capture.current?.() ?? {}),
  })
  const persist = async (next = draft) => {
    if (!workspace) return null
    const result = await saveDiagramAction(
      workspace.id,
      capturedDiagram(next),
      workspace.diagramRevision,
    )
    if (!result.ok) {
      setMessage(result.error)
      return null
    }
    updateWorkspace(result.value)
    return result.value
  }
  const handleSave = async (next = draft) => {
    setBusy(true)
    try {
      if (await persist(next)) setMessage('Diagram saved')
    } catch {
      setMessage(
        'Could not reach the app. Your current view is still open; retry saving.',
      )
    } finally {
      setBusy(false)
    }
  }
  const handleRefresh = async () => {
    if (!workspace) return
    setBusy(true)
    setMessage('Refreshing schema...')
    try {
      if (workspace.snapshot && !(await persist())) return
      const result = await refreshAction(workspace.id)
      if (result.ok) {
        updateWorkspace(result.value)
        setMessage('Schema is up to date. Layout and notes preserved.')
      } else {
        setMessage(result.error)
        const latest = await reloadWorkspaceAction(workspace.id)
        if (latest.ok) updateWorkspace(latest.value)
      }
    } catch {
      setMessage('Could not reach the app. The previous ERD is preserved.')
    } finally {
      setBusy(false)
    }
  }
  const handleOpenForm = async (value: 'new' | 'edit') => {
    setBusy(true)
    try {
      if (workspace?.snapshot && !(await persist())) return
      setForm(value)
    } catch {
      setMessage('Could not save the current view. Please retry.')
    } finally {
      setBusy(false)
    }
  }
  return {
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
  }
}
