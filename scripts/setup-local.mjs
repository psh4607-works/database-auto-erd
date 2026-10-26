import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const directory = fileURLToPath(new URL('../.local/', import.meta.url))
const keyPath = fileURLToPath(new URL('../.local/credential-key', import.meta.url))
mkdirSync(directory, { recursive: true, mode: 0o700 })
if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { mode: 0o600, flag: 'wx' })
chmodSync(keyPath, 0o600)
console.log('Local encryption key is ready. Keep this file when rebuilding or moving the workspace.')
