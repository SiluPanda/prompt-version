import semver from 'semver'
import type { LifecycleState, GetPromptOptions } from './types'

export function resolveVersion(
  versions: string[],
  range: string | undefined,
  metas: Record<string, { state: LifecycleState }>,
  options: GetPromptOptions
): string | null {
  // Step 1: Filter to only valid semver versions
  const validVersions = versions.filter((v) => semver.valid(v) !== null)

  // Step 2: Filter by lifecycle state
  const allowedStates = new Set<LifecycleState>(['published'])
  if (options.draft) allowedStates.add('draft')
  if (options.deprecated) allowedStates.add('deprecated')
  // 'archived' is never included

  const filtered = validVersions.filter((v) => {
    const meta = metas[v]
    if (!meta) return false
    return allowedStates.has(meta.state)
  })

  if (filtered.length === 0) return null

  // Step 3 & 4: Resolve by range or latest
  const effectiveRange = range ?? '*'
  return semver.maxSatisfying(filtered, effectiveRange)
}
