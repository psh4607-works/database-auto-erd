import { Client } from 'pg'
import { describe, expect, it } from 'vitest'
import { collectSchema } from './postgres'

const connectionString = process.env['ERD_TEST_DATABASE_URL']
describe.skipIf(!connectionString)('PostgreSQL catalog collection', () => {
  it('reads qualified tables, ordered composite keys and comments without mutating the source', async () => {
    const admin = new Client({ connectionString })
    await admin.connect()
    try {
      await admin.query(`CREATE SCHEMA IF NOT EXISTS erd_test;
        DROP TABLE IF EXISTS erd_test.child; DROP TABLE IF EXISTS erd_test.parent;
        CREATE TABLE erd_test.parent (tenant integer, id integer, title text, PRIMARY KEY (tenant, id));
        CREATE TABLE erd_test.child (tenant integer, parent_id integer, FOREIGN KEY (tenant, parent_id) REFERENCES erd_test.parent(tenant, id));
        COMMENT ON TABLE erd_test.parent IS 'Parent description';
        COMMENT ON COLUMN erd_test.parent.title IS 'Display title';`)
      const url = new URL(connectionString ?? '')
      const schema = await collectSchema({
        name: 'fixture',
        host: url.hostname,
        port: Number(url.port),
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: false,
      })
      expect(schema.tables['erd_test.parent']?.comment).toBe(
        'Parent description',
      )
      expect(schema.tables['erd_test.parent']?.columns['title']?.comment).toBe(
        'Display title',
      )
      expect(
        schema.tables['erd_test.parent']?.constraints['parent_pkey'],
      ).toMatchObject({ type: 'PRIMARY KEY', columnNames: ['tenant', 'id'] })
      expect(
        Object.values(schema.tables['erd_test.child']?.constraints ?? {}),
      ).toContainEqual(
        expect.objectContaining({
          type: 'FOREIGN KEY',
          columnNames: ['tenant', 'parent_id'],
          targetTableName: 'erd_test.parent',
          targetColumnNames: ['tenant', 'id'],
        }),
      )
      expect(
        Object.keys(schema.tables).some((name) =>
          name.startsWith('pg_catalog.'),
        ),
      ).toBe(false)
    } finally {
      await admin.end()
    }
  })
})
