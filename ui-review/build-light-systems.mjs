import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, 'light-systems-2026.src.html')
const out = resolve(here, 'idea-flow-light-systems-2026.html')
const assets = resolve(here, 'audit-2026-08/web')

let html = await readFile(src, 'utf8')
const names = [...html.matchAll(/\{\{img:([a-z0-9-]+)\}\}/g)].map(m => m[1])
const uniq = [...new Set(names)]

for (const n of uniq) {
  const buf = await readFile(resolve(assets, `${n}.jpg`))
  const uri = `data:image/jpeg;base64,${buf.toString('base64')}`
  html = html.replaceAll(`{{img:${n}}}`, uri)
  console.log(`  embedded ${n}.jpg  ${(buf.length / 1024).toFixed(0)}KB`)
}

const left = html.match(/\{\{img:[a-z0-9-]+\}\}/g)
if (left) throw new Error(`unresolved placeholders: ${[...new Set(left)].join(', ')}`)

await writeFile(out, html)
console.log(`\n✓ ${out}\n  ${(html.length / 1024 / 1024).toFixed(2)} MB · ${uniq.length} images inlined`)
