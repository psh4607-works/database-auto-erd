import { afterEach, expect, it, vi } from 'vitest'
import { reloadWorkspaceAction, testConnectionAction } from './actions'
import { testConnection } from './server/postgres'
import { getWorkspaceStore } from './server/service'

vi.mock('./server/postgres', () => ({
  collectSchema: vi.fn(),
  testConnection: vi.fn(),
}))
vi.mock('./server/service', () => ({ getWorkspaceStore: vi.fn() }))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})
it('rejects network and storage actions before access outside local mode', async () => {
  vi.stubEnv('ERD_LOCAL_ONLY', '0')
  const input = {
    name: 'test',
    host: 'localhost',
    port: 5432,
    database: 'test',
    user: 'test',
    password: '',
    ssl: false,
  }
  expect(await testConnectionAction(input)).toEqual({
    ok: false,
    error: 'Local workspace is disabled.',
  })
  expect(await reloadWorkspaceAction('any')).toEqual({
    ok: false,
    error: 'Local workspace is disabled.',
  })
  expect(testConnection).not.toHaveBeenCalled()
  expect(getWorkspaceStore).not.toHaveBeenCalled()
})
