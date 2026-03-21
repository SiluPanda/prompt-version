import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

import { createRegistry } from '../registry'
import {
  PromptNotFoundError,
  VersionNotFoundError,
  InvalidStateTransitionError,
} from '../errors'

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), `prompt-version-${randomUUID()}-`))
}

let tmpDirs: string[] = []

afterEach(() => {
  for (const dir of tmpDirs) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }
  tmpDirs = []
})

function registry(registryDir: string) {
  return createRegistry({ registryDir, author: 'test-author' })
}

describe('createPrompt + getPrompt basic flow', () => {
  it('creates a prompt and retrieves it by name', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('greet', '1.0.0', 'Hello, world!', {
      state: 'published',
    })

    const result = await reg.getPrompt('greet')
    expect(result.name).toBe('greet')
    expect(result.version).toBe('1.0.0')
    expect(result.content).toBe('Hello, world!')
    expect(result.contentFormat).toBe('text')
    expect(result.metadata.state).toBe('published')
    expect(result.metadata.author).toBe('test-author')
  })

  it('stores and returns the content format correctly', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('md-prompt', '1.0.0', '# Hello', {
      state: 'published',
      format: 'markdown',
    })

    const result = await reg.getPrompt('md-prompt')
    expect(result.contentFormat).toBe('markdown')
    expect(result.content).toBe('# Hello')
  })
})

describe('semver range resolution', () => {
  it('resolves latest when no range given', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('multi', '1.0.0', 'v1', { state: 'published' })
    await reg.createPrompt('multi', '1.1.0', 'v1.1', { state: 'published' })
    await reg.createPrompt('multi', '2.0.0', 'v2', { state: 'published' })

    const result = await reg.getPrompt('multi')
    expect(result.version).toBe('2.0.0')
    expect(result.content).toBe('v2')
  })

  it('resolves with caret range ^1.0.0', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('semver-test', '1.0.0', 'v1.0', { state: 'published' })
    await reg.createPrompt('semver-test', '1.5.0', 'v1.5', { state: 'published' })
    await reg.createPrompt('semver-test', '2.0.0', 'v2.0', { state: 'published' })

    const result = await reg.getPrompt('semver-test', '^1.0.0')
    expect(result.version).toBe('1.5.0')
  })

  it('resolves exact version', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('exact', '1.0.0', 'first', { state: 'published' })
    await reg.createPrompt('exact', '1.1.0', 'second', { state: 'published' })

    const result = await reg.getPrompt('exact', '1.0.0')
    expect(result.version).toBe('1.0.0')
    expect(result.content).toBe('first')
  })
})

describe('lifecycle state machine', () => {
  it('publish() transitions draft -> published', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('lifecycle', '1.0.0', 'content')
    // draft by default — should not be retrievable yet
    await expect(reg.getPrompt('lifecycle')).rejects.toThrow(PromptNotFoundError)

    await reg.publish('lifecycle', '1.0.0')

    const result = await reg.getPrompt('lifecycle')
    expect(result.metadata.state).toBe('published')
  })

  it('publish() throws InvalidStateTransitionError if not draft', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('pub-err', '1.0.0', 'content', { state: 'published' })
    await expect(reg.publish('pub-err', '1.0.0')).rejects.toThrow(InvalidStateTransitionError)
  })

  it('deprecate() transitions published -> deprecated', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('depr', '1.0.0', 'old', { state: 'published' })
    await reg.deprecate('depr', '1.0.0', 'use v2')

    // deprecated not returned by default
    await expect(reg.getPrompt('depr')).rejects.toThrow(PromptNotFoundError)

    // returned when deprecated opt is set
    const result = await reg.getPrompt('depr', undefined, { deprecated: true })
    expect(result.metadata.state).toBe('deprecated')
    expect(result.metadata.notes).toBe('use v2')
  })

  it('deprecate() throws InvalidStateTransitionError if not published', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('depr-err', '1.0.0', 'content') // draft
    await expect(reg.deprecate('depr-err', '1.0.0')).rejects.toThrow(InvalidStateTransitionError)
  })
})

describe('bump()', () => {
  it('creates a new version with incremented semver (patch)', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('bump-test', '1.0.0', 'original', { state: 'published' })

    const newVer = await reg.bump('bump-test', '1.0.0', {
      level: 'patch',
      notes: 'fixed typo',
      state: 'published',
    })

    expect(newVer).toBe('1.0.1')

    const result = await reg.getPrompt('bump-test', '1.0.1')
    expect(result.content).toBe('original')
    expect(result.metadata.notes).toBe('fixed typo')
    expect(result.metadata.state).toBe('published')
  })

  it('creates a new version with incremented semver (minor)', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('bump-minor', '1.0.0', 'content', { state: 'published' })
    const newVer = await reg.bump('bump-minor', '1.0.0', { level: 'minor', state: 'published' })

    expect(newVer).toBe('1.1.0')
  })

  it('creates a new version with incremented semver (major)', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('bump-major', '1.0.0', 'content', { state: 'published' })
    const newVer = await reg.bump('bump-major', '1.0.0', { level: 'major', state: 'published' })

    expect(newVer).toBe('2.0.0')
  })

  it('throws VersionNotFoundError if from version does not exist', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('bump-missing', '1.0.0', 'content', { state: 'published' })
    await expect(
      reg.bump('bump-missing', '9.9.9', { level: 'patch' })
    ).rejects.toThrow(VersionNotFoundError)
  })
})

describe('error cases', () => {
  it('getPrompt throws PromptNotFoundError for missing prompt', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await expect(reg.getPrompt('nonexistent')).rejects.toThrow(PromptNotFoundError)
  })

  it('getPrompt throws PromptNotFoundError with range for missing prompt', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await expect(reg.getPrompt('nonexistent', '^1.0.0')).rejects.toThrow(PromptNotFoundError)
  })

  it('createPrompt throws for invalid semver', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await expect(reg.createPrompt('bad', 'not-a-semver', 'content')).rejects.toThrow()
  })
})

describe('listPrompts()', () => {
  it('returns correct prompt names', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('alpha', '1.0.0', 'a', { state: 'published' })
    await reg.createPrompt('beta', '1.0.0', 'b', { state: 'published' })
    await reg.createPrompt('gamma', '1.0.0', 'g', { state: 'published' })

    const names = await reg.listPrompts()
    expect(names.sort()).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('returns empty array when registry is empty', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    const names = await reg.listPrompts()
    expect(names).toEqual([])
  })
})

describe('draft visibility', () => {
  it('excludes draft versions by default', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('mixed', '1.0.0', 'published content', { state: 'published' })
    await reg.createPrompt('mixed', '2.0.0', 'draft content') // default state=draft

    // should resolve to 1.0.0, not 2.0.0
    const result = await reg.getPrompt('mixed')
    expect(result.version).toBe('1.0.0')
    expect(result.content).toBe('published content')
  })

  it('includes draft versions when draft=true', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('drafty', '1.0.0', 'published', { state: 'published' })
    await reg.createPrompt('drafty', '2.0.0', 'draft content') // draft

    const result = await reg.getPrompt('drafty', undefined, { draft: true })
    expect(result.version).toBe('2.0.0')
    expect(result.content).toBe('draft content')
  })
})

describe('listVersions()', () => {
  it('returns all version directories for a prompt', async () => {
    const dir = makeTmpDir()
    tmpDirs.push(dir)
    const reg = registry(dir)

    await reg.createPrompt('vlist', '1.0.0', 'v1')
    await reg.createPrompt('vlist', '1.1.0', 'v1.1')
    await reg.createPrompt('vlist', '2.0.0', 'v2')

    const versions = await reg.listVersions('vlist')
    expect(versions.sort()).toEqual(['1.0.0', '1.1.0', '2.0.0'])
  })
})
