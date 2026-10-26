import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { aColumn, aSchema, aTable } from '@liam-hq/schema'
import { afterEach, describe, expect, it } from 'vitest'
import { WorkspaceStore } from './workspaceStore'

const directories: string[] = []
const createStore = () => {
  const directory = mkdtempSync(join(tmpdir(), 'auto-erd-'))
  directories.push(directory)
  const path = join(directory, 'workspace.sqlite')
  const key = randomBytes(32)
  return { store: new WorkspaceStore(path, key), path, key }
}
const connection = {
  name: 'Local',
  host: 'localhost',
  port: 5432,
  database: 'app',
  user: 'reader',
  password: 'test-secret-not-plaintext',
  ssl: false,
}
const initialSchema = aSchema({
  tables: {
    'public.users': aTable({
      name: 'public.users',
      columns: { id: aColumn({ name: 'id' }) },
    }),
  },
})

afterEach(() => {
  for (const path of directories.splice(0))
    rmSync(path, { recursive: true, force: true })
})

describe('durable local workspace', () => {
  it('encrypts credentials, omits them from responses, and survives reopening', () => {
    const { store, path, key } = createStore()
    const saved = store.saveConnection(connection)
    expect(JSON.stringify(saved)).not.toContain(connection.password)
    expect(saved).not.toHaveProperty('password')
    expect(store.credentials(saved.id).password).toBe(connection.password)
    store.close()
    expect(readFileSync(path).includes(Buffer.from(connection.password))).toBe(
      false,
    )
    const reopened = new WorkspaceStore(path, key)
    expect(reopened.credentials(saved.id).password).toBe(connection.password)
    reopened.close()
  })

  it('retains the last successful snapshot and all diagram settings on refresh failure', async () => {
    const { store } = createStore()
    const saved = store.saveConnection(connection)
    await store.refresh(saved.id, async () => initialSchema)
    const view = {
      positions: { 'public.users': { x: 420, y: 180 } },
      hidden: ['public.users'],
      annotations: {
        'public.users': {
          color: '#22c55e',
          group: 'Accounts',
          note: 'Keep me',
        },
      },
      relationships: [],
    }
    store.saveDiagram(saved.id, view, 0)
    const before = store.get(saved.id)
    await expect(
      store.refresh(saved.id, async () => {
        throw new TypeError(connection.password)
      }),
    ).rejects.toThrow('Schema')
    const after = store.get(saved.id)
    expect(after.snapshot).toEqual(before.snapshot)
    expect(after.lastSuccessAt).toBe(before.lastSuccessAt)
    expect(after.diagram).toEqual(view)
    expect(after.lastError).toBeTruthy()
    expect(JSON.stringify(after)).not.toContain(connection.password)
    store.close()
  })

  it('refreshes schema independently of concurrent diagram edits and preserves the baseline', async () => {
    const { store } = createStore()
    const saved = store.saveConnection(connection)
    await store.refresh(saved.id, async () => initialSchema)
    const updated = aSchema({
      tables: {
        ...initialSchema.tables,
        'public.orders': aTable({ name: 'public.orders' }),
      },
    })
    await store.refresh(saved.id, async () => {
      store.saveDiagram(
        saved.id,
        {
          ...store.get(saved.id).diagram,
          positions: { 'public.users': { x: 42, y: 77 } },
        },
        0,
      )
      return updated
    })
    const result = store.get(saved.id)
    expect(result.baseline).toEqual(initialSchema)
    expect(result.snapshot).toEqual(updated)
    expect(result.diagram.positions['public.users']).toEqual({ x: 42, y: 77 })
    expect(() => store.saveDiagram(saved.id, result.diagram, 0)).toThrow(
      'Another',
    )
    store.close()
  })

  it('rejects overlapping refresh and discards results for changed connection settings', async () => {
    const { store } = createStore()
    const saved = store.saveConnection(connection)
    const running = store.refresh(saved.id, async () => {
      await expect(
        store.refresh(saved.id, async () => initialSchema),
      ).rejects.toThrow('progress')
      store.saveConnection({ ...connection, user: 'other' }, saved.id)
      return initialSchema
    })
    await expect(running).rejects.toThrow('Connection settings')
    expect(store.get(saved.id).snapshot).toBeNull()
    store.close()
  })
})

it('lists healthy rows and flags unreadable rows without changing stored data', () => {
  const { store, path } = createStore()
  const good = store.saveConnection(connection)
  const broken = store.saveConnection({ ...connection, name: 'broken' })
  const db = new DatabaseSync(path)
  db.prepare('UPDATE workspaces SET snapshot=? WHERE id=?').run(
    '{bad json',
    broken.id,
  )
  let invalid = 0
  expect(
    store.list(() => {
      invalid += 1
    }),
  ).toEqual([good])
  expect(invalid).toBe(1)
  expect(
    db.prepare('SELECT snapshot FROM workspaces WHERE id=?').get(broken.id)?.[
      'snapshot'
    ],
  ).toBe('{bad json')
  db.close()
  store.close()
})
