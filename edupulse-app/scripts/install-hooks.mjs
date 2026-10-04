// Points this clone at the versioned hooks in .githooks, so every commit runs the
// documentation check (feature-documentation/DOCUMENTATION-POLICY.md). Runs on `npm install`.
import { execFileSync } from 'node:child_process'

if (process.env.CI || process.env.VERCEL) process.exit(0)
try {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: root })
  console.log('Git hooks enabled: .githooks/commit-msg runs the documentation check on every commit.')
} catch {
  // Not a git checkout (for example an extracted archive); nothing to install.
}
