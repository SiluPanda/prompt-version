# prompt-version

Local-first, git-friendly prompt versioning with semver.

[![npm version](https://img.shields.io/npm/v/prompt-version.svg)](https://www.npmjs.com/package/prompt-version)
[![license](https://img.shields.io/npm/l/prompt-version.svg)](https://github.com/SiluPanda/prompt-version/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/prompt-version.svg)](https://nodejs.org)

---

## Description

`prompt-version` is a file-based prompt versioning library for LLM applications. It stores prompts as versioned artifacts on the local filesystem, applies semantic versioning (semver) for range-based resolution, and enforces lifecycle state management (draft, published, deprecated, archived). Prompts live alongside your application code in git -- no cloud service, no database, no API keys required.

The design mirrors how npm manages packages: `createRegistry` opens a local prompt registry, `createPrompt` writes a versioned prompt to disk, and `getPrompt` resolves a semver range against available versions and returns the prompt content. A structured directory layout (`<registry>/<name>/<version>/`) keeps every version immutable and diffable in pull requests.

Key capabilities:

- Semver range resolution (`^1.0.0`, `~2.1.0`, `1.x`, `>=1.0.0 <2.0.0`, exact, latest)
- Lifecycle states with enforced transition rules (draft -> published -> deprecated)
- Multiple content formats: plain text, markdown, and JSON message arrays
- Per-version metadata: author, tags, notes, timestamps
- Version bumping with automatic semver increment (major, minor, patch)
- Zero-network, zero-config operation -- everything is filesystem-based

---

## Installation

```bash
npm install prompt-version
```

Requires Node.js >= 18.

The sole runtime dependency is [`semver`](https://www.npmjs.com/package/semver).

---

## Quick Start

```typescript
import { createRegistry } from 'prompt-version';

// Point at a directory on disk (created automatically on first write)
const registry = createRegistry({
  registryDir: './prompts',
  author: 'alice',
});

// Create a prompt at version 1.0.0 (starts in 'draft' state by default)
await registry.createPrompt('greeting', '1.0.0', 'Hello, {{name}}!');

// Publish it so consumers can resolve it
await registry.publish('greeting', '1.0.0');

// Retrieve the latest published version
const prompt = await registry.getPrompt('greeting');
console.log(prompt.content);       // "Hello, {{name}}!"
console.log(prompt.version);       // "1.0.0"
console.log(prompt.contentFormat); // "text"

// Resolve with a semver range
const compat = await registry.getPrompt('greeting', '^1.0.0');

// Bump to a patch version (copies content from the source version)
const next = await registry.bump('greeting', '1.0.0', {
  level: 'patch',
  notes: 'fixed typo in greeting',
  state: 'published',
});
console.log(next); // "1.0.1"
```

---

## Features

### Semver Range Resolution

Resolve prompts using any standard semver range syntax. The resolver filters candidates by lifecycle state, then selects the highest satisfying version.

```typescript
await registry.getPrompt('greeting', '^1.0.0');   // caret range
await registry.getPrompt('greeting', '~1.2.0');   // tilde range
await registry.getPrompt('greeting', '1.0.0');    // exact version
await registry.getPrompt('greeting', '1.x');      // wildcard
await registry.getPrompt('greeting');              // latest published
```

### Lifecycle State Management

Every version passes through a controlled lifecycle. State transitions are enforced -- attempting an illegal transition throws `InvalidStateTransitionError`.

```
draft  -->  published  -->  deprecated
                  \
                   +--->  archived
```

| State        | Resolvable by default | Mutable | Description                          |
|--------------|----------------------|---------|--------------------------------------|
| `draft`      | No                   | Yes     | Work in progress, not yet released   |
| `published`  | Yes                  | No      | Production-ready, immutable          |
| `deprecated` | No                   | No      | Superseded; opt-in with `deprecated: true` |
| `archived`   | Never                | No      | Permanently hidden from resolution   |

### Multiple Content Formats

Store prompts as plain text, markdown, or structured JSON message arrays.

```typescript
// Plain text (default)
await registry.createPrompt('simple', '1.0.0', 'You are a helpful assistant.');

// Markdown
await registry.createPrompt('detailed', '1.0.0', '# System\nYou are...', {
  format: 'markdown',
});

// JSON message array
const messages = JSON.stringify([
  { role: 'system', content: 'You are a code reviewer.' },
  { role: 'user', content: '{{code}}' },
]);
await registry.createPrompt('reviewer', '1.0.0', messages, {
  format: 'json',
});
```

Content is stored on disk with the corresponding extension: `content.txt`, `content.md`, or `content.json`.

### Version Bumping

Create new versions from existing ones with automatic semver increment. The content from the source version is copied forward as the starting point.

```typescript
const v = await registry.bump('greeting', '1.0.0', { level: 'minor' });
// v === "1.1.0"

const v2 = await registry.bump('greeting', '1.1.0', { level: 'major' });
// v2 === "2.0.0"
```

### Git-Friendly Storage

The directory layout produces clean, readable git diffs:

```
<registryDir>/
  <promptName>/
    <version>/
      content.txt    | content.md | content.json
      meta.json      { state, createdAt, author, tags?, notes? }
```

Each version is a self-contained directory. Bumping a version adds a new directory without modifying existing ones. State transitions update only `meta.json`.

---

## API Reference

### `createRegistry(config)`

Creates a `PromptRegistry` instance backed by the local filesystem.

```typescript
import { createRegistry } from 'prompt-version';

const registry = createRegistry({
  registryDir: './prompts',
  format: 'markdown',
  author: 'alice',
});
```

**Parameters:**

| Field         | Type            | Default   | Description                                  |
|---------------|-----------------|-----------|----------------------------------------------|
| `registryDir` | `string`        | required  | Absolute or relative path to the registry directory |
| `format`      | `ContentFormat` | `'text'`  | Default content format for new prompts       |
| `author`      | `string`        | `''`      | Default author name for new versions         |

**Returns:** `PromptRegistry`

---

### `registry.createPrompt(name, version, content, options?)`

Creates a new prompt version on disk. The directory structure is created automatically.

```typescript
await registry.createPrompt('greeting', '1.0.0', 'Hello!', {
  state: 'published',
  format: 'markdown',
  author: 'bob',
  tags: ['production'],
  notes: 'Initial version',
});
```

**Parameters:**

| Parameter          | Type             | Default          | Description                                     |
|--------------------|------------------|------------------|-------------------------------------------------|
| `name`             | `string`         | required         | Prompt identifier (used as directory name)       |
| `version`          | `string`         | required         | Valid semver string (e.g. `'1.0.0'`)            |
| `content`          | `string`         | required         | Raw prompt content string                        |
| `options.state`    | `LifecycleState` | `'draft'`        | Initial lifecycle state                          |
| `options.format`   | `ContentFormat`  | registry default | Content format (`'text'`, `'markdown'`, `'json'`) |
| `options.author`   | `string`         | registry default | Author of this version                           |
| `options.tags`     | `string[]`       | --               | Tags for categorization                          |
| `options.notes`    | `string`         | --               | Free-form notes stored in metadata               |

**Returns:** `Promise<void>`

**Throws:** `Error` if `version` is not valid semver.

---

### `registry.getPrompt(name, range?, options?)`

Resolves a semver range against available versions, filters by lifecycle state, and returns the prompt content and metadata.

```typescript
const prompt = await registry.getPrompt('greeting');
const prompt = await registry.getPrompt('greeting', '^1.0.0');
const prompt = await registry.getPrompt('greeting', undefined, { draft: true });
```

**Parameters:**

| Parameter            | Type      | Default | Description                                      |
|----------------------|-----------|---------|--------------------------------------------------|
| `name`               | `string`  | required | Prompt name                                      |
| `range`              | `string`  | `'*'`  | Semver range; omit for latest                    |
| `options.draft`      | `boolean` | `false` | Include draft versions in resolution             |
| `options.deprecated` | `boolean` | `false` | Include deprecated versions in resolution        |

**Returns:** `Promise<ResolvedPrompt>`

```typescript
interface ResolvedPrompt {
  name: string;           // Prompt name
  version: string;        // Resolved exact version
  content: string | PromptMessage[];  // Prompt content
  contentFormat: ContentFormat;       // 'text' | 'markdown' | 'json'
  metadata: VersionMetadata;          // Full version metadata
}
```

**Throws:**
- `PromptNotFoundError` -- prompt name does not exist or no version satisfies the range.

---

### `registry.bump(name, from, options)`

Creates a new version by incrementing the semver of an existing version. Copies the content from the source version into the new version directory.

```typescript
const newVersion = await registry.bump('greeting', '1.0.0', {
  level: 'minor',
  notes: 'added examples',
  author: 'bob',
  state: 'published',
});
// newVersion === "1.1.0"
```

**Parameters:**

| Parameter        | Type                               | Default          | Description                                  |
|------------------|------------------------------------|------------------|----------------------------------------------|
| `name`           | `string`                           | required         | Prompt name                                  |
| `from`           | `string`                           | required         | Source version to bump from                  |
| `options.level`  | `'major' \| 'minor' \| 'patch'`   | required         | Semver increment level                       |
| `options.notes`  | `string`                           | --               | Notes for the new version                    |
| `options.author` | `string`                           | source author    | Author of the new version                    |
| `options.state`  | `LifecycleState`                   | `'draft'`        | Initial state of the new version             |

**Returns:** `Promise<string>` -- the new version string.

**Throws:**
- `VersionNotFoundError` -- the `from` version does not exist on disk.

---

### `registry.publish(name, version)`

Transitions a version from `draft` to `published`. After publication, the version's content becomes immutable.

```typescript
await registry.publish('greeting', '1.0.0');
```

**Throws:**
- `VersionNotFoundError` -- version does not exist.
- `InvalidStateTransitionError` -- version is not in `draft` state.

---

### `registry.deprecate(name, version, notes?)`

Transitions a version from `published` to `deprecated`. Deprecated versions are excluded from default resolution but can be included with `{ deprecated: true }`.

```typescript
await registry.deprecate('greeting', '1.0.0', 'Use v2.0.0 instead');
```

**Throws:**
- `VersionNotFoundError` -- version does not exist.
- `InvalidStateTransitionError` -- version is not in `published` state.

---

### `registry.listPrompts()`

Returns the names of all prompts in the registry.

```typescript
const names = await registry.listPrompts();
// ["greeting", "code-review", "support"]
```

**Returns:** `Promise<string[]>`

---

### `registry.listVersions(name)`

Returns all version strings for a given prompt.

```typescript
const versions = await registry.listVersions('greeting');
// ["1.0.0", "1.1.0", "2.0.0"]
```

**Returns:** `Promise<string[]>`

---

## Exported Types

All types are exported for use in TypeScript projects:

```typescript
import type {
  LifecycleState,      // 'draft' | 'published' | 'deprecated' | 'archived'
  ContentFormat,        // 'text' | 'markdown' | 'json'
  PromptMessage,        // { role: 'system' | 'user' | 'assistant'; content: string }
  VersionMetadata,      // { state, createdAt, author, tags?, notes?, [k: string]: unknown }
  ResolvedPrompt,       // { name, version, content, contentFormat, metadata }
  RegistryConfig,       // { registryDir, format?, author? }
  GetPromptOptions,     // { draft?, deprecated? }
  CreatePromptOptions,  // { format?, author?, state?, tags?, notes? }
  BumpOptions,          // { level, notes?, author?, state? }
  PromptRegistry,       // Interface with all registry methods
} from 'prompt-version';
```

### `VersionMetadata`

```typescript
interface VersionMetadata {
  state: LifecycleState;
  createdAt: string;       // ISO 8601 timestamp
  author: string;
  tags?: string[];
  notes?: string;
  [k: string]: unknown;    // Extensible with arbitrary metadata
}
```

### `PromptMessage`

Used with the `json` content format for structured chat-style prompts:

```typescript
interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### `PromptRegistry`

The full registry interface:

```typescript
interface PromptRegistry {
  getPrompt(name: string, range?: string, options?: GetPromptOptions): Promise<ResolvedPrompt>;
  createPrompt(name: string, version: string, content: string, options?: CreatePromptOptions): Promise<void>;
  listPrompts(): Promise<string[]>;
  listVersions(name: string): Promise<string[]>;
  bump(name: string, from: string, options: BumpOptions): Promise<string>;
  publish(name: string, version: string): Promise<void>;
  deprecate(name: string, version: string, notes?: string): Promise<void>;
}
```

---

## Configuration

### `RegistryConfig`

```typescript
interface RegistryConfig {
  registryDir: string;     // Path to the registry directory (required)
  format?: ContentFormat;  // Default content format (default: 'text')
  author?: string;         // Default author (default: '')
}
```

The `registryDir` is the only required field. It can be an absolute path or relative to the working directory. The directory is created automatically when the first prompt is written.

### Content Formats

| Format       | File on Disk     | Use Case                                    |
|--------------|------------------|---------------------------------------------|
| `'text'`     | `content.txt`    | Simple system prompts, single-string prompts |
| `'markdown'` | `content.md`     | Structured prompts with headings and lists   |
| `'json'`     | `content.json`   | Chat message arrays (`{ role, content }[]`)  |

---

## Error Handling

All errors extend `PromptVersionError`, which carries a machine-readable `code` property.

```typescript
import {
  PromptVersionError,
  PromptNotFoundError,
  VersionNotFoundError,
  InvalidStateTransitionError,
} from 'prompt-version';
```

| Error Class                    | `code`                       | Thrown When                                        |
|-------------------------------|------------------------------|----------------------------------------------------|
| `PromptVersionError`          | (varies)                     | Base class for all prompt-version errors            |
| `PromptNotFoundError`         | `'PROMPT_NOT_FOUND'`         | Prompt name does not exist or no version matches range |
| `VersionNotFoundError`        | `'VERSION_NOT_FOUND'`        | A specific version does not exist on disk           |
| `InvalidStateTransitionError` | `'INVALID_STATE_TRANSITION'` | Illegal lifecycle state transition attempted        |

### Catching Errors

```typescript
try {
  const prompt = await registry.getPrompt('missing-prompt', '^1.0.0');
} catch (err) {
  if (err instanceof PromptNotFoundError) {
    console.error(`Prompt "${err.promptName}" not found`);
  }
}
```

```typescript
try {
  await registry.publish('greeting', '1.0.0');
} catch (err) {
  if (err instanceof InvalidStateTransitionError) {
    console.error(`Cannot transition: ${err.code}`);
  }
}
```

---

## Advanced Usage

### Draft Workflow

Use drafts to iterate on a prompt before making it available to consumers.

```typescript
// Create a draft
await registry.createPrompt('experiment', '1.0.0', 'Draft content');

// Draft is invisible to normal resolution
const names = await registry.listPrompts(); // includes 'experiment'
await registry.getPrompt('experiment');      // throws PromptNotFoundError

// Opt in to see drafts
const draft = await registry.getPrompt('experiment', undefined, { draft: true });

// Publish when ready
await registry.publish('experiment', '1.0.0');

// Now visible by default
const published = await registry.getPrompt('experiment');
```

### Deprecation Workflow

Signal that a version should no longer be used.

```typescript
await registry.deprecate('greeting', '1.0.0', 'Replaced by v2.0.0');

// Deprecated versions are excluded by default
await registry.getPrompt('greeting', '1.0.0'); // throws PromptNotFoundError

// Explicitly include deprecated versions
const old = await registry.getPrompt('greeting', '1.0.0', { deprecated: true });
console.log(old.metadata.notes); // "Replaced by v2.0.0"
```

### Multi-Version Resolution

When multiple versions exist, range resolution selects the highest matching published version.

```typescript
await registry.createPrompt('greet', '1.0.0', 'v1.0', { state: 'published' });
await registry.createPrompt('greet', '1.1.0', 'v1.1', { state: 'published' });
await registry.createPrompt('greet', '2.0.0', 'v2.0', { state: 'published' });

const latest = await registry.getPrompt('greet');           // v2.0.0
const compat = await registry.getPrompt('greet', '^1.0.0'); // v1.1.0
const exact  = await registry.getPrompt('greet', '1.0.0');  // v1.0.0
```

### Storing Arbitrary Metadata

`VersionMetadata` accepts arbitrary additional properties via its index signature.

```typescript
await registry.createPrompt('audit-trail', '1.0.0', 'content', {
  state: 'published',
  author: 'alice',
  tags: ['production', 'customer-facing'],
  notes: 'Initial release after review',
});

const prompt = await registry.getPrompt('audit-trail');
console.log(prompt.metadata.author);    // "alice"
console.log(prompt.metadata.tags);      // ["production", "customer-facing"]
console.log(prompt.metadata.createdAt); // ISO 8601 timestamp
```

---

## TypeScript

`prompt-version` is written in TypeScript and ships type declarations (`dist/index.d.ts`) alongside the compiled JavaScript. All public types, interfaces, and error classes are exported from the package entry point.

```typescript
import { createRegistry } from 'prompt-version';
import type { ResolvedPrompt, VersionMetadata, PromptRegistry } from 'prompt-version';

const registry: PromptRegistry = createRegistry({ registryDir: './prompts' });

const prompt: ResolvedPrompt = await registry.getPrompt('greeting', '^1.0.0');
const meta: VersionMetadata = prompt.metadata;
```

The package targets ES2022 and compiles to CommonJS. TypeScript strict mode is enabled.

---

## License

[MIT](https://opensource.org/licenses/MIT)
