import { readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
const manifest = JSON.parse(await readFile(new URL('../dist/.vite/manifest.json', import.meta.url), 'utf8'))
function dependencies(key, found = new Set()) {
  if (found.has(key)) return found
  if (!manifest[key]) throw new Error(`Missing bundle entry: ${key}`)
  found.add(key)
  for (const dependency of manifest[key].imports || []) dependencies(dependency, found)
  return found
}
async function measure(keys) {
  const entries = []
  for (const key of keys) {
    const file = manifest[key].file
    const contents = await readFile(new URL(`../dist/${file}`, import.meta.url))
    entries.push({ file, bytes: contents.length, gzipBytes: gzipSync(contents).length })
  }
  return { chunks: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0), gzipBytes: entries.reduce((sum, entry) => sum + entry.gzipBytes, 0), files: entries }
}
const result = {
  login: await measure(dependencies('index.html')),
  authorizedLayout: await measure(dependencies('src/pages/LayoutPage.jsx')),
  baseline: { loginBytes: 359949, authorizedLayoutBytes: 520551, authorizedLayoutGzipBytes: 147477 },
}
// Initial authenticated view must stay below the pre-cleanup measurement.
if (result.authorizedLayout.bytes >= result.baseline.authorizedLayoutBytes) throw new Error('Initial authenticated JavaScript exceeds the recorded baseline')
if (result.login.bytes > result.baseline.loginBytes * 1.1) throw new Error('Login JavaScript exceeds its 10% growth budget')
console.log(JSON.stringify(result, null, 2))
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(result, null, 2) + '\n')
