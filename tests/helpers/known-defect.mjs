import assert from 'node:assert/strict'

// Keep correct-behavior assertions visible as TODO failures. Unexpected passes
// fail the baseline so a repaired behavior must be promoted to a normal test.
export async function knownDefect(t, reason, check) {
  const strict = process.env.BASELINE_STRICT === '1'
  try { await check() }
  catch (error) {
    if (!strict && error instanceof assert.AssertionError) t.todo(reason)
    throw error
  }
  if (!strict) assert.fail('Known defect no longer reproduces: remove knownDefect and retain the assertion.')
}
