'use client'

import { Button, Input } from '@liam-hq/ui'
import { type FormEvent, useId, useState } from 'react'
import { saveConnectionAction, testConnectionAction } from './actions'
import type { ConnectionInput, Workspace } from './model'
import styles from './Workspace.module.css'

type Props = {
  existing?: Workspace
  onSaved: (workspace: Workspace) => void
  onCancel: () => void
}
const readInput = (form: HTMLFormElement): ConnectionInput => {
  const data = new FormData(form)
  const field = (name: string) => String(data.get(name) ?? '')
  return {
    name: field('name'),
    host: field('host'),
    port: Number(field('port')),
    database: field('database'),
    user: field('user'),
    password: field('password'),
    ssl: data.has('ssl'),
  }
}

export const ConnectionForm = ({ existing, onSaved, onCancel }: Props) => {
  const formId = useId()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await saveConnectionAction(
        readInput(event.currentTarget),
        existing?.id,
      )
      if (result.ok) onSaved(result.value)
      else setMessage(result.error)
    } catch {
      setMessage('Could not reach the app. Please retry.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={styles.connectionCard}>
      <h2>{existing ? 'Edit connection' : 'Connect PostgreSQL'}</h2>
      <p className={styles.muted}>
        Save a connection, then refresh to explore its schema. Source databases
        are read only.
      </p>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={busy} className={styles.formGrid}>
          <label htmlFor={`${formId}-name`}>
            Connection name
            <Input
              id={`${formId}-name`}
              name="name"
              defaultValue={existing?.connection.name}
              placeholder="Local development"
              required
              maxLength={256}
            />
          </label>
          <label htmlFor={`${formId}-host`}>
            Host
            <Input
              id={`${formId}-host`}
              name="host"
              defaultValue={existing?.connection.host ?? 'host.docker.internal'}
              required
              readOnly={Boolean(existing)}
            />
          </label>
          <label htmlFor={`${formId}-port`}>
            Port
            <Input
              id={`${formId}-port`}
              name="port"
              type="number"
              min={1}
              max={65535}
              defaultValue={existing?.connection.port ?? 5432}
              required
              readOnly={Boolean(existing)}
            />
          </label>
          <label htmlFor={`${formId}-database`}>
            Database
            <Input
              id={`${formId}-database`}
              name="database"
              defaultValue={existing?.connection.database}
              required
              readOnly={Boolean(existing)}
            />
          </label>
          <label htmlFor={`${formId}-user`}>
            Username
            <Input
              id={`${formId}-user`}
              name="user"
              defaultValue={existing?.connection.user}
              required
              autoComplete="off"
            />
          </label>
          <label htmlFor={`${formId}-password`}>
            Password
            <Input
              id={`${formId}-password`}
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={
                existing ? 'Leave blank to keep current password' : ''
              }
            />
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="ssl"
              defaultChecked={existing?.connection.ssl ?? false}
            />{' '}
            TLS with certificate verification
          </label>
          <div className={styles.actions}>
            <Button
              variant="outline-secondary"
              onClick={async (event) => {
                const form = event.currentTarget.form
                if (!form || !form.reportValidity()) return
                setBusy(true)
                try {
                  const result = await testConnectionAction(
                    readInput(form),
                    existing?.id,
                  )
                  setMessage(result.ok ? result.value : result.error)
                } catch {
                  setMessage('Could not reach the app. Please retry.')
                } finally {
                  setBusy(false)
                }
              }}
            >
              Test connection
            </Button>
            <Button type="submit">Save connection</Button>
            <Button variant="ghost-secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </fieldset>
        <output className={styles.status}>
          {message || (busy ? 'Connecting...' : '')}
        </output>
      </form>
      <p className={styles.muted}>
        For a database on this Mac, use host.docker.internal and its published
        port. Passwords are encrypted on the server.
      </p>
    </section>
  )
}
