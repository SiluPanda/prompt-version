import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import type { VersionMetadata, ContentFormat } from './types'
import { PromptVersionError } from './errors'

export function promptDir(registryDir: string, name: string): string {
  return join(registryDir, name)
}

export function versionDir(registryDir: string, name: string, version: string): string {
  return join(registryDir, name, version)
}

const FORMAT_EXT: Record<ContentFormat, string> = {
  text: 'content.txt',
  markdown: 'content.md',
  json: 'content.json',
}

export function writeContent(
  registryDir: string,
  name: string,
  version: string,
  content: string,
  format: ContentFormat
): void {
  const dir = versionDir(registryDir, name, version)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const filename = FORMAT_EXT[format]
  writeFileSync(join(dir, filename), content, 'utf-8')
}

export function readContent(
  registryDir: string,
  name: string,
  version: string
): { content: string; format: ContentFormat } {
  const dir = versionDir(registryDir, name, version)
  const entries: [ContentFormat, string][] = [
    ['text', FORMAT_EXT.text],
    ['markdown', FORMAT_EXT.markdown],
    ['json', FORMAT_EXT.json],
  ]
  for (const [format, filename] of entries) {
    const filepath = join(dir, filename)
    if (existsSync(filepath)) {
      return { content: readFileSync(filepath, 'utf-8'), format }
    }
  }
  throw new PromptVersionError(`No content file found in ${dir}`, 'CONTENT_NOT_FOUND')
}

export function writeMeta(
  registryDir: string,
  name: string,
  version: string,
  meta: VersionMetadata
): void {
  const dir = versionDir(registryDir, name, version)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8')
}

export function readMeta(registryDir: string, name: string, version: string): VersionMetadata {
  const filepath = join(versionDir(registryDir, name, version), 'meta.json')
  return JSON.parse(readFileSync(filepath, 'utf-8')) as VersionMetadata
}

export function listVersionDirs(registryDir: string, name: string): string[] {
  const dir = promptDir(registryDir, name)
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory()
  })
}

export function listPromptDirs(registryDir: string): string[] {
  if (!existsSync(registryDir)) return []
  return readdirSync(registryDir).filter((entry) => {
    const full = join(registryDir, entry)
    return statSync(full).isDirectory()
  })
}
