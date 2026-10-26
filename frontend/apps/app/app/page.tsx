import { notFound } from 'next/navigation'
import { getWorkspaceStore } from '../features/workspace/server/service'
import { WorkspaceApp } from '../features/workspace/WorkspaceApp'

export const dynamic = 'force-dynamic'

export default function Page() {
  if (process.env.ERD_LOCAL_ONLY !== '1') notFound()
  let unreadableCount = 0
  const workspaces = getWorkspaceStore().list(() => {
    unreadableCount += 1
  })
  return (
    <WorkspaceApp
      initialWorkspaces={workspaces}
      unreadableCount={unreadableCount}
    />
  )
}
