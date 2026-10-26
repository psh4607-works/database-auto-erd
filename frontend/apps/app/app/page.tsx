import { getWorkspaceStore } from '../features/workspace/server/service'
import { WorkspaceApp } from '../features/workspace/WorkspaceApp'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <WorkspaceApp initialWorkspaces={getWorkspaceStore().list()} />
}
