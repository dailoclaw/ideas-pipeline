import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const levels = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }
export function reviewAudit(report, baseline, now = new Date()) {
  const failures = []
  if (!report || report.error || !report.metadata?.vulnerabilities || !report.vulnerabilities || Array.isArray(report.vulnerabilities)) throw new Error('Invalid or failed npm audit report')
  if (baseline?.schemaVersion !== 1 || !baseline.allowed || !/^\d{4}-\d{2}-\d{2}$/.test(baseline.reviewValidThrough || '')) throw new Error('Invalid dependency review baseline')
  const expiry = new Date(baseline.reviewValidThrough + 'T00:00:00Z')
  if (!Number.isFinite(expiry.getTime()) || expiry.toISOString().slice(0, 10) !== baseline.reviewValidThrough) throw new Error('Invalid dependency review expiry')
  if (!Number.isFinite(now.getTime()) || now.toISOString().slice(0, 10) > baseline.reviewValidThrough) failures.push('Dependency review expired; inspect the current feed and renew the reviewed baseline explicitly')
  const summary = Object.fromEntries(Object.keys(levels).map(k => [k, 0]))
  for (const [name, finding] of Object.entries(report.vulnerabilities)) {
    if (!finding || finding.name !== name || !(Object.hasOwn(levels, finding.severity)) || !Array.isArray(finding.via) || typeof finding.isDirect !== 'boolean' || !Array.isArray(finding.nodes) || !finding.nodes.length) throw new Error(`Invalid vulnerability record: ${name}`)
    summary[finding.severity]++
    const allowed = Object.hasOwn(baseline.allowed, name) ? baseline.allowed[name] : null
    if (!allowed || !(Object.hasOwn(levels, allowed.severity)) || !Array.isArray(allowed.advisories)) { failures.push(`Unreviewed affected package: ${name}`); continue }
    if (levels[finding.severity] > levels[allowed.severity]) failures.push(`Worsened severity: ${name} (${finding.severity})`)
    for (const via of finding.via) {
      if (typeof via === 'string') {
        if (!Object.hasOwn(report.vulnerabilities, via) || !allowed.advisories.some(x => x.dependency === via)) failures.push(`Unreviewed dependency chain: ${name} -> ${via}`)
      } else if (!via || !(Object.hasOwn(levels, via.severity)) || typeof via.url !== 'string' || typeof via.range !== 'string') {
        throw new Error(`Invalid advisory: ${name}`)
      } else if (!allowed.advisories.some(x => x.url === via.url && x.range === via.range && levels[via.severity] <= levels[x.severity])) {
        failures.push(`New or changed advisory: ${name} (${via.url})`)
      }
    }
    if (!finding.via.length) failures.push(`Missing advisory chain: ${name}`)
  }
  for (const severity of Object.keys(levels)) if (report.metadata.vulnerabilities[severity] !== summary[severity]) throw new Error('Audit summary disagrees with vulnerability records')
  if (report.metadata.vulnerabilities.total !== Object.keys(report.vulnerabilities).length) throw new Error('Audit total disagrees with vulnerability records')
  return { failures, affectedPackages: Object.keys(report.vulnerabilities).length, reviewedThrough: baseline.reviewValidThrough }
}
export function reviewDevelopmentPaths(report, lock) {
  const failures = []
  for (const [name, finding] of Object.entries(report.vulnerabilities)) {
    if (finding.nodes.some(path => !Object.hasOwn(lock.packages || {}, path) || lock.packages[path].dev !== true)) failures.push(`Reviewed build finding appears outside a development-only lockfile path: ${name}`)
  }
  return failures
}
export async function main() {
  const baseline = JSON.parse(await readFile(new URL('../docs/dependency-review-baseline.json', import.meta.url), 'utf8'))
  if (process.platform === 'win32' && !process.env.npm_execpath) throw new Error('Run through npm run check:dependencies so the npm CLI path is available')
  const command = process.env.npm_execpath ? process.execPath : 'npm'
  const args = process.env.npm_execpath ? [process.env.npm_execpath, 'audit', '--json'] : ['audit', '--json']
  const run = spawnSync(command, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 })
  if (run.error || run.signal || ![0, 1].includes(run.status)) throw new Error('npm audit failed or timed out; no successful dependency review recorded')
  const report = JSON.parse(run.stdout)
  const result = reviewAudit(report, baseline)
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'))
  result.failures.push(...reviewDevelopmentPaths(report, lock))
  console.log(`Full dependency audit: ${result.affectedPackages} affected packages; review valid through ${result.reviewedThrough}. Existing findings remain unresolved.`)
  if (result.failures.length) throw new Error(result.failures.join('\n'))
  console.log('No unreviewed or worsened findings. Production-only audit remains a separate required CI check.')
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
