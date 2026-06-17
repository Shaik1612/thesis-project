import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const failures = []
const warnings = []

function fail(message) {
  failures.push(message)
}

function warn(message) {
  warnings.push(message)
}

function assertExists(path, label = path) {
  if (!existsSync(join(root, path))) fail(`Missing ${label}: ${path}`)
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', '.claude', '.impeccable'].includes(entry)) continue
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, files)
    else files.push(path)
  }
  return files
}

assertExists('package.json')
assertExists('package-lock.json')
assertExists('index.html')
assertExists('src/main.jsx')
assertExists('src/App.jsx')
assertExists('src/lib/supabase.js')
assertExists('supabase/config.toml')
assertExists('supabase/seed.sql')
assertExists('.env.example')

const sourceFiles = walk(root).filter(path => /\.(js|jsx|ts|tsx|sql|css|html|md|json)$/.test(path))

for (const path of sourceFiles) {
  const body = readFileSync(path, 'utf8')
  const name = relative(root, path)
  if (/^(<<<<<<<|=======|>>>>>>>)(?:\s|$)/m.test(body)) {
    fail(`Conflict marker found in ${name}`)
  }
  if (body.includes('VITE_SUPABASE_URL=https://your-project.supabase.co') && name !== '.env.example') {
    warn(`Placeholder Supabase URL appears outside .env.example in ${name}`)
  }
}

const gitignore = readFileSync(join(root, '.gitignore'), 'utf8')
for (const ignoredPath of ['node_modules/', 'dist/', '.env', '.env.production']) {
  if (!gitignore.includes(ignoredPath)) warn(`.gitignore does not mention ${ignoredPath}`)
}

const migrationsDir = join(root, 'supabase/migrations')
if (existsSync(migrationsDir)) {
  const migrations = readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort()
  for (let index = 1; index < migrations.length; index += 1) {
    const prev = Number(migrations[index - 1].slice(0, 3))
    const curr = Number(migrations[index].slice(0, 3))
    if (Number.isFinite(prev) && Number.isFinite(curr) && curr <= prev) {
      fail(`Migration order is not increasing around ${migrations[index - 1]} and ${migrations[index]}`)
    }
  }
}

if (warnings.length) {
  console.log('Warnings:')
  for (const message of warnings) console.log(`- ${message}`)
}

if (failures.length) {
  console.error('Project check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log(`Project check passed (${sourceFiles.length} source/config files scanned).`)
