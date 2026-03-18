# prompt-version -- Specification

## 1. Overview

`prompt-version` is a local-first, git-friendly prompt versioning library with semver tagging, changelogs, and a runtime `getPrompt("greeting", "1.2.x")` API. It models prompts as versioned artifacts stored in a file-based registry on disk -- each prompt has a name, a history of immutable semver-tagged versions, lifecycle states, changelog entries, and metadata. The library provides both a TypeScript/JavaScript API for programmatic access (loading prompts by name and semver range at runtime) and a CLI for managing prompt lifecycles (creating, versioning, publishing, deprecating, diffing, and exporting prompts). The result is a self-contained prompt version control system that lives alongside application code in git, requires no cloud service, no database, no API keys, and no network connectivity.

The gap this package fills is specific and well-defined. Prompt versioning today requires hosted platforms. Langfuse provides prompt version control with integer version numbers (1, 2, 3...) and label-based environment routing (production, staging), but it requires a running Langfuse server and network connectivity to fetch prompts at runtime. PromptLayer stores prompts in a cloud registry and retrieves them by name and version via API calls, coupling prompt resolution to network availability and a paid service. Braintrust tracks prompt versions with environment-based deployment, but again requires their platform. Humanloop provides version control with A/B testing built in, but operates as a hosted SaaS. All of these tools solve the versioning problem by centralizing prompt storage in a cloud platform. This works well for teams that want managed infrastructure, but it creates problems for teams that want local-first workflows: offline development is impossible, prompt content is stored outside the repository, git history does not capture prompt evolution, CI/CD pipelines need network access to resolve prompts, and lock-file-based reproducibility is unavailable.

On the other end of the spectrum, teams that version prompts without a platform resort to ad-hoc approaches: numbered files (`prompt-v1.md`, `prompt-v2.md`, `prompt-v3.md`), git branches per prompt version, spreadsheets tracking prompt iterations, or simple string constants in application code with no version metadata. These approaches lack semver semantics, have no concept of lifecycle states (draft, published, deprecated), provide no changelog, offer no range-based resolution (`getPrompt("greeting", "^1.0.0")`), and make reproducible builds impossible.

`prompt-version` occupies the space between hosted platforms and ad-hoc file management. It borrows the core concepts from hosted platforms -- named prompts, immutable versions, lifecycle states, environment labels, changelog entries -- and implements them as a file-based registry that lives in the project directory, is committed to git, and requires nothing beyond the filesystem to operate. Prompts are stored as files in a structured directory hierarchy (`prompts/<name>/<version>/`). A manifest file tracks metadata, version history, and lifecycle states. A lock file pins resolved versions for reproducible builds. The CLI manages the lifecycle (init, create, bump, publish, deprecate, list, diff, export), and the runtime API resolves semver ranges against the local registry and returns prompt content.

The design philosophy is analogous to how npm manages packages locally. `npm install` resolves semver ranges, downloads packages, and writes a `package-lock.json` for reproducibility. `prompt-version` resolves semver ranges against a local prompt registry, reads prompt files from disk, and writes a `prompt-versions.lock` for reproducibility. Where npm stores packages in `node_modules/`, `prompt-version` stores prompts in a configurable registry directory (`prompts/` by default). Where `package.json` declares dependencies with semver ranges, application code calls `getPrompt("greeting", "^1.0.0")` with semver ranges.

`prompt-version` provides both a TypeScript/JavaScript API for programmatic use and a CLI for terminal and shell-script use. The API returns prompt content, metadata, and version information. The CLI prints human-readable or JSON output and exits with conventional codes (0 for success, 1 for errors, 2 for configuration/usage errors).

---

## 2. Goals and Non-Goals

### Goals

- Provide a `getPrompt(name, range?)` function that resolves a semver range against a local file-based registry, reads the prompt content from disk, and returns it as a string or structured object. Default range is `"latest"` (the latest published version).
- Store prompts as files in a structured, human-readable, git-friendly directory hierarchy. Each version is an immutable directory containing the prompt content file and a metadata file. Version history is visible in the filesystem and in git history.
- Use semantic versioning (semver) for prompt versions. MAJOR for breaking behavior changes, MINOR for backwards-compatible additions, PATCH for wording tweaks and typo fixes. Pre-release versions (`1.2.0-beta.1`) for testing.
- Support semver range resolution using the same range syntax as npm: `^1.0.0` (compatible), `~1.2.0` (approximately), `1.2.x` (wildcard), `>=1.0.0 <2.0.0` (explicit range), `latest` (latest published), and exact versions (`1.2.3`).
- Track lifecycle states for each prompt version: `draft`, `published`, `deprecated`, `archived`. Enforce state transition rules. `getPrompt()` returns only `published` versions by default (with options to include `draft` or `deprecated` versions).
- Generate per-prompt changelogs in keep-a-changelog format. Each version bump records a changelog entry describing what changed and why. Changelogs are stored alongside the prompt and are viewable via CLI or API.
- Provide a lock file (`prompt-versions.lock`) that pins resolved versions for reproducible builds. When the lock file exists, `getPrompt()` uses the locked version instead of re-resolving the range. The lock file is committed to git for CI/CD reproducibility.
- Provide a manifest file (`prompt-registry.json`) at the registry root that indexes all prompts, their versions, metadata, and lifecycle states. The manifest is the source of truth for version resolution without scanning the filesystem.
- Support multiple prompt content formats: plain text (`.txt`, `.md`), structured message arrays (`.json` with `{role, content}[]` format), and template files with variables (`{{variable}}` syntax).
- Provide a CLI (`prompt-version`) with commands for initialization (`init`), prompt creation (`new`), version bumping (`bump`), publishing (`publish`), deprecation (`deprecate`), listing (`list`), diffing (`diff`), resolving (`resolve`), changelog viewing (`changelog`), and exporting (`export`).
- Provide metadata for each prompt version: author, creation timestamp, model compatibility hints, tags, and arbitrary key-value pairs. Metadata is queryable via the API and CLI.
- Integrate with git workflows: version bumps produce committable file changes, each version directory is a self-contained artifact that can be tagged in git, and the manifest/lock file diffs are readable in pull requests.
- Integrate with sibling packages in the ecosystem: `prompt-diff` for comparing prompt versions, `prompt-lint` for pre-publish validation, and `prompt-inherit` for composable prompt construction.
- Keep dependencies minimal: one runtime dependency (`semver` for range parsing and resolution). All other functionality uses Node.js built-ins.

### Non-Goals

- **Not a hosted prompt management platform.** This package does not provide a server, API endpoint, dashboard, or cloud storage for prompts. It is a local library and CLI. Teams that want hosted prompt management should use Langfuse, PromptLayer, Braintrust, or similar platforms. `prompt-version` is for teams that want prompts in their git repository.
- **Not a prompt evaluation or testing framework.** This package does not execute prompts against models, compare outputs, or score quality. That is what promptfoo, Braintrust evaluation, and LangSmith do. `prompt-version` manages prompt artifacts; evaluation is a separate concern.
- **Not a prompt editor or playground.** This package does not provide a UI for editing prompts, previewing outputs, or running A/B experiments interactively. Prompts are edited with any text editor and versioned via the CLI.
- **Not a deployment system.** This package does not deploy prompts to production servers, manage rollout percentages, or handle feature flags. It provides export and resolution APIs that deployment systems consume. Use LaunchDarkly, environment variables, or CI/CD pipelines for deployment orchestration.
- **Not a prompt template engine.** This package stores and retrieves prompts. It does not render templates or substitute variables. Use `prompt-inherit`, Handlebars, or application code for template rendering. `prompt-version` is aware of template variables for metadata purposes but does not process them.
- **Not a general-purpose version control system.** This package uses git for history and collaboration. It does not re-implement branching, merging, or conflict resolution. The file-based storage is designed to work with git, not replace it.
- **Not a token counter or cost estimator.** While metadata can include estimated token counts, the package does not tokenize prompts or estimate costs. Use `tiktoken` or model-specific tokenizers for that.

---

## 3. Target Users and Use Cases

### AI Application Development Teams

Teams that build applications using LLM prompts as core components. They maintain system prompts, user-facing prompt templates, and chain-of-thought scaffolding that evolve over time. Running `prompt-version bump greeting minor` after adding new examples creates an immutable version record, updates the changelog, and produces a git-committable change. Running `getPrompt("greeting", "^2.0.0")` in application code resolves to the latest compatible version from the local registry. This is the primary audience.

### Prompt Engineers Iterating on Production Prompts

Individual prompt engineers who iterate on prompts through many revisions and need to track what changed, when, and why. The version history provides a complete audit trail. The changelog documents the reasoning behind each change. The ability to resolve any historical version by exact semver makes rollback trivial: change `getPrompt("greeting", "2.3.1")` to `getPrompt("greeting", "2.3.0")` and the previous version is restored without modifying any prompt files.

### CI/CD Pipeline Operators

Teams that deploy applications with embedded prompts and need reproducible builds. The lock file (`prompt-versions.lock`) pins exact resolved versions. A CI build on Tuesday and a CI build on Friday resolve the same prompt versions, even if new versions were published between them. The `prompt-version resolve` command verifies that all prompt references in the codebase have valid resolutions. The `prompt-version export` command produces deployment-ready artifacts.

### Platform Teams Managing Shared Prompt Libraries

Teams that maintain a shared repository of prompt templates used by multiple applications. Each application declares its prompt dependencies with semver ranges. The platform team publishes new versions following semver rules: patch for wording improvements, minor for new capabilities, major for breaking changes. Consuming applications automatically pick up compatible updates. Breaking changes require explicit version range updates.

### Quality Assurance and Compliance Teams

Teams that need audit trails for prompt changes in regulated industries (healthcare, finance, legal). Each prompt version is immutable and timestamped. The changelog records what changed and who authored it. The lifecycle states provide governance: prompts must pass through `draft` and `published` before reaching production, and `deprecated` versions emit warnings. The complete history is stored in git with full accountability.

### Teams Migrating from Hosted Platforms

Teams that currently use Langfuse, PromptLayer, or similar hosted platforms and want to move to a local-first workflow. `prompt-version` provides the same core abstractions (named prompts, versions, labels/states, resolution by range) without the cloud dependency. Prompts can be exported from hosted platforms and imported into the file-based registry.

---

## 4. Core Concepts

### Prompt Registry

A prompt registry is a directory on disk that contains all managed prompts and their versions. It is initialized with `prompt-version init` and identified by the presence of a `prompt-registry.json` manifest file at its root. The default registry directory is `prompts/` relative to the project root, but this is configurable.

A registry contains:

- **Manifest file** (`prompt-registry.json`): an index of all prompts, their versions, metadata, and lifecycle states. This is the source of truth for version resolution.
- **Prompt directories**: one subdirectory per prompt name, each containing version subdirectories.
- **Lock file** (`prompt-versions.lock`): resolved version mappings for reproducible builds. This lives alongside the manifest, typically at the project root or in the registry directory.

### Prompt

A prompt is a named, versioned artifact in the registry. Each prompt has:

- **Name**: a unique, kebab-case identifier (e.g., `greeting`, `code-review`, `customer-support`). Names must be valid directory names and follow the pattern `[a-z0-9]([a-z0-9-]*[a-z0-9])?`.
- **Versions**: an ordered list of immutable semver-tagged versions.
- **Current version**: the latest version (may be draft or published).
- **Description**: a human-readable description of the prompt's purpose.
- **Tags**: optional labels for categorization (e.g., `customer-facing`, `internal`, `experimental`).

### Version

A version is an immutable snapshot of a prompt's content and metadata, tagged with a semver string. Once created, a version's content cannot be modified (only its lifecycle state can change). Each version contains:

- **Semver tag**: the version identifier (e.g., `1.2.3`, `2.0.0-beta.1`).
- **Content**: the prompt text, stored as a file. The content format is determined by the file extension (`.md` for markdown/plain text, `.txt` for plain text, `.json` for structured message arrays).
- **Metadata**: author, creation timestamp, model compatibility hints, changelog entry, tags, and arbitrary key-value pairs.
- **Lifecycle state**: `draft`, `published`, `deprecated`, or `archived`.

### Semver for Prompts

Semantic versioning applies to prompts with prompt-specific semantics:

- **MAJOR** (breaking): Changes that alter the prompt's behavior in ways that would break consumers. Examples: changing the output format (JSON to plain text), removing capabilities, changing the role or persona fundamentally, removing required template variables, altering the response structure that downstream code parses.
- **MINOR** (feature): Changes that add capabilities or improve the prompt without breaking existing behavior. Examples: adding new examples, adding a new section, introducing optional template variables, expanding the prompt's scope, adding error handling instructions.
- **PATCH** (fix): Changes that do not affect observable behavior. Examples: fixing typos, rewording for clarity without changing meaning, normalizing whitespace, improving grammar, reordering sections for readability.
- **Pre-release** (testing): Versions tagged with pre-release identifiers (e.g., `1.2.0-beta.1`, `2.0.0-rc.1`) for testing before publication. Pre-release versions are excluded from range resolution unless explicitly requested.

### Lifecycle States

Each prompt version has a lifecycle state that governs how it is treated by the resolution system:

- **`draft`**: The version is in progress and not ready for production use. `getPrompt()` does not return draft versions unless `includeDrafts: true` is specified. Draft versions can have their content modified (they are the only mutable state). Once published, a draft becomes immutable.
- **`published`**: The version is released and available for production use. `getPrompt()` returns published versions by default. Published versions are immutable.
- **`deprecated`**: The version is still available but discouraged. `getPrompt()` returns deprecated versions with a console warning by default, or excludes them if `excludeDeprecated: true` is specified. A deprecation message explains why the version is deprecated and what to use instead.
- **`archived`**: The version is no longer available for resolution. `getPrompt()` never returns archived versions. The version files are retained for audit purposes but are excluded from all resolution. Archived versions can only be accessed by exact version via `getMetadata()`.

State transitions follow a strict progression:

```
draft --> published --> deprecated --> archived
             |                           ^
             +---------------------------+
```

A `published` version can transition directly to `archived` (skipping `deprecated`). No other transitions are allowed. A `draft` can be deleted entirely (not archived, simply removed).

### Changelog

Each prompt maintains a changelog file (`CHANGELOG.md`) in keep-a-changelog format. Changelog entries are created automatically during version bumps and can be edited manually. Each entry records:

- The version number.
- The date of the version bump.
- A categorized list of changes: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`.
- The author of the change.

### Lock File

The lock file (`prompt-versions.lock`) records the exact version that was resolved for each `(promptName, range)` pair used in the application. When the lock file exists, `getPrompt()` uses the locked version instead of performing live resolution. This ensures that all environments (development, CI, staging, production) use identical prompt versions.

The lock file is analogous to `package-lock.json` in npm: it is generated by a resolution pass, committed to version control, and respected by all subsequent resolution calls until explicitly updated.

---

## 5. Storage Format

### Directory Structure

```
project-root/
  prompts/                              Registry root directory.
    prompt-registry.json                Registry manifest (index of all prompts).
    prompt-versions.lock                Lock file (resolved version pins).
    greeting/                           Prompt directory (one per prompt name).
      CHANGELOG.md                      Per-prompt changelog.
      1.0.0/                            Version directory (immutable after publish).
        prompt.md                       Prompt content file.
        meta.json                       Version metadata.
      1.1.0/
        prompt.md
        meta.json
      1.2.0/
        prompt.md
        meta.json
      2.0.0-beta.1/
        prompt.md
        meta.json
    code-review/
      CHANGELOG.md
      1.0.0/
        prompt.json                     Structured message array format.
        meta.json
      1.0.1/
        prompt.json
        meta.json
    customer-support/
      CHANGELOG.md
      1.0.0/
        prompt.md
        meta.json
```

### Manifest File (`prompt-registry.json`)

The manifest is the source of truth for the registry. It indexes all prompts and their versions without requiring filesystem traversal. The manifest is updated by CLI commands (not edited manually).

```json
{
  "version": 1,
  "registry": "prompts",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-03-18T14:30:00.000Z",
  "prompts": {
    "greeting": {
      "description": "A friendly greeting prompt for customer-facing interactions.",
      "tags": ["customer-facing", "production"],
      "createdAt": "2026-01-15T10:00:00.000Z",
      "versions": {
        "1.0.0": {
          "state": "deprecated",
          "createdAt": "2026-01-15T10:00:00.000Z",
          "author": "alice",
          "contentFile": "prompt.md",
          "contentFormat": "markdown",
          "deprecationMessage": "Use 1.1.0+ for improved tone."
        },
        "1.1.0": {
          "state": "published",
          "createdAt": "2026-02-01T09:00:00.000Z",
          "author": "alice",
          "contentFile": "prompt.md",
          "contentFormat": "markdown"
        },
        "1.2.0": {
          "state": "published",
          "createdAt": "2026-03-01T11:00:00.000Z",
          "author": "bob",
          "contentFile": "prompt.md",
          "contentFormat": "markdown"
        },
        "2.0.0-beta.1": {
          "state": "draft",
          "createdAt": "2026-03-15T08:00:00.000Z",
          "author": "bob",
          "contentFile": "prompt.md",
          "contentFormat": "markdown"
        }
      }
    },
    "code-review": {
      "description": "System prompt for automated code review.",
      "tags": ["internal", "engineering"],
      "createdAt": "2026-02-10T14:00:00.000Z",
      "versions": {
        "1.0.0": {
          "state": "published",
          "createdAt": "2026-02-10T14:00:00.000Z",
          "author": "charlie",
          "contentFile": "prompt.json",
          "contentFormat": "messages"
        }
      }
    }
  }
}
```

### Version Metadata File (`meta.json`)

Each version directory contains a `meta.json` file with version-specific metadata.

```json
{
  "version": "1.2.0",
  "state": "published",
  "createdAt": "2026-03-01T11:00:00.000Z",
  "author": "bob",
  "contentFile": "prompt.md",
  "contentFormat": "markdown",
  "changelog": "Added two new few-shot examples for edge cases. Improved error handling instruction.",
  "changeType": "minor",
  "modelCompat": ["gpt-4", "gpt-4o", "claude-3-opus", "claude-3.5-sonnet"],
  "tags": ["improved-examples"],
  "variables": ["customer_name", "order_id"],
  "estimatedTokens": 450,
  "metadata": {
    "reviewedBy": "alice",
    "jiraTicket": "PROMPT-142"
  }
}
```

### Prompt Content Files

Prompt content files are stored in the version directory. The format is determined by the file extension:

**Markdown / plain text (`prompt.md` or `prompt.txt`):**

```markdown
You are a friendly customer support agent for ACME Corp.

## Instructions
Greet the customer by name and help them with their inquiry.
Be concise and empathetic.

## Constraints
- Do not discuss competitor products.
- Do not share internal pricing.
- Respond in the customer's language.

## Output Format
Respond in plain text. Keep responses under 3 sentences.

## Examples
Customer: My order {{order_id}} hasn't arrived.
Agent: Hi {{customer_name}}, I'm sorry to hear that. Let me look into order {{order_id}} for you right away.
```

**Structured message array (`prompt.json`):**

```json
[
  {
    "role": "system",
    "content": "You are a senior code reviewer. Review the provided code for bugs, security vulnerabilities, and performance issues. Respond in JSON format with an array of issues."
  },
  {
    "role": "user",
    "content": "{{code}}"
  }
]
```

### Lock File (`prompt-versions.lock`)

The lock file records resolved version mappings. It is generated by `prompt-version lock` and updated by `prompt-version bump` or `prompt-version lock --update`.

```json
{
  "version": 1,
  "generatedAt": "2026-03-18T14:30:00.000Z",
  "lockfileVersion": 1,
  "resolutions": {
    "greeting": {
      "range": "^1.0.0",
      "resolved": "1.2.0",
      "contentHash": "sha256:a1b2c3d4e5f6..."
    },
    "code-review": {
      "range": "latest",
      "resolved": "1.0.0",
      "contentHash": "sha256:f6e5d4c3b2a1..."
    }
  }
}
```

The `contentHash` field is a SHA-256 hash of the prompt content file. When the lock file is read, the hash is verified against the actual file to detect tampering or accidental modification of an immutable version.

### Git Integration

The storage format is designed to produce clean, readable git diffs:

- **Creating a new prompt** adds a directory and updates the manifest. The git diff shows the new prompt content clearly.
- **Bumping a version** adds a new version directory (the old version directory is untouched) and updates the manifest. The git diff shows only the new version's files and the manifest update.
- **Changing lifecycle state** modifies only the manifest and the `meta.json` of the affected version. The prompt content file is not touched.
- **Updating the lock file** modifies only `prompt-versions.lock`. The diff shows which versions were re-resolved.

Each version directory is self-contained and immutable after publication. Git bisect works naturally: each commit that bumps a prompt version is a clean, atomic change.

---

## 6. Semver for Prompts

### Why Semver for Prompts

Prompts are increasingly treated as software artifacts: they are versioned, reviewed, tested, and deployed. Semver provides a shared language for communicating the nature of changes. When a prompt engineer bumps from `1.2.0` to `1.3.0`, consumers know the change is backwards-compatible. When the version jumps to `2.0.0`, consumers know the change may require code updates. This communication protocol is essential for shared prompt libraries where multiple applications consume the same prompts.

### Prompt-Specific Semver Guidelines

Unlike traditional software where "breaking change" has a precise technical definition (removed API, changed signature, altered return type), prompt breaking changes are semantic. A prompt that changes its output format from JSON to plain text is breaking because downstream parsing code will fail. A prompt that adds a new example is not breaking because existing consumers are unaffected.

#### MAJOR Bump (Breaking)

Bump MAJOR when the change would require consumers to modify their code or expectations:

- **Output format change**: JSON to plain text, structured to unstructured, schema field removal.
- **Role or persona change**: Changing from "customer support agent" to "technical writer" fundamentally alters the prompt's behavior.
- **Removed capabilities**: Removing a section, instruction, or example that consumers rely on.
- **Variable removal or rename**: Removing `{{customer_name}}` or renaming it to `{{user_name}}` breaks template rendering.
- **Constraint removal**: Removing "respond in English only" changes behavior for multilingual inputs.
- **Response structure change**: Adding required fields or changing the meaning of existing fields in structured output.

#### MINOR Bump (Feature)

Bump MINOR when the change adds capability without breaking existing behavior:

- **New examples**: Adding few-shot examples improves quality without changing the contract.
- **New sections**: Adding an "Error Handling" section gives the model more guidance.
- **New optional variables**: Adding `{{tone}}` with a default value does not break existing usage.
- **Expanded scope**: Adding instructions for handling a new type of query.
- **Improved instructions**: Making instructions more specific or detailed (without changing the expected output format).
- **Added constraints**: Adding "limit responses to 3 sentences" tightens behavior without breaking parsers.

#### PATCH Bump (Fix)

Bump PATCH when the change is invisible to consumers:

- **Typo fixes**: Correcting spelling or grammar errors.
- **Whitespace normalization**: Cleaning up formatting.
- **Rewording for clarity**: Saying the same thing more clearly without changing meaning.
- **Comment additions**: Adding internal comments or documentation.
- **Section reordering**: Moving sections around without changing content (may slightly affect model behavior, but not the contract).

#### Pre-Release Versions

Pre-release versions (`1.2.0-beta.1`, `2.0.0-rc.1`) are used for testing prompt changes before publication. They follow standard semver pre-release semantics:

- Pre-release versions have lower precedence than their release counterpart (`1.2.0-beta.1 < 1.2.0`).
- Pre-release versions are excluded from range resolution by default (`^1.0.0` does not match `1.2.0-beta.1`).
- Pre-release versions can be resolved explicitly (`getPrompt("greeting", "1.2.0-beta.1")`) or by enabling the `includePrerelease` option.

---

## 7. API Surface

### Type Definitions

```typescript
// ── Configuration ────────────────────────────────────────────────────

/** Configuration for creating a prompt registry. */
interface RegistryConfig {
  /** Path to the registry directory. Default: './prompts'. */
  registryDir?: string;

  /** Path to the lock file. Default: '<registryDir>/prompt-versions.lock'. */
  lockFile?: string;

  /**
   * Whether to use the lock file for resolution.
   * If true and a lock file exists, locked versions are used.
   * Default: true.
   */
  useLockFile?: boolean;

  /**
   * Default content format for new prompts.
   * Default: 'markdown'.
   */
  defaultFormat?: 'markdown' | 'text' | 'messages';

  /**
   * Default author for new versions.
   * Default: reads from git config user.name, or 'unknown'.
   */
  defaultAuthor?: string;
}

// ── Prompt Types ─────────────────────────────────────────────────────

/** Lifecycle state of a prompt version. */
type LifecycleState = 'draft' | 'published' | 'deprecated' | 'archived';

/** Content format of a prompt. */
type ContentFormat = 'markdown' | 'text' | 'messages';

/** A structured message in a message array prompt. */
interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Metadata for a single prompt version. */
interface VersionMetadata {
  /** Semver version string. */
  version: string;

  /** Current lifecycle state. */
  state: LifecycleState;

  /** ISO 8601 creation timestamp. */
  createdAt: string;

  /** Author identifier. */
  author: string;

  /** Content file name within the version directory. */
  contentFile: string;

  /** Content format. */
  contentFormat: ContentFormat;

  /** Changelog entry for this version. */
  changelog: string;

  /** Semver change type that produced this version. */
  changeType: 'major' | 'minor' | 'patch' | 'prerelease';

  /** Model compatibility hints (optional). */
  modelCompat?: string[];

  /** Tags for categorization (optional). */
  tags?: string[];

  /** Detected template variable names (optional). */
  variables?: string[];

  /** Estimated token count (optional). */
  estimatedTokens?: number;

  /** Deprecation message (only for deprecated versions). */
  deprecationMessage?: string;

  /** Arbitrary key-value metadata. */
  metadata?: Record<string, unknown>;
}

/** Summary information for a prompt (all versions). */
interface PromptInfo {
  /** Prompt name. */
  name: string;

  /** Human-readable description. */
  description: string;

  /** Tags for categorization. */
  tags: string[];

  /** ISO 8601 creation timestamp. */
  createdAt: string;

  /** All version strings, sorted by semver (ascending). */
  versions: string[];

  /** Latest published version string (null if none published). */
  latestPublished: string | null;

  /** Latest version string regardless of state. */
  latest: string;
}

/** Result of resolving and loading a prompt. */
interface ResolvedPrompt {
  /** The prompt name. */
  name: string;

  /** The resolved exact version. */
  version: string;

  /** The prompt content as a string. */
  content: string;

  /** The content format. */
  format: ContentFormat;

  /**
   * Parsed message array (only when format is 'messages').
   * null for other formats.
   */
  messages: PromptMessage[] | null;

  /** Full version metadata. */
  metadata: VersionMetadata;
}

/** Options for getPrompt(). */
interface GetPromptOptions {
  /** Include draft versions in resolution. Default: false. */
  includeDrafts?: boolean;

  /** Include pre-release versions in resolution. Default: false. */
  includePrerelease?: boolean;

  /** Exclude deprecated versions from resolution. Default: false. */
  excludeDeprecated?: boolean;

  /**
   * Suppress the console warning for deprecated versions.
   * Default: false.
   */
  suppressDeprecationWarning?: boolean;

  /**
   * Bypass the lock file and perform live resolution.
   * Default: false.
   */
  bypassLock?: boolean;
}

/** Options for creating a new prompt version. */
interface BumpOptions {
  /** The bump type. */
  type: 'major' | 'minor' | 'patch' | 'prerelease';

  /** Changelog entry describing the change. */
  changelog: string;

  /** Author of the change. Uses registry default if not specified. */
  author?: string;

  /** Pre-release identifier (for prerelease bumps). E.g., 'beta', 'rc'. */
  prereleaseId?: string;

  /** Model compatibility hints. */
  modelCompat?: string[];

  /** Tags for the new version. */
  tags?: string[];

  /** Arbitrary key-value metadata. */
  metadata?: Record<string, unknown>;

  /** Initial lifecycle state. Default: 'draft'. */
  initialState?: 'draft' | 'published';
}

/** Lock file resolution entry. */
interface LockResolution {
  /** The semver range that was resolved. */
  range: string;

  /** The exact version that the range resolved to. */
  resolved: string;

  /** SHA-256 hash of the prompt content file. */
  contentHash: string;
}
```

### Registry API

```typescript
/**
 * Create a prompt registry instance configured for a specific directory.
 * The registry must already be initialized (prompt-registry.json must exist).
 * Throws if the registry directory does not exist or is not initialized.
 */
function createRegistry(config?: RegistryConfig): PromptRegistry;

/**
 * Initialize a new prompt registry in the specified directory.
 * Creates the directory, manifest file, and lock file.
 * Throws if the directory already contains a manifest.
 */
function initRegistry(config?: RegistryConfig): PromptRegistry;

/** The prompt registry interface. */
interface PromptRegistry {
  // ── Resolution ───────────────────────────────────────────────────

  /**
   * Resolve a semver range and load the prompt content.
   * If no range is specified, resolves to 'latest' (latest published version).
   * If a lock file exists and useLockFile is true, uses the locked version.
   *
   * Throws PromptNotFoundError if the prompt name does not exist.
   * Throws VersionNotFoundError if no version satisfies the range.
   * Throws ArchivedVersionError if the only matching version is archived.
   */
  getPrompt(name: string, range?: string, options?: GetPromptOptions): ResolvedPrompt;

  /**
   * Resolve a semver range to an exact version string without loading content.
   * Returns the version string, or null if no version satisfies the range.
   */
  resolve(name: string, range: string, options?: GetPromptOptions): string | null;

  // ── Listing ──────────────────────────────────────────────────────

  /**
   * List all prompts in the registry.
   * Returns summary information for each prompt.
   */
  listPrompts(): PromptInfo[];

  /**
   * List all versions of a specific prompt.
   * Returns version metadata sorted by semver (ascending).
   */
  listVersions(name: string): VersionMetadata[];

  /**
   * Get metadata for a specific prompt version.
   * Unlike getPrompt(), this works for any state including archived.
   */
  getMetadata(name: string, version: string): VersionMetadata;

  // ── Mutation ─────────────────────────────────────────────────────

  /**
   * Create a new prompt in the registry.
   * Creates the prompt directory, initial version (1.0.0), and changelog.
   * The initial version starts in 'draft' state.
   *
   * Throws if a prompt with the same name already exists.
   */
  createPrompt(name: string, options: {
    description: string;
    content: string;
    format?: ContentFormat;
    author?: string;
    tags?: string[];
    modelCompat?: string[];
    metadata?: Record<string, unknown>;
  }): VersionMetadata;

  /**
   * Bump a prompt to a new version.
   * Copies the current version's content as the starting point for the new version.
   * The new version starts in the specified initial state (default: 'draft').
   *
   * Returns the metadata of the newly created version.
   */
  bump(name: string, options: BumpOptions): VersionMetadata;

  /**
   * Update the content of a draft version.
   * Throws if the version is not in 'draft' state.
   */
  updateDraft(name: string, version: string, content: string): void;

  /**
   * Transition a version to a new lifecycle state.
   * Validates that the transition is allowed.
   *
   * publish(name, version): draft -> published
   * deprecate(name, version, message): published -> deprecated
   * archive(name, version): published|deprecated -> archived
   */
  publish(name: string, version: string): void;
  deprecate(name: string, version: string, message: string): void;
  archive(name: string, version: string): void;

  // ── Lock File ────────────────────────────────────────────────────

  /**
   * Generate or update the lock file.
   * Resolves all ranges found in the lock file (or a provided list)
   * and writes the resolved versions to the lock file.
   */
  lock(ranges?: Record<string, string>): void;

  /**
   * Verify that the lock file is consistent with the current registry state.
   * Returns true if all locked versions still exist and content hashes match.
   */
  verifyLock(): boolean;

  // ── Changelog ────────────────────────────────────────────────────

  /**
   * Get the changelog for a prompt as a string.
   */
  getChangelog(name: string): string;

  // ── Export ────────────────────────────────────────────────────────

  /**
   * Export a prompt version as a standalone artifact.
   * Returns the content and metadata in a self-contained object,
   * suitable for embedding in deployment artifacts.
   */
  export(name: string, versionOrRange?: string): {
    name: string;
    version: string;
    content: string;
    format: ContentFormat;
    metadata: VersionMetadata;
    changelog: string;
  };
}
```

### Error Classes

```typescript
/** Base error for all prompt-version errors. */
class PromptVersionError extends Error {
  readonly code: string;
}

/** Thrown when a prompt name is not found in the registry. */
class PromptNotFoundError extends PromptVersionError {
  readonly code = 'PROMPT_NOT_FOUND';
  readonly promptName: string;
}

/** Thrown when no version satisfies the requested range. */
class VersionNotFoundError extends PromptVersionError {
  readonly code = 'VERSION_NOT_FOUND';
  readonly promptName: string;
  readonly range: string;
}

/** Thrown when an invalid state transition is attempted. */
class InvalidStateTransitionError extends PromptVersionError {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly promptName: string;
  readonly version: string;
  readonly currentState: LifecycleState;
  readonly targetState: LifecycleState;
}

/** Thrown when a draft version is modified while not in draft state. */
class ImmutableVersionError extends PromptVersionError {
  readonly code = 'IMMUTABLE_VERSION';
  readonly promptName: string;
  readonly version: string;
}

/** Thrown when the lock file content hash does not match the actual file. */
class LockIntegrityError extends PromptVersionError {
  readonly code = 'LOCK_INTEGRITY_ERROR';
  readonly promptName: string;
  readonly expectedHash: string;
  readonly actualHash: string;
}

/** Thrown when a prompt name already exists during creation. */
class PromptExistsError extends PromptVersionError {
  readonly code = 'PROMPT_EXISTS';
  readonly promptName: string;
}

/** Thrown when the registry is not initialized. */
class RegistryNotInitializedError extends PromptVersionError {
  readonly code = 'REGISTRY_NOT_INITIALIZED';
  readonly registryDir: string;
}
```

### Example: Basic Usage

```typescript
import { createRegistry } from 'prompt-version';

const registry = createRegistry({ registryDir: './prompts' });

// Load the latest published version
const prompt = registry.getPrompt('greeting');
console.log(prompt.content);   // The prompt text
console.log(prompt.version);   // '1.2.0'
console.log(prompt.format);    // 'markdown'

// Load a specific range
const compat = registry.getPrompt('greeting', '^1.0.0');
console.log(compat.version);   // '1.2.0' (latest 1.x)

// Load an exact version
const exact = registry.getPrompt('greeting', '1.0.0');
console.log(exact.version);    // '1.0.0'

// Load a message-array prompt
const codeReview = registry.getPrompt('code-review');
console.log(codeReview.messages);  // [{ role: 'system', content: '...' }, ...]
```

### Example: Version Management

```typescript
import { createRegistry } from 'prompt-version';

const registry = createRegistry();

// Create a new prompt
registry.createPrompt('summarizer', {
  description: 'Summarizes long documents into concise bullet points.',
  content: 'You are a document summarizer. Provide 3-5 bullet points.',
  format: 'markdown',
  author: 'alice',
  tags: ['internal'],
});

// Publish the initial draft
registry.publish('summarizer', '1.0.0');

// Bump to 1.1.0 with a new changelog entry
const v110 = registry.bump('summarizer', {
  type: 'minor',
  changelog: 'Added few-shot examples for scientific papers.',
  author: 'bob',
});

// Update the draft content
registry.updateDraft('summarizer', v110.version, `
You are a document summarizer. Provide 3-5 bullet points.

## Examples
Input: [long scientific paper about quantum computing]
Output:
- Quantum supremacy achieved with 72-qubit processor
- Error correction rates improved by 40%
- New algorithm reduces decoherence time
`);

// Publish when ready
registry.publish('summarizer', '1.1.0');

// Deprecate the old version
registry.deprecate('summarizer', '1.0.0', 'Upgrade to 1.1.0 for improved summarization quality.');
```

---

## 8. CLI Interface

### Installation and Invocation

```bash
# Global install
npm install -g prompt-version
prompt-version init

# npx (no install)
npx prompt-version init

# Package script
# package.json: { "scripts": { "prompts:list": "prompt-version list" } }
npm run prompts:list
```

### CLI Binary Name

`prompt-version`

### Commands

```
prompt-version <command> [options]

Commands:
  init                          Initialize a prompt registry in the current directory.
  new <name>                    Create a new prompt in the registry.
  bump <name> <type>            Create a new version of a prompt.
  publish <name> <version>      Publish a draft version.
  deprecate <name> <version>    Deprecate a published version.
  archive <name> <version>      Archive a published or deprecated version.
  list [name]                   List all prompts, or all versions of a specific prompt.
  resolve <name> <range>        Resolve a semver range to an exact version.
  diff <name> <v1> <v2>         Show the diff between two versions of a prompt.
  changelog <name>              Display the changelog for a prompt.
  export <name> [version]       Export a prompt version for deployment.
  lock                          Generate or update the lock file.
  verify                        Verify lock file integrity.

Init options:
  --dir <path>                  Registry directory. Default: ./prompts
  --format <format>             Default content format. Values: markdown, text, messages.
                                Default: markdown.

New options:
  --description <text>          Prompt description (required).
  --format <format>             Content format. Default: registry default.
  --author <name>               Author name. Default: git config user.name.
  --tag <tag>                   Tag for categorization (repeatable).
  --content <text>              Initial prompt content. If not provided, opens $EDITOR.
  --file <path>                 Read initial content from a file.
  --publish                     Immediately publish the initial version (skip draft).

Bump options:
  <type>                        Bump type: major, minor, patch, prerelease.
  --changelog <text>            Changelog entry (required unless --no-changelog).
  --no-changelog                Skip changelog entry.
  --author <name>               Author name.
  --preid <id>                  Pre-release identifier (for prerelease bumps).
                                Example: --preid beta -> 1.2.0-beta.1
  --model <model>               Model compatibility hint (repeatable).
  --tag <tag>                   Tag for the new version (repeatable).
  --publish                     Immediately publish the new version (skip draft).
  --content <text>              New prompt content. If not provided, copies from
                                the previous version.
  --file <path>                 Read new content from a file.
  --edit                        Open $EDITOR to edit the new version's content.

Deprecate options:
  --message <text>              Deprecation message (required).

List options:
  --json                        Output as JSON.
  --state <state>               Filter versions by lifecycle state.
  --verbose                     Show full metadata for each version.

Resolve options:
  --include-drafts              Include draft versions in resolution.
  --include-prerelease          Include pre-release versions.
  --exclude-deprecated          Exclude deprecated versions.

Diff options:
  --format <format>             Output format. Values: terminal, json, markdown.
                                Default: terminal.
  --no-color                    Disable colored output.

Export options:
  --output <path>               Write exported prompt to a file instead of stdout.
  --format <format>             Export format. Values: raw, json, bundle.
                                Default: raw.

Lock options:
  --update                      Update existing lock file resolutions.
  --add <name>=<range>          Add a prompt range to the lock file (repeatable).

General:
  --registry <path>             Registry directory override.
  --version                     Print version and exit.
  --help                        Print help and exit.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success. Command completed successfully. |
| `1` | Error. Prompt not found, version not found, invalid state transition, or other operational error. |
| `2` | Configuration error. Invalid flags, missing required arguments, registry not initialized, or file I/O failure. |

### Command Examples

**Initialize a registry:**

```
$ prompt-version init
Created prompt registry at ./prompts/
  prompt-registry.json (manifest)
  prompt-versions.lock (lock file)
```

**Create a new prompt:**

```
$ prompt-version new greeting \
    --description "Friendly greeting for customer interactions" \
    --content "You are a friendly customer support agent. Greet the customer warmly." \
    --author alice \
    --tag customer-facing

Created prompt 'greeting' v1.0.0 (draft)
  prompts/greeting/1.0.0/prompt.md
  prompts/greeting/CHANGELOG.md
```

**Bump a version:**

```
$ prompt-version bump greeting minor \
    --changelog "Added examples for handling returns and billing inquiries" \
    --author bob \
    --publish

Created prompt 'greeting' v1.1.0 (published)
  prompts/greeting/1.1.0/prompt.md
  Updated prompts/greeting/CHANGELOG.md
  Updated prompts/prompt-registry.json
```

**List prompts:**

```
$ prompt-version list

  prompt-version registry (./prompts)

  NAME               LATEST    PUBLISHED   VERSIONS   TAGS
  greeting           1.1.0     1.1.0       2          customer-facing
  code-review        1.0.0     1.0.0       1          internal, engineering
  customer-support   2.0.0     2.0.0       5          customer-facing, production
```

**List versions of a prompt:**

```
$ prompt-version list greeting

  greeting — Friendly greeting for customer interactions

  VERSION        STATE        AUTHOR    DATE          CHANGELOG
  1.0.0          deprecated   alice     2026-01-15    Initial version.
  1.1.0          published    bob       2026-02-01    Added examples for returns.
  1.2.0          published    bob       2026-03-01    Improved error handling.
  2.0.0-beta.1   draft        bob       2026-03-15    JSON output format.
```

**Resolve a range:**

```
$ prompt-version resolve greeting "^1.0.0"
greeting@1.2.0
```

**Diff two versions:**

```
$ prompt-version diff greeting 1.0.0 1.1.0

  prompt-version diff: greeting 1.0.0 -> 1.1.0

  + Added section: Examples
  ~ Modified section: Instructions
    - "Greet the customer warmly."
    + "Greet the customer warmly and ask how you can help."

  Token impact: +120 tokens (45 -> 165)
```

**View changelog:**

```
$ prompt-version changelog greeting

  # Changelog: greeting

  ## [1.2.0] - 2026-03-01
  ### Changed
  - Improved error handling instruction.
  - Added two new few-shot examples for edge cases.

  ## [1.1.0] - 2026-02-01
  ### Added
  - Examples for handling returns and billing inquiries.
  ### Changed
  - Expanded greeting to ask how agent can help.

  ## [1.0.0] - 2026-01-15
  ### Added
  - Initial version.
```

**Export for deployment:**

```
$ prompt-version export greeting "^1.0.0" --format json --output deploy/greeting.json
Exported greeting@1.2.0 to deploy/greeting.json
```

### Environment Variables

All CLI options can be set via environment variables. Environment variables are overridden by explicit flags.

| Environment Variable | Equivalent Flag |
|---------------------|-----------------|
| `PROMPT_VERSION_REGISTRY` | `--registry` |
| `PROMPT_VERSION_AUTHOR` | `--author` |
| `PROMPT_VERSION_FORMAT` | `--format` (for `new` and `bump`) |
| `NO_COLOR` | `--no-color` |

---

## 9. Changelog Generation

### Overview

Each prompt maintains its own changelog file (`CHANGELOG.md`) in the prompt's directory. The changelog follows the keep-a-changelog format: a markdown file with sections per version, each containing categorized change entries.

### Automatic Generation

When `prompt-version bump` is called with a `--changelog` message, the CLI:

1. Determines the change category from the bump type:
   - `major` bump: entries under `### Changed` (breaking changes) or `### Removed`.
   - `minor` bump: entries under `### Added`.
   - `patch` bump: entries under `### Fixed`.
   - `prerelease` bump: entries under `### Added` with a pre-release note.
2. Prepends a new version section to the changelog file.
3. Includes the provided changelog message as a bullet point under the appropriate category.

### Changelog File Format

```markdown
# Changelog

All notable changes to the **greeting** prompt will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-03-01

### Changed

- Improved error handling instruction to include fallback behavior.
- Added two new few-shot examples covering refund edge cases.

## [1.1.0] - 2026-02-01

### Added

- Examples for handling returns and billing inquiries.

### Changed

- Expanded greeting to ask how agent can help.

## [1.0.0] - 2026-01-15

### Added

- Initial version of the greeting prompt.
```

### Manual Editing

The changelog is a standard markdown file. Users can edit it manually to add detail, restructure entries, or add categories not covered by the automatic generation. The CLI does not validate the changelog format beyond ensuring it can find the insertion point for new entries.

### Programmatic Access

The `getChangelog(name)` method on the registry returns the changelog content as a string. The `export()` method includes the changelog entry for the exported version.

---

## 10. Lifecycle States

### State Definitions

#### `draft`

A version that is in progress and not ready for production use.

- **Mutability**: Draft versions are the only mutable state. Their content can be updated via `updateDraft()` or `prompt-version bump --edit`.
- **Resolution**: `getPrompt()` excludes draft versions by default. Pass `includeDrafts: true` to include them.
- **Purpose**: Allows prompt engineers to iterate on a new version before committing to its content. Once the content is finalized, the version is published.
- **Deletion**: Draft versions can be deleted entirely (the version directory and manifest entry are removed). This is the only state from which deletion is allowed.

#### `published`

A version that is released and available for production use.

- **Mutability**: Published versions are immutable. Content cannot be changed.
- **Resolution**: `getPrompt()` returns published versions by default. This is the primary state for production prompts.
- **Transitions**: Can transition to `deprecated` or `archived`.

#### `deprecated`

A version that is still available but discouraged.

- **Mutability**: Immutable.
- **Resolution**: `getPrompt()` returns deprecated versions by default but emits a console warning with the deprecation message. Pass `excludeDeprecated: true` to exclude them, or `suppressDeprecationWarning: true` to silence the warning.
- **Purpose**: Allows a grace period for consumers to migrate to a newer version. The deprecation message explains why the version is deprecated and what to use instead.
- **Transitions**: Can transition to `archived`.

#### `archived`

A version that is permanently unavailable for resolution.

- **Mutability**: Immutable.
- **Resolution**: `getPrompt()` never returns archived versions, even with special options. Archived versions can only be accessed via `getMetadata()` for audit purposes.
- **Purpose**: Removes versions from active use while preserving them for historical record. Version files are retained on disk.
- **Terminal state**: No further transitions are allowed.

### State Transition Table

| From | To | Method | Validation |
|------|-----|--------|------------|
| `draft` | `published` | `publish()` | Content file must exist and be non-empty. |
| `published` | `deprecated` | `deprecate()` | Deprecation message is required. |
| `published` | `archived` | `archive()` | None. |
| `deprecated` | `archived` | `archive()` | None. |
| `draft` | (deleted) | `deleteDraft()` | Only drafts can be deleted. |

Any other transition throws `InvalidStateTransitionError`.

### Resolution Behavior by State

| State | `getPrompt()` default | With `includeDrafts` | With `excludeDeprecated` | `getMetadata()` |
|-------|----------------------|---------------------|-------------------------|-----------------|
| `draft` | Excluded | Included | Excluded | Available |
| `published` | Included | Included | Included | Available |
| `deprecated` | Included (with warning) | Included (with warning) | Excluded | Available |
| `archived` | Excluded | Excluded | Excluded | Available |

---

## 11. Range Resolution

### Overview

Range resolution maps a prompt name and semver range string to an exact version number from the registry. The resolution algorithm mirrors npm's semver range resolution, using the `semver` library for parsing and satisfaction checking.

### Supported Range Syntax

| Syntax | Example | Meaning |
|--------|---------|---------|
| Exact | `1.2.3` | Exactly version 1.2.3. |
| Caret | `^1.2.3` | `>=1.2.3 <2.0.0`. Any compatible version within the same major. |
| Tilde | `~1.2.3` | `>=1.2.3 <1.3.0`. Any version within the same minor. |
| Wildcard | `1.2.x` | `>=1.2.0 <1.3.0`. Any patch within 1.2. |
| Wildcard | `1.x` | `>=1.0.0 <2.0.0`. Any minor/patch within 1. |
| Range | `>=1.0.0 <2.0.0` | Explicit range. |
| Latest | `latest` | The latest published version (no range filtering). |
| Star | `*` | Any version (same as `latest`). |

### Resolution Algorithm

1. **Lock file check**: If the lock file exists, `useLockFile` is true, and the `(name, range)` pair is in the lock file, return the locked version. Verify the content hash matches. If the hash does not match, throw `LockIntegrityError`.

2. **Collect candidates**: Read all versions of the named prompt from the manifest. Filter by lifecycle state based on options (`includeDrafts`, `excludeDeprecated`). Archived versions are always excluded.

3. **Apply range filter**: For each candidate version, check if it satisfies the semver range using `semver.satisfies(version, range, { includePrerelease })`. For the `latest` range, all candidates pass.

4. **Sort and select**: Sort satisfying versions by semver precedence (descending). Select the highest version. For `latest`, this is the highest published version.

5. **Handle deprecated**: If the selected version is `deprecated` and `excludeDeprecated` is not set, emit a console warning with the deprecation message.

6. **Return**: Return the resolved version string (for `resolve()`) or load and return the full `ResolvedPrompt` (for `getPrompt()`).

### Resolution Examples

Given a prompt `greeting` with published versions `1.0.0`, `1.1.0`, `1.2.0`, `2.0.0` and draft version `2.1.0-beta.1`:

| Range | Resolved Version | Notes |
|-------|-----------------|-------|
| `latest` | `2.0.0` | Latest published. |
| `^1.0.0` | `1.2.0` | Latest 1.x published. |
| `~1.1.0` | `1.1.0` | Latest 1.1.x. |
| `1.0.0` | `1.0.0` | Exact match. |
| `>=1.0.0 <1.2.0` | `1.1.0` | Highest in range. |
| `^2.0.0` | `2.0.0` | Latest 2.x published. |
| `^2.0.0` (with `includePrerelease`) | `2.1.0-beta.1` | Pre-release included. |
| `^3.0.0` | `null` (error) | No version satisfies. |
| `*` | `2.0.0` | Any version (latest published). |

### Lock File Interaction

When the lock file contains a resolution for a `(name, range)` pair:

```json
{
  "greeting": {
    "range": "^1.0.0",
    "resolved": "1.2.0",
    "contentHash": "sha256:abc123..."
  }
}
```

A call to `getPrompt("greeting", "^1.0.0")` returns version `1.2.0` directly, without scanning the manifest. If version `1.3.0` has been published since the lock file was generated, it is not used. This ensures reproducibility.

To update the lock file with new resolutions, run `prompt-version lock --update`. To bypass the lock file for a single call, pass `bypassLock: true`.

---

## 12. Lock File

### Purpose

The lock file provides reproducible prompt resolution. Without a lock file, `getPrompt("greeting", "^1.0.0")` resolves to the latest compatible version at the time of the call. If a new version `1.3.0` is published between two builds, the two builds use different prompt content. The lock file eliminates this variance by pinning exact versions.

### File Format

The lock file is `prompt-versions.lock` in JSON format, stored in the registry directory.

```json
{
  "version": 1,
  "generatedAt": "2026-03-18T14:30:00.000Z",
  "lockfileVersion": 1,
  "resolutions": {
    "greeting": {
      "range": "^1.0.0",
      "resolved": "1.2.0",
      "contentHash": "sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
    },
    "code-review": {
      "range": "latest",
      "resolved": "1.0.0",
      "contentHash": "sha256:f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5"
    },
    "customer-support": {
      "range": "~2.0.0",
      "resolved": "2.0.3",
      "contentHash": "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }
  }
}
```

### Lock File Lifecycle

1. **Generation**: Running `prompt-version lock` or `prompt-version lock --add greeting=^1.0.0` performs resolution for all specified ranges and writes the results to the lock file.

2. **Usage**: When `getPrompt()` is called and the lock file exists, the locked version is used. The content hash is verified against the actual file on disk. A mismatch indicates that the version's content was modified after locking (a violation of immutability for published versions), and `LockIntegrityError` is thrown.

3. **Update**: Running `prompt-version lock --update` re-resolves all ranges in the existing lock file and writes updated resolutions. This is used when new versions have been published and the team wants to adopt them.

4. **Verification**: Running `prompt-version verify` checks that all locked versions exist in the registry and that content hashes match. This is suitable for CI pipelines.

### CI/CD Integration

In CI/CD pipelines, the lock file ensures that the exact prompt content used during testing is the same content deployed to production:

```yaml
# GitHub Actions example
steps:
  - name: Verify prompt lock file
    run: npx prompt-version verify
    # Fails the build if lock file is inconsistent

  - name: Export prompts for deployment
    run: |
      npx prompt-version export greeting --format json --output dist/prompts/greeting.json
      npx prompt-version export code-review --format json --output dist/prompts/code-review.json
```

---

## 13. Integration

### Git Workflow

`prompt-version` is designed to integrate naturally with git-based development workflows.

**Branch strategy:**

```bash
# Create a feature branch for a prompt change
git checkout -b feat/greeting/add-error-handling

# Bump the version
prompt-version bump greeting minor \
  --changelog "Added error handling instructions" \
  --publish

# Commit the version files and manifest
git add prompts/greeting/1.3.0/ prompts/prompt-registry.json prompts/greeting/CHANGELOG.md
git commit -m "feat(greeting): add error handling instructions (v1.3.0)"

# Create a PR
gh pr create --title "feat(greeting): add error handling (v1.3.0)"
```

**Git tags:**

Teams can optionally tag prompt versions in git for additional traceability:

```bash
git tag "prompt/greeting/1.3.0" -m "greeting prompt v1.3.0: added error handling"
```

**Pull request diffs:**

Because each version is a new directory (not a modification of existing files), PR diffs clearly show what was added. The manifest diff shows the version metadata. The changelog diff shows the entry. The content file diff shows the prompt text. Reviewers can assess the change without specialized tooling.

### Integration with `prompt-diff`

`prompt-version` integrates with `prompt-diff` (a sibling package in this monorepo) for semantic comparison of prompt versions. The `prompt-version diff` CLI command uses `prompt-diff` under the hood when it is installed:

```bash
# Shows structural, semantic diff between two versions
prompt-version diff greeting 1.2.0 1.3.0

# Falls back to a simple text diff if prompt-diff is not installed
```

When `prompt-diff` is available, the diff output includes change classification (instruction added, constraint tightened, variable renamed), severity assessments, and token impact analysis. When it is not available, `prompt-version` falls back to a basic line-by-line text diff using Node.js built-ins.

### Integration with `prompt-lint`

`prompt-version` integrates with `prompt-lint` for pre-publish validation. When `prompt-lint` is installed, the `publish` command can optionally run lint checks before transitioning to the `published` state:

```bash
# Lint the prompt before publishing (when prompt-lint is installed)
prompt-version publish greeting 1.3.0 --lint

# Or run lint manually before publishing
npx prompt-lint prompts/greeting/1.3.0/prompt.md
prompt-version publish greeting 1.3.0
```

### Integration with `prompt-inherit`

Prompts created with `prompt-inherit` (composable, inheritable prompt definitions) can be versioned with `prompt-version`. The workflow is:

1. Define prompts using `prompt-inherit`'s `definePrompt()` and `.extend()` API.
2. Render the final prompt to a string or message array.
3. Store the rendered output as a versioned prompt in the `prompt-version` registry.
4. At runtime, load the versioned prompt with `getPrompt()`.

This separates the authoring concern (composition and inheritance) from the versioning concern (immutable snapshots and semver resolution).

### CI/CD Deployment Patterns

**Environment-based resolution:**

```typescript
const registry = createRegistry();

// In development: use latest, bypass lock
const devPrompt = registry.getPrompt('greeting', 'latest', { bypassLock: true });

// In production: use lock file for reproducibility
const prodPrompt = registry.getPrompt('greeting', '^1.0.0');
```

**Rollback:**

```bash
# If v1.3.0 causes issues in production, pin to v1.2.0
# Option 1: Update the lock file
prompt-version lock --add greeting=1.2.0

# Option 2: Change the range in application code
# getPrompt('greeting', '1.2.0')  // exact version
```

**Deployment artifact export:**

```bash
# Export all production prompts to a deployment bundle
for prompt in $(prompt-version list --json | jq -r '.[].name'); do
  prompt-version export "$prompt" --format json --output "dist/prompts/${prompt}.json"
done
```

---

## 14. Configuration

### Configuration File

`prompt-version` searches for a configuration file in the current directory and ancestor directories, using the first one found:

1. `.prompt-version.json`
2. `.prompt-version.yaml`
3. `prompt-version` key in `package.json`

The `--registry` flag overrides auto-detection of the registry directory.

### Configuration File Format

```json
{
  "registryDir": "./prompts",
  "lockFile": "./prompts/prompt-versions.lock",
  "useLockFile": true,
  "defaultFormat": "markdown",
  "defaultAuthor": "team-ai",
  "lintBeforePublish": false,
  "autoPublish": false,
  "contentHashAlgorithm": "sha256"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `registryDir` | `string` | `'./prompts'` | Path to the registry directory. |
| `lockFile` | `string` | `'<registryDir>/prompt-versions.lock'` | Path to the lock file. |
| `useLockFile` | `boolean` | `true` | Whether `getPrompt()` uses the lock file. |
| `defaultFormat` | `string` | `'markdown'` | Default content format for new prompts. |
| `defaultAuthor` | `string` | git user.name or `'unknown'` | Default author for new versions. |
| `lintBeforePublish` | `boolean` | `false` | Run `prompt-lint` before publishing (requires `prompt-lint` installed). |
| `autoPublish` | `boolean` | `false` | Auto-publish versions on bump (skip draft state). |
| `contentHashAlgorithm` | `string` | `'sha256'` | Hash algorithm for lock file content verification. |

### Configuration Precedence

Configuration is resolved in this order (later sources override earlier):

1. Built-in defaults.
2. Configuration file (`.prompt-version.json` or equivalent).
3. Environment variables.
4. CLI flags.
5. Programmatic `RegistryConfig` in API calls.

---

## 15. Testing Strategy

### Unit Tests

Unit tests verify each component in isolation.

- **Manifest parser tests**: Test reading and writing `prompt-registry.json`. Verify that prompts, versions, and metadata are correctly serialized and deserialized. Test with empty registries, single-prompt registries, and registries with many prompts and versions.

- **Version resolution tests**: For each supported range syntax (`^`, `~`, `x`, exact, `latest`, `*`, explicit range), verify that the correct version is resolved from a set of candidate versions. Test with various lifecycle state filters (`includeDrafts`, `excludeDeprecated`). Test pre-release version inclusion and exclusion. Test resolution with no satisfying version (expect error). Test resolution with a single candidate. Test resolution with many candidates.

- **Lifecycle state transition tests**: For each valid transition (`draft -> published`, `published -> deprecated`, `published -> archived`, `deprecated -> archived`), verify the transition succeeds and updates the manifest. For each invalid transition (e.g., `published -> draft`, `archived -> published`), verify that `InvalidStateTransitionError` is thrown.

- **Lock file tests**: Test lock file generation with multiple prompts and ranges. Test lock file reading and version lookup. Test content hash verification (matching hash, mismatched hash). Test `verifyLock()` with consistent and inconsistent states. Test `bypassLock` option.

- **Prompt creation tests**: Test creating a prompt with all options. Test that duplicate names are rejected. Test name validation (invalid characters, too long, empty). Test that the directory structure is created correctly.

- **Version bump tests**: Test bumping major, minor, patch, and prerelease. Verify that the new version number is computed correctly. Verify that the previous version's content is copied. Verify that the manifest is updated. Test bumping from a pre-release version.

- **Content loading tests**: Test loading markdown, text, and JSON message array formats. Test that JSON message arrays are parsed into `PromptMessage[]`. Test loading files with various encodings (UTF-8, ASCII). Test loading empty files (expect error on publish).

- **Changelog generation tests**: Test that bump commands produce correct changelog entries. Test the keep-a-changelog format. Test changelog with multiple versions. Test that manual edits to the changelog are preserved.

- **Export tests**: Test raw export (content only), JSON export (content + metadata), and bundle export. Test export with exact version and range resolution.

- **Error handling tests**: For each error class (`PromptNotFoundError`, `VersionNotFoundError`, `InvalidStateTransitionError`, `ImmutableVersionError`, `LockIntegrityError`, `PromptExistsError`, `RegistryNotInitializedError`), verify the error is thrown in the correct circumstance with the correct properties.

- **Configuration tests**: Test configuration file discovery (`.prompt-version.json`, `package.json` key). Test precedence (defaults < config file < env vars < flags < programmatic). Test invalid configuration (unknown fields, wrong types).

### Integration Tests

Integration tests exercise the full lifecycle from registry initialization through prompt resolution.

- **Full lifecycle test**: Initialize a registry, create a prompt, publish it, bump to a new version, publish the bump, deprecate the old version, archive the old version, resolve the latest version, and verify the content. This is the critical path.

- **Multi-prompt test**: Create three prompts, each with multiple versions. Resolve ranges for all three. Verify that resolutions are independent.

- **Lock file round-trip test**: Create prompts, generate a lock file, add new versions, verify that locked resolution still returns the old version, update the lock file, verify that resolution returns the new version.

- **Git integration test**: Initialize a registry in a git repository. Create a prompt, commit. Bump a version, commit. Verify that git log shows clean, atomic commits. Verify that git diff for a version bump shows only the new version directory and manifest changes.

- **CLI end-to-end tests**: Run CLI commands (`init`, `new`, `bump`, `publish`, `list`, `resolve`, `diff`, `changelog`, `export`, `lock`, `verify`) against a temporary directory and verify stdout output, exit codes, and filesystem state.

- **Deprecation warning test**: Create a prompt, publish, deprecate, resolve. Verify that a warning is emitted to stderr. Verify that `suppressDeprecationWarning` suppresses it. Verify that `excludeDeprecated` excludes it.

- **Pre-release test**: Create a prompt, bump to a pre-release version, verify it is excluded from default resolution, verify it is included with `includePrerelease`.

### Edge Cases to Test

- Empty registry (no prompts).
- Prompt with a single version.
- Prompt with 100+ versions (performance test).
- Version directory that exists on disk but is missing from the manifest (inconsistency detection).
- Manifest entry for a version whose directory does not exist (inconsistency detection).
- Prompt name with maximum allowed length (128 characters).
- Prompt content file exceeding 1 MB.
- Concurrent `bump` calls for the same prompt (file locking is not in scope; test that the manifest is consistent after sequential operations).
- Registry directory that does not exist (expect `RegistryNotInitializedError`).
- Lock file that references a version that has been archived (expect error or re-resolution).

### Test Framework

Tests use Vitest, matching the project's existing `package.json` configuration. Test fixtures create temporary directories using `node:fs/promises.mkdtemp` and clean up after each test. No fixtures are committed to the repository; all test state is generated dynamically.

---

## 16. Performance

### Registry Loading

The manifest file (`prompt-registry.json`) is read once when `createRegistry()` is called and cached in memory. Subsequent `getPrompt()`, `resolve()`, `listPrompts()`, and `listVersions()` calls operate on the in-memory manifest without additional I/O. For a registry with 100 prompts and 20 versions each (2,000 total versions), manifest parsing completes in under 5ms.

### Version Resolution

Version resolution iterates over the versions of a single prompt, checks lifecycle state, and calls `semver.satisfies()` for each candidate. For a prompt with 100 versions and a typical range (`^1.0.0`), resolution completes in under 1ms. The `semver` library's `satisfies()` function is highly optimized for this use case.

### Content Loading

Prompt content is loaded from disk only when `getPrompt()` is called (not during resolution). Content files are read using `node:fs.readFileSync`. For a 10 KB prompt file, I/O completes in under 1ms. For a 100 KB prompt file, I/O completes in under 5ms. Content is not cached across calls; each `getPrompt()` call reads from disk. This ensures freshness for draft versions that may be modified between calls.

### Lock File

Lock file reading is O(1) per resolution: it is a direct key lookup in the `resolutions` object. Hash verification adds a single `crypto.createHash()` call per resolution, which completes in under 1ms for any realistic prompt size.

### Memory

The in-memory manifest holds metadata for all prompts and versions but not content. For a registry with 100 prompts and 20 versions each, the manifest uses approximately 200 KB of memory (metadata strings and objects). Prompt content is loaded on demand and not retained.

### Startup

`createRegistry()` reads the manifest file and optionally the lock file. For typical registries, startup completes in under 10ms. There is no background initialization, no network I/O, and no deferred loading.

---

## 17. Dependencies

### Runtime Dependencies

| Dependency | Purpose | Why Not Built-In |
|---|---|---|
| `semver` | Semver parsing, comparison, range satisfaction, version incrementing. | Semver range resolution (caret, tilde, wildcard, pre-release handling) is complex. `node-semver` is the reference implementation used by npm itself, is thoroughly tested, and is 50 KB. Re-implementing it would be error-prone and provide no benefit. |

### Why Minimal Dependencies

- **No CLI framework**: `node:util.parseArgs` (available since Node.js 18) handles all flag parsing. No dependency on `commander`, `yargs`, or `meow`.
- **No YAML parser**: The configuration file supports JSON format natively. YAML configuration uses a minimal inline parser for the simple key-value subset used by configuration files. Users with complex YAML needs can use JSON.
- **No chalk/colors**: Terminal coloring uses ANSI escape codes directly. Color detection uses `process.stdout.isTTY` and the `NO_COLOR` environment variable.
- **No file-watching library**: The registry operates on-demand (read when called, write when mutated). There is no file watcher or hot reload.
- **No prompt-diff dependency**: `prompt-diff` integration is optional. When installed, it is loaded dynamically via `require.resolve()`. When not installed, a basic text diff fallback is used.

### Node.js Built-ins Used

| Node.js Built-in | Purpose |
|---|---|
| `node:fs` and `node:fs/promises` | Reading and writing prompt files, manifest, lock file, and changelogs. |
| `node:path` | Path resolution, directory creation, file extension detection. |
| `node:crypto` | SHA-256 hashing for lock file content verification. |
| `node:util` | `parseArgs` for CLI argument parsing (Node.js 18+). |
| `node:process` | Exit codes, environment variables, `cwd()`. |
| `node:child_process` | Reading `git config user.name` for default author (optional, fails silently). |

### Dev Dependencies

| Dependency | Purpose |
|---|---|
| `typescript` | TypeScript compiler. |
| `vitest` | Test runner. |
| `eslint` | Linter for source code. |

---

## 18. File Structure

```
prompt-version/
  package.json
  tsconfig.json
  SPEC.md
  README.md
  .prompt-version.json              Example configuration (also used for self-testing).
  src/
    index.ts                        Public API exports: createRegistry, initRegistry,
                                    and all types.
    types.ts                        All TypeScript type definitions (RegistryConfig,
                                    VersionMetadata, ResolvedPrompt, GetPromptOptions,
                                    BumpOptions, LockResolution, etc.).
    registry.ts                     PromptRegistry class implementation: getPrompt,
                                    resolve, listPrompts, listVersions, getMetadata,
                                    createPrompt, bump, updateDraft, publish,
                                    deprecate, archive, lock, verifyLock,
                                    getChangelog, export.
    manifest/
      index.ts                      Manifest entry point: read, write, validate.
      reader.ts                     Reads and parses prompt-registry.json.
      writer.ts                     Writes prompt-registry.json atomically (write
                                    to temp file, rename).
      validator.ts                  Validates manifest structure and consistency.
    resolver/
      index.ts                      Resolution entry point: resolve(name, range,
                                    options).
      range-resolver.ts             Semver range resolution against version
                                    candidates. Uses the semver library.
      lock-resolver.ts              Lock file resolution: checks lock file for
                                    cached resolution, verifies content hash.
      state-filter.ts               Filters version candidates by lifecycle state
                                    and options (includeDrafts, excludeDeprecated,
                                    includePrerelease).
    lifecycle/
      index.ts                      Lifecycle state management entry point.
      state-machine.ts              State transition validation and execution.
      publish.ts                    Draft -> published transition logic (content
                                    validation, immutability enforcement).
      deprecate.ts                  Published -> deprecated transition logic
                                    (deprecation message recording).
      archive.ts                    Published|deprecated -> archived transition.
    storage/
      index.ts                      Storage entry point: read/write prompt content
                                    and metadata files.
      content-reader.ts             Reads prompt content files (markdown, text,
                                    JSON message arrays).
      content-writer.ts             Writes prompt content files to version
                                    directories.
      meta-reader.ts                Reads meta.json files.
      meta-writer.ts                Writes meta.json files.
      hash.ts                       SHA-256 content hashing for lock file integrity.
      directory.ts                  Directory creation, version directory management,
                                    path resolution.
    changelog/
      index.ts                      Changelog entry point.
      generator.ts                  Generates changelog entries from bump options.
      writer.ts                     Appends entries to CHANGELOG.md in keep-a-
                                    changelog format.
      reader.ts                     Reads and parses CHANGELOG.md.
    lock/
      index.ts                      Lock file entry point.
      reader.ts                     Reads and parses prompt-versions.lock.
      writer.ts                     Writes prompt-versions.lock.
      verifier.ts                   Verifies lock file consistency (version exists,
                                    hash matches).
    config.ts                       Configuration loading: file discovery, env var
                                    reading, precedence merging.
    errors.ts                       Error classes: PromptVersionError,
                                    PromptNotFoundError, VersionNotFoundError,
                                    InvalidStateTransitionError, ImmutableVersionError,
                                    LockIntegrityError, PromptExistsError,
                                    RegistryNotInitializedError.
    cli.ts                          CLI entry point: argument parsing, command
                                    dispatch, output formatting, exit codes.
    utils/
      git.ts                        Git utilities: read user.name from git config.
      text.ts                       Text utilities: name validation, slug generation.
      format.ts                     Output formatting: tables, colored text,
                                    JSON serialization.
  src/__tests__/
    manifest/
      reader.test.ts
      writer.test.ts
      validator.test.ts
    resolver/
      range-resolver.test.ts
      lock-resolver.test.ts
      state-filter.test.ts
    lifecycle/
      state-machine.test.ts
      publish.test.ts
      deprecate.test.ts
      archive.test.ts
    storage/
      content-reader.test.ts
      content-writer.test.ts
      hash.test.ts
      directory.test.ts
    changelog/
      generator.test.ts
      writer.test.ts
      reader.test.ts
    lock/
      reader.test.ts
      writer.test.ts
      verifier.test.ts
    registry.test.ts                PromptRegistry class unit tests (full API).
    config.test.ts                  Configuration loading tests.
    errors.test.ts                  Error class tests.
    integration.test.ts             Full lifecycle integration tests.
    cli.test.ts                     CLI end-to-end tests.
  bin/
    prompt-version.js               CLI binary entry point (#!/usr/bin/env node).
  dist/                             Compiled output (gitignored).
```

---

## 19. Implementation Roadmap

### Phase 1: Registry, Storage, and Basic Resolution (v0.1.0)

Implement the file-based registry, manifest management, and basic prompt creation and resolution.

**Deliverables:**
- `initRegistry()` function: creates registry directory, manifest file, lock file.
- `createRegistry()` function: reads manifest, returns `PromptRegistry` instance.
- Manifest reader/writer: serialization and deserialization of `prompt-registry.json`.
- `createPrompt()`: creates prompt directory, initial version, metadata, and changelog.
- `getPrompt()` with exact version resolution (no ranges yet).
- `listPrompts()` and `listVersions()` for basic listing.
- `getMetadata()` for version metadata access.
- Content reader: supports markdown, text, and JSON message array formats.
- Directory structure management: version directory creation, path resolution.
- Error classes for all error conditions.
- CLI: `init`, `new`, `list` commands.
- Unit tests for manifest, storage, and resolution.
- Integration test for the create-and-load path.

### Phase 2: Semver Range Resolution and Version Bumping (v0.2.0)

Add semver range resolution, version bumping, and the lifecycle state machine.

**Deliverables:**
- `semver` dependency integration: range parsing, satisfaction checking, version incrementing.
- `resolve()` method: full range resolution with all supported syntax (`^`, `~`, `x`, `latest`, `*`, explicit ranges).
- `getPrompt()` with range resolution: resolves range, loads content, returns `ResolvedPrompt`.
- `bump()` method: computes next version, creates version directory, copies content, updates manifest.
- `updateDraft()` method: modifies content of draft versions.
- Lifecycle state machine: `publish()`, `deprecate()`, `archive()`.
- State-aware resolution: `includeDrafts`, `excludeDeprecated`, `includePrerelease` options.
- Deprecation warnings on resolution.
- Pre-release version support.
- CLI: `bump`, `publish`, `deprecate`, `archive`, `resolve` commands.
- Unit tests for range resolution, bumping, lifecycle transitions.

### Phase 3: Lock File, Changelog, and Diff (v0.3.0)

Add the lock file system, changelog generation, and version diffing.

**Deliverables:**
- Lock file reader/writer: serialization and deserialization of `prompt-versions.lock`.
- Lock file generation: `lock()` method resolves all ranges and writes lock file.
- Lock file resolution: `getPrompt()` checks lock file before live resolution.
- Content hash verification: SHA-256 hashing, `LockIntegrityError` on mismatch.
- `verifyLock()` method: consistency verification for CI pipelines.
- Changelog generator: creates keep-a-changelog entries from bump options.
- Changelog writer: appends entries to `CHANGELOG.md`.
- `getChangelog()` method: returns changelog content.
- `diff` command: basic text diff between two versions (uses `prompt-diff` if installed, falls back to line-by-line diff).
- CLI: `lock`, `verify`, `changelog`, `diff` commands.
- Unit tests for lock file, changelog, and diff.
- Integration tests for lock file round-trips and changelog generation.

### Phase 4: Export, Configuration, and Polish (v0.4.0)

Add export functionality, configuration file support, and CLI refinements.

**Deliverables:**
- `export()` method: raw, JSON, and bundle export formats.
- Configuration file discovery and loading (`.prompt-version.json`, `package.json` key).
- Environment variable support for CLI options.
- `--edit` flag for `bump` command (opens `$EDITOR`).
- `--file` flag for `new` and `bump` commands (read content from file).
- `--json` output for `list` command.
- `--lint` flag for `publish` command (optional `prompt-lint` integration).
- Colored terminal output with `NO_COLOR` support.
- CLI help text and `--version` flag.
- Complete README with usage examples, API reference, and integration guide.
- Edge case testing (large registries, long names, empty content, concurrent operations).

### Phase 5: Stabilization and 1.0 (v1.0.0)

Stabilize the API and prepare for production use.

**Deliverables:**
- API stability guarantee (semver major version).
- Comprehensive edge case and performance testing.
- TypeScript type refinements for improved IntelliSense.
- Published npm package with TypeScript declarations.
- CHANGELOG for the package itself.
- Integration documentation for `prompt-diff`, `prompt-lint`, and `prompt-inherit`.

---

## 20. Example Use Cases

### 20.1 Creating and Evolving a Customer Support Prompt

A team creates a customer support prompt and iterates on it over several versions.

```typescript
import { initRegistry, createRegistry } from 'prompt-version';

// Initialize the registry (once)
initRegistry({ registryDir: './prompts' });

const registry = createRegistry({ registryDir: './prompts' });

// Create the initial prompt
registry.createPrompt('customer-support', {
  description: 'System prompt for customer support chatbot.',
  content: `You are a customer support agent for ACME Corp.
Answer questions about our products and services.
Be friendly and concise.`,
  author: 'alice',
  tags: ['customer-facing', 'production'],
});

// Publish the initial version
registry.publish('customer-support', '1.0.0');

// Later: add error handling (minor bump)
const v110 = registry.bump('customer-support', {
  type: 'minor',
  changelog: 'Added error handling instructions for unknown queries.',
  author: 'bob',
});

registry.updateDraft('customer-support', v110.version, `You are a customer support agent for ACME Corp.
Answer questions about our products and services.
Be friendly and concise.

If you do not know the answer, say: "I'm not sure about that.
Let me connect you with a specialist who can help."

Do not make up information.`);

registry.publish('customer-support', '1.1.0');

// Later: change output format to JSON (major bump)
const v200 = registry.bump('customer-support', {
  type: 'major',
  changelog: 'Changed output format to structured JSON for API integration.',
  author: 'charlie',
  initialState: 'published',
});

// Deprecate the old major version
registry.deprecate('customer-support', '1.1.0',
  'Use v2.x for JSON output format. v1.x plain text format is no longer supported.');
registry.deprecate('customer-support', '1.0.0',
  'Use v2.x. This version lacks error handling and uses plain text format.');
```

### 20.2 Runtime Resolution in Production

An application loads prompts at startup using semver ranges for safe updates.

```typescript
import { createRegistry } from 'prompt-version';

const registry = createRegistry({ registryDir: './prompts' });

// Load the latest compatible 2.x version
const supportPrompt = registry.getPrompt('customer-support', '^2.0.0');

// Use the resolved content
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: supportPrompt.content },
    { role: 'user', content: userMessage },
  ],
});

console.log(`Using customer-support v${supportPrompt.version}`);
// "Using customer-support v2.0.0"
```

### 20.3 Lock File for Reproducible CI Builds

A CI pipeline uses the lock file to ensure consistent prompt versions across builds.

```bash
# Developer generates the lock file locally
prompt-version lock --add customer-support=^2.0.0 --add code-review=latest
git add prompts/prompt-versions.lock
git commit -m "chore: pin prompt versions"

# CI pipeline verifies and uses locked versions
# .github/workflows/deploy.yml
```

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci

      - name: Verify prompt versions
        run: npx prompt-version verify

      - name: Export prompts for deployment
        run: |
          mkdir -p dist/prompts
          npx prompt-version export customer-support --format json \
            --output dist/prompts/customer-support.json
          npx prompt-version export code-review --format json \
            --output dist/prompts/code-review.json

      - name: Deploy
        run: ./deploy.sh
```

### 20.4 A/B Testing with Pre-Release Versions

A team tests a new prompt variant using pre-release versioning before promoting it to production.

```typescript
import { createRegistry } from 'prompt-version';

const registry = createRegistry();

// Create a pre-release version for A/B testing
registry.bump('greeting', {
  type: 'prerelease',
  prereleaseId: 'experiment',
  changelog: 'Testing more conversational tone for A/B experiment.',
  author: 'alice',
  metadata: { experiment: 'conv-tone-q1-2026' },
  initialState: 'published',
});
// Creates version 1.3.0-experiment.1

// In application code: route 10% of traffic to the experiment
const isExperiment = Math.random() < 0.1;

const prompt = isExperiment
  ? registry.getPrompt('greeting', '1.3.0-experiment.1')
  : registry.getPrompt('greeting', '^1.0.0');

console.log(`Using greeting v${prompt.version} (experiment: ${isExperiment})`);
```

### 20.5 Prompt Audit Trail

A compliance team reviews the full history of a production prompt.

```bash
# List all versions with full metadata
$ prompt-version list customer-support --verbose

  customer-support — System prompt for customer support chatbot.

  VERSION   STATE         AUTHOR    DATE         CHANGELOG
  1.0.0     deprecated    alice     2026-01-15   Initial version.
  1.1.0     deprecated    bob       2026-02-01   Added error handling instructions.
  2.0.0     published     charlie   2026-03-01   Changed output to structured JSON.

# View the full changelog
$ prompt-version changelog customer-support

# Diff any two versions for review
$ prompt-version diff customer-support 1.0.0 2.0.0 --format markdown > review.md

# Export a specific historical version for analysis
$ prompt-version export customer-support 1.0.0 --format json
```

### 20.6 Shared Prompt Library Across Multiple Applications

A platform team maintains a shared prompt library that multiple services consume.

```
shared-prompts/                    Shared git repository.
  prompts/
    prompt-registry.json
    prompt-versions.lock
    greeting/
      1.0.0/
      1.1.0/
      1.2.0/
    error-handler/
      1.0.0/
    code-review/
      1.0.0/
      1.0.1/
```

Each consuming application includes the shared repository as a git submodule or npm package and creates a registry pointing to it:

```typescript
import { createRegistry } from 'prompt-version';

// Point to the shared prompt library
const sharedRegistry = createRegistry({
  registryDir: './shared-prompts/prompts',
});

// Each service uses its own semver ranges
const greeting = sharedRegistry.getPrompt('greeting', '^1.0.0');
```

The platform team publishes new versions following semver. Consuming services update their ranges or lock files when ready to adopt new versions. Breaking changes (major bumps) require explicit opt-in by updating the range.
