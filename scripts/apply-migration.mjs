import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnv() {
  const envPath = join(root, '.env')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    env[key] = rest.join('=')
  }
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const serviceRole = env.SERVICE_ROLE_KEY

if (!url || !serviceRole) {
  console.error('Missing VITE_SUPABASE_URL or SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const sql = readFileSync(
  join(root, 'supabase/migrations/20260711000000_auth_stories_sharing.sql'),
  'utf8',
)

const statements = sql
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean)

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function run() {
  for (const statement of statements) {
    const { error } = await supabase.rpc('exec_sql', { query: statement })
    if (error) {
      console.warn('RPC exec_sql unavailable, apply migration manually in Supabase SQL Editor.')
      console.warn(error.message)
      process.exit(1)
    }
  }
  console.log('Migration applied successfully.')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
