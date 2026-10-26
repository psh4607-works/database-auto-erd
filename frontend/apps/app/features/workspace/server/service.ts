import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WorkspaceStore } from './workspaceStore'

let store: WorkspaceStore | undefined
export const getWorkspaceStore = () => {
  if (store) return store
  const directory = process.env['ERD_DATA_DIR']
  const keyFile = process.env['ERD_KEY_FILE']
  if (!directory || !keyFile)
    throw new TypeError('ERD_DATA_DIR and ERD_KEY_FILE are required')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  store = new WorkspaceStore(
    join(directory, 'workspace.sqlite'),
    readFileSync(keyFile),
  )
  return store
}
