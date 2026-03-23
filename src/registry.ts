import semver from 'semver'
import type {
  RegistryConfig,
  PromptRegistry,
  ResolvedPrompt,
  CreatePromptOptions,
  GetPromptOptions,
  BumpOptions,
  VersionMetadata,
} from './types'
import {
  PromptNotFoundError,
  VersionNotFoundError,
  InvalidStateTransitionError,
} from './errors'
import {
  promptDir,
  versionDir,
  writeContent,
  readContent,
  writeMeta,
  readMeta,
  listVersionDirs,
  listPromptDirs,
} from './storage'
import { resolveVersion } from './resolve'
import { existsSync } from 'fs'

export function createRegistry(config: RegistryConfig): PromptRegistry {
  const { registryDir, format: defaultFormat = 'text', author: defaultAuthor = '' } = config

  return {
    async getPrompt(
      name: string,
      range?: string,
      options: GetPromptOptions = {}
    ): Promise<ResolvedPrompt> {
      const pDir = promptDir(registryDir, name)
      if (!existsSync(pDir)) {
        throw new PromptNotFoundError(name, range)
      }

      const versions = listVersionDirs(registryDir, name)
      const metas: Record<string, { state: import('./types').LifecycleState }> = {}
      for (const v of versions) {
        try {
          const meta = readMeta(registryDir, name, v)
          metas[v] = { state: meta.state }
        } catch {
          // skip versions with missing/corrupt meta
        }
      }

      const resolved = resolveVersion(versions, range, metas, options)
      if (!resolved) {
        throw new PromptNotFoundError(name, range)
      }

      const { content, format } = readContent(registryDir, name, resolved)
      const metadata = readMeta(registryDir, name, resolved)

      return {
        name,
        version: resolved,
        content,
        contentFormat: format,
        metadata,
      }
    },

    async createPrompt(
      name: string,
      version: string,
      content: string,
      options: CreatePromptOptions = {}
    ): Promise<void> {
      if (!semver.valid(version)) {
        throw new Error(`Invalid semver version: "${version}"`)
      }

      const format = options.format ?? defaultFormat
      const author = options.author ?? defaultAuthor

      writeContent(registryDir, name, version, content, format)

      const meta: VersionMetadata = {
        state: options.state ?? 'draft',
        createdAt: new Date().toISOString(),
        author,
        ...(options.tags !== undefined && { tags: options.tags }),
        ...(options.notes !== undefined && { notes: options.notes }),
      }
      writeMeta(registryDir, name, version, meta)
    },

    async listPrompts(): Promise<string[]> {
      return listPromptDirs(registryDir)
    },

    async listVersions(name: string): Promise<string[]> {
      return listVersionDirs(registryDir, name)
    },

    async bump(name: string, from: string, options: BumpOptions): Promise<string> {
      const vDir = versionDir(registryDir, name, from)
      if (!existsSync(vDir)) {
        throw new VersionNotFoundError(name, from)
      }

      const newVersion = semver.inc(from, options.level)
      if (!newVersion) {
        throw new Error(`Could not increment version "${from}" with level "${options.level}"`)
      }

      const { content, format } = readContent(registryDir, name, from)
      const oldMeta = readMeta(registryDir, name, from)

      writeContent(registryDir, name, newVersion, content, format)

      const newMeta: VersionMetadata = {
        ...oldMeta,
        state: options.state ?? 'draft',
        createdAt: new Date().toISOString(),
        author: options.author ?? oldMeta.author,
        ...(options.notes !== undefined && { notes: options.notes }),
      }
      writeMeta(registryDir, name, newVersion, newMeta)

      return newVersion
    },

    async publish(name: string, version: string): Promise<void> {
      const vDir = versionDir(registryDir, name, version)
      if (!existsSync(vDir)) {
        throw new VersionNotFoundError(name, version)
      }

      const meta = readMeta(registryDir, name, version)
      if (meta.state !== 'draft') {
        throw new InvalidStateTransitionError(meta.state, 'published')
      }

      writeMeta(registryDir, name, version, { ...meta, state: 'published' })
    },

    async deprecate(name: string, version: string, notes?: string): Promise<void> {
      const vDir = versionDir(registryDir, name, version)
      if (!existsSync(vDir)) {
        throw new VersionNotFoundError(name, version)
      }

      const meta = readMeta(registryDir, name, version)
      if (meta.state !== 'published') {
        throw new InvalidStateTransitionError(meta.state, 'deprecated')
      }

      writeMeta(registryDir, name, version, {
        ...meta,
        state: 'deprecated',
        ...(notes !== undefined && { notes }),
      })
    },
  }
}
