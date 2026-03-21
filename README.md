# prompt-version

Local-first, git-friendly prompt versioning with semver.

Store, version, and manage LLM prompts on the filesystem with full semver range resolution and lifecycle state management.

## Install

```bash
npm install prompt-version
```

## Quick Start

```typescript
import { createRegistry } from 'prompt-version'

const registry = createRegistry({ registryDir: './prompts', author: 'alice' })

// Create a prompt at version 1.0.0 (defaults to 'draft' state)
await registry.createPrompt('greet', '1.0.0', 'Hello, {{name}}!')

// Publish it so it is visible to normal consumers
await registry.publish('greet', '1.0.0')

// Retrieve the latest published version
const prompt = await registry.getPrompt('greet')
console.log(prompt.content)   // "Hello, {{name}}!"
console.log(prompt.version)   // "1.0.0"

// Retrieve with a semver range
const compat = await registry.getPrompt('greet', '^1.0.0')

// Bump to a new patch version
const newVer = await registry.bump('greet', '1.0.0', { level: 'patch', notes: 'typo fix' })
// newVer === '1.0.1'
```

## API

### `createRegistry(config: RegistryConfig): PromptRegistry`

Creates a registry backed by the local filesystem.

| Option | Type | Default | Description |
|---|---|---|---|
| `registryDir` | `string` | required | Path to the directory where prompts are stored |
| `format` | `ContentFormat` | `'text'` | Default content format |
| `author` | `string` | `''` | Default author name for new prompts |

### `registry.createPrompt(name, version, content, options?)`

Creates a new prompt version on disk.

- `name` — prompt identifier
- `version` — must be valid semver (e.g. `'1.0.0'`)
- `content` — raw prompt string
- `options.state` — initial lifecycle state (default: `'draft'`)
- `options.format` — `'text' | 'markdown' | 'json'`
- `options.author`, `options.tags`, `options.notes`

### `registry.getPrompt(name, range?, options?)`

Resolves and returns a prompt. Throws `PromptNotFoundError` if nothing matches.

- `range` — optional semver range (e.g. `'^1.0.0'`, `'~2.1.0'`, `'1.0.0'`). Omit for latest.
- `options.draft` — include `'draft'` versions in resolution
- `options.deprecated` — include `'deprecated'` versions in resolution

### `registry.bump(name, from, options): Promise<string>`

Creates a new version derived from `from` using `options.level` (`'major' | 'minor' | 'patch'`). Returns the new version string.

### `registry.publish(name, version)`

Transitions a version from `'draft'` to `'published'`. Throws `InvalidStateTransitionError` otherwise.

### `registry.deprecate(name, version, notes?)`

Transitions a version from `'published'` to `'deprecated'`. Throws `InvalidStateTransitionError` otherwise.

### `registry.listPrompts(): Promise<string[]>`

Lists all prompt names in the registry.

### `registry.listVersions(name): Promise<string[]>`

Lists all version strings for a given prompt.

## Lifecycle States

```
draft → published → deprecated
                 ↘ archived (manual only)
```

| State | Visible by default | Description |
|---|---|---|
| `draft` | No | Work in progress |
| `published` | Yes | Active, production-ready |
| `deprecated` | No | Superseded; opt-in via `{ deprecated: true }` |
| `archived` | Never | Permanently hidden |

## Directory Layout

```
<registryDir>/
  <promptName>/
    <version>/
      content.txt     (format=text)
      content.md      (format=markdown)
      content.json    (format=json)
      meta.json       { state, createdAt, author, tags?, notes? }
```

## Error Types

| Error | Code | When |
|---|---|---|
| `PromptNotFoundError` | `PROMPT_NOT_FOUND` | Prompt name or range not found |
| `VersionNotFoundError` | `VERSION_NOT_FOUND` | Specific version does not exist |
| `InvalidStateTransitionError` | `INVALID_STATE_TRANSITION` | Illegal lifecycle transition |

## License

MIT
