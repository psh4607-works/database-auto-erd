'use server'

import * as v from 'valibot'
import {
  type ActionResult,
  type ConnectionInput,
  connectionInputSchema,
  type Diagram,
  type Workspace,
} from './model'
import { collectSchema, testConnection } from './server/postgres'
import { getWorkspaceStore } from './server/service'
import { WorkspaceError } from './server/workspaceStore'

const attempt = async <T>(
  operation: () => T | Promise<T>,
): Promise<ActionResult<T>> => {
  try {
    if (process.env.ERD_LOCAL_ONLY !== '1')
      throw new WorkspaceError('Local workspace is disabled.')
    return { ok: true, value: await operation() }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof WorkspaceError
          ? error.message
          : 'Operation failed. Check connection settings, access permissions and local storage.',
    }
  }
}

export const saveConnectionAction = async (
  input: ConnectionInput,
  id?: string,
) => attempt(() => getWorkspaceStore().saveConnection(input, id))
export const testConnectionAction = async (
  input: ConnectionInput,
  id?: string,
) =>
  attempt(async () => {
    const parsed = v.parse(connectionInputSchema, input)
    await testConnection(
      id && !parsed.password
        ? { ...parsed, password: getWorkspaceStore().credentials(id).password }
        : parsed,
    )
    return 'Connection successful'
  })
export const saveDiagramAction = async (
  id: string,
  diagram: Diagram,
  revision: number,
): Promise<ActionResult<Workspace>> =>
  attempt(() => getWorkspaceStore().saveDiagram(id, diagram, revision))
export const refreshAction = async (
  id: string,
): Promise<ActionResult<Workspace>> =>
  attempt(() => getWorkspaceStore().refresh(id, collectSchema))
export const reloadWorkspaceAction = async (
  id: string,
): Promise<ActionResult<Workspace>> =>
  attempt(() => getWorkspaceStore().get(id))
