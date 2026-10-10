import { readFile, writeFile } from 'node:fs/promises'
import { accessibleReview } from './accessible-review.mjs'
const names = ['idea-flow-field-system-overhaul-2026','idea-flow-five-new-visual-directions-2026','idea-flow-light-systems-2026']
for (const name of names) {
  const input = new URL(`${name}.html`, import.meta.url)
  const output = new URL(`${name}-accessible.html`, import.meta.url)
  await writeFile(output, accessibleReview(await readFile(input, 'utf8')))
  console.log(output.pathname)
}
