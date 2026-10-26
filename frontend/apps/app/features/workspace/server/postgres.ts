import { type Schema, schemaSchema } from '@liam-hq/schema'
import { Client } from 'pg'
import * as v from 'valibot'
import { type ConnectionInput, connectionInputSchema } from '../model'

const CATALOG_SQL = `
WITH relations AS (
  SELECT c.oid, quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS name
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND n.nspname <> 'information_schema' AND n.nspname !~ '^pg_'
    AND has_schema_privilege(n.oid, 'USAGE')
), tables AS (
  SELECT r.name, jsonb_build_object(
    'name', r.name, 'comment', obj_description(r.oid, 'pg_class'),
    'columns', COALESCE((SELECT jsonb_object_agg(a.attname, jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
      'default', pg_get_expr(d.adbin, d.adrelid), 'check', NULL,
      'notNull', a.attnotnull, 'comment', col_description(r.oid, a.attnum)
    ) ORDER BY a.attnum) FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped), '{}'::jsonb),
    'constraints', COALESCE((SELECT jsonb_object_agg(k.conname,
      jsonb_build_object('name', k.conname) || CASE k.contype
        WHEN 'c' THEN jsonb_build_object('type', 'CHECK', 'detail', pg_get_constraintdef(k.oid))
        ELSE jsonb_build_object(
          'type', CASE k.contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'u' THEN 'UNIQUE' ELSE 'FOREIGN KEY' END,
          'columnNames', (SELECT jsonb_agg(a.attname ORDER BY keys.ordinality)
            FROM unnest(k.conkey) WITH ORDINALITY keys(attnum, ordinality)
            JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=keys.attnum)
        ) || CASE WHEN k.contype='f' THEN jsonb_build_object(
          'targetTableName', (SELECT quote_ident(n.nspname)||'.'||quote_ident(c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=k.confrelid),
          'targetColumnNames', (SELECT jsonb_agg(a.attname ORDER BY keys.ordinality)
            FROM unnest(k.confkey) WITH ORDINALITY keys(attnum, ordinality)
            JOIN pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=keys.attnum),
          'updateConstraint', CASE k.confupdtype WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT' WHEN 'n' THEN 'SET_NULL' WHEN 'd' THEN 'SET_DEFAULT' ELSE 'NO_ACTION' END,
          'deleteConstraint', CASE k.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT' WHEN 'n' THEN 'SET_NULL' WHEN 'd' THEN 'SET_DEFAULT' ELSE 'NO_ACTION' END
        ) ELSE '{}'::jsonb END END)
      FROM pg_constraint k WHERE k.conrelid=r.oid AND k.contype IN ('p','u','f','c')), '{}'::jsonb),
    'indexes', COALESCE((SELECT jsonb_object_agg(ci.relname, jsonb_build_object(
      'name', ci.relname, 'unique', i.indisunique, 'type', am.amname,
      'columns', (SELECT jsonb_agg(pg_get_indexdef(i.indexrelid, s, true) ORDER BY s) FROM generate_series(1, i.indnkeyatts) s)
    )) FROM pg_index i JOIN pg_class ci ON ci.oid=i.indexrelid JOIN pg_am am ON am.oid=ci.relam WHERE i.indrelid=r.oid), '{}'::jsonb)
  ) AS value FROM relations r
)
SELECT jsonb_build_object('tables', COALESCE(jsonb_object_agg(name, value), '{}'::jsonb), 'enums', '{}'::jsonb, 'extensions', '{}'::jsonb) AS schema FROM tables
`

const createClient = (input: ConnectionInput) => {
  const { host, port, database, user, password, ssl } = v.parse(
    connectionInputSchema,
    input,
  )
  return new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: ssl ? { rejectUnauthorized: true } : false,
    application_name: 'database-auto-erd',
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
    query_timeout: 20000,
    options: '-c default_transaction_read_only=on',
  })
}

export const collectSchema = async (
  input: ConnectionInput,
): Promise<Schema> => {
  const client = createClient(input)
  try {
    await client.connect()
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const result = await client.query<{ schema: unknown }>(CATALOG_SQL)
    const schema = v.parse(schemaSchema, result.rows[0]?.schema)
    await client.query('COMMIT')
    return schema
  } finally {
    await client.end()
  }
}

export const testConnection = async (input: ConnectionInput): Promise<void> => {
  const client = createClient(input)
  try {
    await client.connect()
    await client.query('SELECT current_database()')
  } finally {
    await client.end()
  }
}
