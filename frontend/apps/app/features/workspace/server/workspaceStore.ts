import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { type Schema, schemaSchema } from '@liam-hq/schema'
import * as v from 'valibot'
import {
  type ConnectionInput,
  connectionInputSchema,
  type Diagram,
  diagramSchema,
  emptyDiagram,
  type Workspace,
  workspaceSchema,
} from '../model'

export class WorkspaceError extends Error {}
const REFRESH_ERROR =
  'Schema refresh failed. Check connection settings and database permissions. The last successful ERD is preserved.'

export class WorkspaceStore {
  private readonly db: DatabaseSync
  private readonly key: Buffer
  private readonly refreshing = new Set<string>()

  constructor(path: string, key: Buffer) {
    if (key.length !== 32)
      throw new TypeError('Encryption key must be 32 bytes')
    this.key = key
    this.db = new DatabaseSync(path)
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY, connection TEXT NOT NULL, secret TEXT NOT NULL,
        config_revision INTEGER NOT NULL DEFAULT 0,
        diagram TEXT NOT NULL, diagram_revision INTEGER NOT NULL DEFAULT 0,
        snapshot TEXT, baseline TEXT, last_success_at TEXT, last_error TEXT
      )`)
  }

  close() {
    this.db.close()
  }

  private seal(password: string, id: string) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    cipher.setAAD(Buffer.from(id))
    const encrypted = Buffer.concat([
      cipher.update(password, 'utf8'),
      cipher.final(),
    ])
    return [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64'))
      .join('.')
  }

  private unseal(secret: string, id: string) {
    const [iv, tag, body] = secret
      .split('.')
      .map((part) => Buffer.from(part, 'base64'))
    if (!iv || !tag || !body)
      throw new TypeError('Invalid encrypted credential')
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
    decipher.setAAD(Buffer.from(id))
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(body), decipher.final()]).toString(
      'utf8',
    )
  }

  list(): Workspace[] {
    return this.db
      .prepare('SELECT id FROM workspaces ORDER BY rowid')
      .all()
      .map((row) => this.get(v.parse(v.string(), row['id'])))
  }

  get(id: string): Workspace {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id)
    if (!row) throw new WorkspaceError('Saved connection not found.')
    const json = (value: unknown) =>
      typeof value === 'string' ? JSON.parse(value) : null
    return v.parse(workspaceSchema, {
      id,
      connection: json(row['connection']),
      configRevision: row['config_revision'],
      diagramRevision: row['diagram_revision'],
      diagram: json(row['diagram']),
      snapshot: json(row['snapshot']),
      baseline: json(row['baseline']),
      lastSuccessAt: row['last_success_at'],
      lastError: row['last_error'],
    })
  }

  credentials(id: string): ConnectionInput {
    const { connection } = this.get(id)
    const row = this.db
      .prepare('SELECT secret FROM workspaces WHERE id = ?')
      .get(id)
    const secret = v.parse(v.string(), row?.['secret'])
    return { ...connection, password: this.unseal(secret, id) }
  }

  saveConnection(input: ConnectionInput, existingId?: string): Workspace {
    const parsed = v.parse(connectionInputSchema, input)
    const id = existingId ?? randomUUID()
    const { password, ...connection } = parsed
    const effectivePassword =
      existingId && !password ? this.credentials(existingId).password : password
    const secret = this.seal(effectivePassword, id)
    if (existingId) {
      const previous = this.get(id)
      if (
        previous.connection.host !== connection.host ||
        previous.connection.port !== connection.port ||
        previous.connection.database !== connection.database
      ) {
        throw new WorkspaceError(
          'Register a different database as a new connection to keep its ERD separate.',
        )
      }
      this.db
        .prepare(
          'UPDATE workspaces SET connection=?, secret=?, config_revision=config_revision+1 WHERE id=?',
        )
        .run(JSON.stringify(connection), secret, id)
    } else {
      this.db
        .prepare(
          'INSERT INTO workspaces (id, connection, secret, diagram) VALUES (?, ?, ?, ?)',
        )
        .run(
          id,
          JSON.stringify(connection),
          secret,
          JSON.stringify(emptyDiagram()),
        )
    }
    return this.get(id)
  }

  saveDiagram(id: string, diagram: Diagram, revision: number): Workspace {
    const parsed = v.parse(diagramSchema, diagram)
    const result = this.db
      .prepare(
        'UPDATE workspaces SET diagram=?, diagram_revision=diagram_revision+1 WHERE id=? AND diagram_revision=?',
      )
      .run(JSON.stringify(parsed), id, revision)
    if (!result.changes)
      throw new WorkspaceError(
        'Another window changed this diagram. Reload the page before saving.',
      )
    return this.get(id)
  }

  async refresh(
    id: string,
    collect: (input: ConnectionInput) => Promise<Schema>,
  ): Promise<Workspace> {
    if (this.refreshing.has(id))
      throw new WorkspaceError('A refresh is already in progress.')
    const previous = this.get(id)
    this.refreshing.add(id)
    try {
      const schema = v.parse(schemaSchema, await collect(this.credentials(id)))
      const result = this.db
        .prepare(`UPDATE workspaces SET baseline=snapshot, snapshot=?, last_success_at=?, last_error=NULL
        WHERE id=? AND config_revision=?`)
        .run(
          JSON.stringify(schema),
          new Date().toISOString(),
          id,
          previous.configRevision,
        )
      if (!result.changes)
        throw new WorkspaceError('Connection settings changed. Refresh again.')
      return this.get(id)
    } catch (error) {
      const safeMessage =
        error instanceof WorkspaceError ? error.message : REFRESH_ERROR
      this.db
        .prepare(
          'UPDATE workspaces SET last_error=? WHERE id=? AND config_revision=?',
        )
        .run(safeMessage, id, previous.configRevision)
      throw new WorkspaceError(safeMessage)
    } finally {
      this.refreshing.delete(id)
    }
  }
}
