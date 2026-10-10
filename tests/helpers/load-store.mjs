import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// Node needs explicit extensions. Rewrite imports only in a disposable copy;
// production source is unchanged and the real Supabase module is never loaded.
export async function loadFixtureStore() {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const temporary = await mkdtemp(resolve(root, 'tests/.store-baseline-'))
  try {
    let source = await readFile(resolve(root, 'src/lib/store.js'), 'utf8')
    const replacements = [
      ["from './validation.js'", `from '${pathToFileURL(resolve(root, 'src/lib/validation.js')).href}'`],
      ["from './pagination.js'", `from '${pathToFileURL(resolve(root, 'src/lib/pagination.js')).href}'`],
      ["from './history.js'", `from '${pathToFileURL(resolve(root, 'src/lib/history.js')).href}'`],
      ["from './storage.js'", `from '${pathToFileURL(resolve(root, 'src/lib/storage.js')).href}'`],
      ["from './drafts.js'", `from '${pathToFileURL(resolve(root, 'src/lib/drafts.js')).href}'`],
      ["from './supabase'", `from '${pathToFileURL(resolve(root, 'tests/helpers/mock-supabase.js')).href}'`],
    ]
    for (const [before, after] of replacements) {
      if (!source.includes(before)) throw new Error(`Store test loader needs updating: ${before}`)
      source = source.replace(before, after)
    }
    const target = resolve(temporary, 'store.mjs')
    await writeFile(target, source)
    return await import(pathToFileURL(target).href)
  } finally { await rm(temporary, { recursive: true, force: true }) }
}
