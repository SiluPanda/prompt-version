# prompt-version — Task Breakdown

This file tracks all implementation tasks derived from [SPEC.md](./SPEC.md). Each task is granular, actionable, and maps to a specific requirement from the spec.

---

## Phase 1: Project Scaffolding and Core Types

- [ ] **Install runtime dependency `semver`** — Add `semver` (and `@types/semver`) to `package.json`. This is the only runtime dependency. | Status: not_done
- [ ] **Install dev dependencies** — Add `vitest`, `typescript`, and `eslint` as dev dependencies (confirm versions and ensure vitest config works with `npm run test`). | Status: not_done
- [ ] **Add `bin` entry to package.json** — Add `"bin": { "prompt-version": "./bin/prompt-version.js" }` to `package.json` so the CLI binary is registered on install. | Status: not_done
- [ ] **Create `bin/prompt-version.js`** — Create the CLI binary entry point file with `#!/usr/bin/env node` shebang that imports and runs `../dist/cli.js`. | Status: not_done
- [ ] **Define all TypeScript types in `src/types.ts`** — Implement all type definitions from SPEC Section 7: `RegistryConfig`, `LifecycleState`, `ContentFormat`, `PromptMessage`, `VersionMetadata`, `PromptInfo`, `ResolvedPrompt`, `GetPromptOptions`, `BumpOptions`, `LockResolution`, and the `PromptRegistry` interface. | Status: not_done
- [ ] **Define all error classes in `src/errors.ts`** — Implement the error class hierarchy from SPEC Section 7: `PromptVersionError` (base), `PromptNotFoundError`, `VersionNotFoundError`, `InvalidStateTransitionError`, `ImmutableVersionError`, `LockIntegrityError`, `PromptExistsError`, `RegistryNotInitializedError`. Each must have the specified `code` string and relevant readonly properties. | Status: not_done
- [ ] **Create `src/index.ts` public API exports** — Export `createRegistry`, `initRegistry`, all types, and all error classes. This is the package's public surface. | Status: not_done

---

## Phase 2: Utility Modules

- [ ] **Implement `src/utils/text.ts` — name validation** — Implement prompt name validation: must match `[a-z0-9]([a-z0-9-]*[a-z0-9])?`, be a valid directory name, and have a max length of 128 characters. Export a `validatePromptName(name: string)` function that throws on invalid names. | Status: not_done
- [ ] **Implement `src/utils/git.ts` — git user.name reader** — Implement a function that reads the default author from `git config user.name` using `node:child_process.execSync`. Must fail silently (return `'unknown'`) if git is not available or not configured. | Status: not_done
- [ ] **Implement `src/utils/format.ts` — output formatting** — Implement terminal output formatting utilities: table rendering for `list` command output, ANSI colored text (with `NO_COLOR` env var and `--no-color` flag support using `process.stdout.isTTY`), and JSON serialization for `--json` output mode. | Status: not_done

---

## Phase 3: Storage Layer

- [ ] **Implement `src/storage/directory.ts` — directory management** — Implement functions for: creating the registry root directory, creating prompt directories (`<registry>/<name>/`), creating version directories (`<registry>/<name>/<version>/`), path resolution for all file types (prompt content, meta.json, CHANGELOG.md), and checking directory existence. | Status: not_done
- [ ] **Implement `src/storage/content-writer.ts` — write prompt content** — Write prompt content files to version directories. Support three formats: markdown (`.md`), plain text (`.txt`), and JSON message arrays (`.json`). Determine file extension from `ContentFormat`. | Status: not_done
- [ ] **Implement `src/storage/content-reader.ts` — read prompt content** — Read prompt content files from version directories. Return raw string for markdown/text. For JSON message arrays, read the file as string and parse into `PromptMessage[]`. Handle UTF-8 encoding. | Status: not_done
- [ ] **Implement `src/storage/meta-writer.ts` — write meta.json** — Write `meta.json` files to version directories with the full `VersionMetadata` structure as specified in SPEC Section 5. | Status: not_done
- [ ] **Implement `src/storage/meta-reader.ts` — read meta.json** — Read and parse `meta.json` files from version directories. Deserialize into `VersionMetadata`. | Status: not_done
- [ ] **Implement `src/storage/hash.ts` — SHA-256 content hashing** — Implement content hashing using `node:crypto.createHash('sha256')`. Hash the raw content file bytes and return `sha256:<hex>` format string. Used for lock file integrity verification. | Status: not_done
- [ ] **Implement `src/storage/index.ts` — storage entry point** — Re-export all storage module functions as a unified storage API. | Status: not_done

---

## Phase 4: Manifest Management

- [ ] **Implement `src/manifest/reader.ts` — read manifest** — Read and parse `prompt-registry.json` from the registry directory. Validate the top-level structure (`version`, `registry`, `createdAt`, `updatedAt`, `prompts`). Return the parsed manifest object. Throw `RegistryNotInitializedError` if the file does not exist. | Status: not_done
- [ ] **Implement `src/manifest/writer.ts` — write manifest atomically** — Write `prompt-registry.json` atomically: write to a temp file in the same directory, then rename. This prevents corruption if the process is interrupted during write. Update the `updatedAt` timestamp on every write. | Status: not_done
- [ ] **Implement `src/manifest/validator.ts` — validate manifest** — Validate manifest structure and consistency: check that all prompt entries have valid names, all version entries have required fields (`state`, `createdAt`, `author`, `contentFile`, `contentFormat`), and version strings are valid semver. | Status: not_done
- [ ] **Implement `src/manifest/index.ts` — manifest entry point** — Re-export read, write, and validate functions. | Status: not_done

---

## Phase 5: Lifecycle State Machine

- [ ] **Implement `src/lifecycle/state-machine.ts` — state transition validation** — Implement the state transition table from SPEC Section 10: `draft -> published`, `published -> deprecated`, `published -> archived`, `deprecated -> archived`. Any other transition throws `InvalidStateTransitionError`. Export a `validateTransition(current, target)` function. | Status: not_done
- [ ] **Implement `src/lifecycle/publish.ts` — draft to published** — Implement the publish transition: validate that the version is in `draft` state, validate that the content file exists and is non-empty, update the state in both `meta.json` and the manifest. After publish, the version becomes immutable. | Status: not_done
- [ ] **Implement `src/lifecycle/deprecate.ts` — published to deprecated** — Implement the deprecation transition: validate current state is `published`, require a non-empty deprecation message, update state and record `deprecationMessage` in both `meta.json` and manifest. | Status: not_done
- [ ] **Implement `src/lifecycle/archive.ts` — to archived** — Implement the archive transition: validate current state is `published` or `deprecated`, update state in both `meta.json` and manifest. Archived versions are retained on disk but excluded from all resolution. | Status: not_done
- [ ] **Implement `src/lifecycle/index.ts` — lifecycle entry point** — Re-export all lifecycle functions. | Status: not_done

---

## Phase 6: Semver Range Resolution

- [ ] **Implement `src/resolver/state-filter.ts` — filter by lifecycle state** — Filter version candidates by lifecycle state according to `GetPromptOptions`: exclude drafts by default (include with `includeDrafts`), include deprecated by default (exclude with `excludeDeprecated`), always exclude archived, exclude pre-release by default (include with `includePrerelease`). | Status: not_done
- [ ] **Implement `src/resolver/range-resolver.ts` — semver range resolution** — Resolve a semver range against a list of version candidates using the `semver` library. Support all range syntaxes: exact (`1.2.3`), caret (`^1.2.3`), tilde (`~1.2.3`), wildcard (`1.2.x`, `1.x`), explicit range (`>=1.0.0 <2.0.0`), `latest` (latest published), and star (`*`). Return the highest satisfying version or null. | Status: not_done
- [ ] **Implement `src/resolver/lock-resolver.ts` — lock file resolution** — Check the lock file for a cached `(name, range)` resolution. If found, verify the content hash against the actual file on disk. Return the locked version if hash matches, throw `LockIntegrityError` if hash mismatches. Support `bypassLock` option to skip lock file lookup. | Status: not_done
- [ ] **Implement `src/resolver/index.ts` — resolution entry point** — Orchestrate the full resolution algorithm from SPEC Section 11: (1) check lock file, (2) collect candidates from manifest, (3) filter by lifecycle state, (4) apply range filter, (5) sort and select highest, (6) handle deprecation warnings. | Status: not_done

---

## Phase 7: Changelog System

- [ ] **Implement `src/changelog/generator.ts` — generate changelog entries** — Generate keep-a-changelog entries from bump options. Map bump type to change category: `major` -> `Changed`/`Removed`, `minor` -> `Added`, `patch` -> `Fixed`, `prerelease` -> `Added` with pre-release note. Format with version header, date, and categorized bullet points. | Status: not_done
- [ ] **Implement `src/changelog/writer.ts` — write CHANGELOG.md** — Create new `CHANGELOG.md` files for new prompts (with header and `[Unreleased]` section). Prepend new version sections to existing changelogs by inserting after `## [Unreleased]`. Preserve any manual edits in the existing changelog. | Status: not_done
- [ ] **Implement `src/changelog/reader.ts` — read CHANGELOG.md** — Read and return the full changelog content as a string. Used by `getChangelog()` API method and `changelog` CLI command. | Status: not_done
- [ ] **Implement `src/changelog/index.ts` — changelog entry point** — Re-export all changelog functions. | Status: not_done

---

## Phase 8: Lock File System

- [ ] **Implement `src/lock/reader.ts` — read lock file** — Read and parse `prompt-versions.lock` from the registry directory. Validate the lock file structure (`version`, `generatedAt`, `lockfileVersion`, `resolutions`). Return null if the lock file does not exist (not an error). | Status: not_done
- [ ] **Implement `src/lock/writer.ts` — write lock file** — Write `prompt-versions.lock` with resolved version mappings. Include `version: 1`, `generatedAt` ISO timestamp, `lockfileVersion: 1`, and the `resolutions` object with `range`, `resolved`, and `contentHash` for each entry. | Status: not_done
- [ ] **Implement `src/lock/verifier.ts` — verify lock file integrity** — Verify that all locked versions exist in the registry manifest and that content hashes match the actual files on disk. Return `true` if consistent, `false` if any mismatch is found. Used by the `verify` CLI command and `verifyLock()` API method. | Status: not_done
- [ ] **Implement `src/lock/index.ts` — lock file entry point** — Re-export all lock file functions. | Status: not_done

---

## Phase 9: Configuration System

- [ ] **Implement `src/config.ts` — configuration loading** — Implement configuration file discovery: search for `.prompt-version.json`, `.prompt-version.yaml`, or `prompt-version` key in `package.json` in the current directory and ancestor directories. Implement configuration precedence: built-in defaults < config file < environment variables (`PROMPT_VERSION_REGISTRY`, `PROMPT_VERSION_AUTHOR`, `PROMPT_VERSION_FORMAT`, `NO_COLOR`) < CLI flags < programmatic `RegistryConfig`. Support all config fields from SPEC Section 14: `registryDir`, `lockFile`, `useLockFile`, `defaultFormat`, `defaultAuthor`, `lintBeforePublish`, `autoPublish`, `contentHashAlgorithm`. | Status: not_done

---

## Phase 10: Registry Class (Core API)

- [ ] **Implement `initRegistry()` in `src/registry.ts`** — Create a new prompt registry: create the registry directory if it does not exist, write an initial `prompt-registry.json` manifest (with `version: 1`, empty `prompts` object, timestamps), and write an empty `prompt-versions.lock`. Throw if the directory already contains a manifest. Return a `PromptRegistry` instance. | Status: not_done
- [ ] **Implement `createRegistry()` in `src/registry.ts`** — Open an existing registry: read the manifest file, optionally read the lock file, validate the registry is initialized. Cache the manifest in memory. Throw `RegistryNotInitializedError` if the manifest does not exist. Return a `PromptRegistry` instance. | Status: not_done
- [ ] **Implement `getPrompt()` on `PromptRegistry`** — Resolve a semver range (default `"latest"`) and load the prompt content. Use the resolution pipeline (lock file check -> candidate collection -> state filtering -> range resolution -> content loading). Return a `ResolvedPrompt` object with name, version, content string, format, parsed messages (for JSON format), and metadata. Emit deprecation warnings for deprecated versions. Throw `PromptNotFoundError` or `VersionNotFoundError` as appropriate. | Status: not_done
- [ ] **Implement `resolve()` on `PromptRegistry`** — Resolve a semver range to an exact version string without loading content. Return the version string or null. Uses the same resolution pipeline as `getPrompt()` minus the content loading step. | Status: not_done
- [ ] **Implement `listPrompts()` on `PromptRegistry`** — Return an array of `PromptInfo` objects for all prompts in the registry. Each includes name, description, tags, createdAt, all version strings (sorted ascending by semver), latestPublished, and latest (regardless of state). | Status: not_done
- [ ] **Implement `listVersions()` on `PromptRegistry`** — Return an array of `VersionMetadata` objects for all versions of a named prompt, sorted by semver ascending. Throw `PromptNotFoundError` if the prompt does not exist. | Status: not_done
- [ ] **Implement `getMetadata()` on `PromptRegistry`** — Return the `VersionMetadata` for a specific prompt version. Unlike `getPrompt()`, this works for any state including archived. Throw `PromptNotFoundError` or `VersionNotFoundError` as appropriate. | Status: not_done
- [ ] **Implement `createPrompt()` on `PromptRegistry`** — Create a new prompt in the registry: validate the name, check for duplicates (throw `PromptExistsError`), create the prompt directory, create the `1.0.0` version directory, write the content file, write `meta.json`, create `CHANGELOG.md`, and update the manifest. The initial version starts in `draft` state. Return the `VersionMetadata` of the created version. | Status: not_done
- [ ] **Implement `bump()` on `PromptRegistry`** — Create a new version of a prompt: compute the next version number using `semver.inc()` based on bump type, create the new version directory, copy content from the previous version (or use provided content), write `meta.json`, update the changelog, update the manifest. Support `initialState` option (`draft` or `published`). Return the new `VersionMetadata`. | Status: not_done
- [ ] **Implement `updateDraft()` on `PromptRegistry`** — Update the content of a draft version. Throw `ImmutableVersionError` if the version is not in `draft` state. Overwrite the content file in the version directory. | Status: not_done
- [ ] **Implement `publish()` on `PromptRegistry`** — Transition a version from `draft` to `published`. Delegate to lifecycle/publish module. Update both `meta.json` and manifest. | Status: not_done
- [ ] **Implement `deprecate()` on `PromptRegistry`** — Transition a version from `published` to `deprecated` with a required message. Delegate to lifecycle/deprecate module. Update both `meta.json` and manifest. | Status: not_done
- [ ] **Implement `archive()` on `PromptRegistry`** — Transition a version from `published` or `deprecated` to `archived`. Delegate to lifecycle/archive module. Update both `meta.json` and manifest. | Status: not_done
- [ ] **Implement `lock()` on `PromptRegistry`** — Generate or update the lock file. Resolve all ranges (from the existing lock file or a provided `Record<string, string>`) and write the results with content hashes to the lock file. | Status: not_done
- [ ] **Implement `verifyLock()` on `PromptRegistry`** — Verify lock file consistency: check that all locked versions exist in the manifest and content hashes match. Return boolean. | Status: not_done
- [ ] **Implement `getChangelog()` on `PromptRegistry`** — Return the changelog content as a string for a named prompt. Delegate to changelog/reader. Throw `PromptNotFoundError` if prompt does not exist. | Status: not_done
- [ ] **Implement `export()` on `PromptRegistry`** — Export a prompt version as a standalone artifact. Resolve the version (exact or range), load the content, load metadata, load the changelog entry for that version. Return the self-contained export object with name, version, content, format, metadata, and changelog. | Status: not_done

---

## Phase 11: CLI Implementation

- [ ] **Implement CLI argument parsing in `src/cli.ts`** — Use `node:util.parseArgs` (Node.js 18+) to parse all CLI arguments and flags. Implement command dispatch to handler functions for each command. Handle `--version` and `--help` flags globally. Handle `--registry` global override. | Status: not_done
- [ ] **Implement `init` CLI command** — Parse `--dir` and `--format` flags. Call `initRegistry()`. Print success message showing created files. Exit 0 on success, exit 2 on configuration error. | Status: not_done
- [ ] **Implement `new` CLI command** — Parse `--description` (required), `--format`, `--author`, `--tag` (repeatable), `--content`, `--file`, and `--publish` flags. If neither `--content` nor `--file` is provided, open `$EDITOR`. Call `createPrompt()`. Optionally call `publish()` if `--publish` is set. Print success message. | Status: not_done
- [ ] **Implement `bump` CLI command** — Parse positional `<name>` and `<type>` args plus `--changelog` (required unless `--no-changelog`), `--no-changelog`, `--author`, `--preid`, `--model` (repeatable), `--tag` (repeatable), `--publish`, `--content`, `--file`, and `--edit` flags. If `--edit`, open `$EDITOR` with the current content. Call `bump()`. Optionally call `publish()`. Print success message. | Status: not_done
- [ ] **Implement `publish` CLI command** — Parse positional `<name>` and `<version>` args. Optionally support `--lint` flag (run `prompt-lint` if installed before publishing). Call `publish()`. Print success message. | Status: not_done
- [ ] **Implement `deprecate` CLI command** — Parse positional `<name>` and `<version>` args plus `--message` (required). Call `deprecate()`. Print success message. | Status: not_done
- [ ] **Implement `archive` CLI command** — Parse positional `<name>` and `<version>` args. Call `archive()`. Print success message. | Status: not_done
- [ ] **Implement `list` CLI command** — Parse optional positional `[name]` arg plus `--json`, `--state`, `--verbose` flags. Without name: list all prompts in table format (NAME, LATEST, PUBLISHED, VERSIONS, TAGS). With name: list all versions of a prompt (VERSION, STATE, AUTHOR, DATE, CHANGELOG). With `--json`: output as JSON. With `--state`: filter by lifecycle state. With `--verbose`: show full metadata. | Status: not_done
- [ ] **Implement `resolve` CLI command** — Parse positional `<name>` and `<range>` args plus `--include-drafts`, `--include-prerelease`, `--exclude-deprecated` flags. Call `resolve()`. Print `<name>@<version>` on success. Exit 1 if no version satisfies the range. | Status: not_done
- [ ] **Implement `diff` CLI command** — Parse positional `<name>`, `<v1>`, `<v2>` args plus `--format` (terminal/json/markdown) and `--no-color` flags. Load both versions' content. If `prompt-diff` is installed, use it for semantic diff; otherwise, fall back to basic line-by-line text diff. Print the diff output. | Status: not_done
- [ ] **Implement `changelog` CLI command** — Parse positional `<name>` arg. Call `getChangelog()`. Print the changelog content to stdout. | Status: not_done
- [ ] **Implement `export` CLI command** — Parse positional `<name>` and optional `[version]` args plus `--output` and `--format` (raw/json/bundle) flags. Call `export()`. For `raw` format, print content only. For `json` format, print JSON with content and metadata. For `bundle` format, include changelog. If `--output`, write to file instead of stdout. | Status: not_done
- [ ] **Implement `lock` CLI command** — Parse `--update` and `--add` (repeatable, format `<name>=<range>`) flags. Without flags: generate lock file from existing resolutions. With `--update`: re-resolve all ranges. With `--add`: add new ranges to the lock file. | Status: not_done
- [ ] **Implement `verify` CLI command** — Call `verifyLock()`. Print success/failure message. Exit 0 if consistent, exit 1 if inconsistent. | Status: not_done
- [ ] **Implement CLI exit codes** — Ensure all commands exit with code 0 on success, 1 on operational errors (prompt not found, version not found, invalid state transition), and 2 on configuration/usage errors (invalid flags, missing required args, registry not initialized, file I/O failure). | Status: not_done
- [ ] **Implement CLI environment variable support** — Read `PROMPT_VERSION_REGISTRY`, `PROMPT_VERSION_AUTHOR`, `PROMPT_VERSION_FORMAT`, and `NO_COLOR` environment variables. These override config file values but are overridden by explicit CLI flags. | Status: not_done
- [ ] **Implement CLI help text** — Implement `--help` flag that prints full usage information for all commands and their options, matching the format shown in SPEC Section 8. | Status: not_done

---

## Phase 12: Integration with Sibling Packages

- [ ] **Implement optional `prompt-diff` integration** — In the `diff` CLI command and any diff-related API, check if `prompt-diff` is installed via `require.resolve('prompt-diff')`. If available, use it for semantic diff output (change classification, severity, token impact). If not available, fall back to line-by-line text diff using Node.js built-ins. | Status: not_done
- [ ] **Implement optional `prompt-lint` integration** — In the `publish` CLI command, when `--lint` flag is set or `lintBeforePublish` config is true, check if `prompt-lint` is installed. If available, run lint checks on the prompt content before transitioning to published. If lint fails, abort publish. If `prompt-lint` is not installed, warn and skip. | Status: not_done

---

## Phase 13: Unit Tests

### Error Tests
- [ ] **Write `src/__tests__/errors.test.ts`** — Test all error classes: verify each class extends `PromptVersionError`, verify the `code` property is set correctly, verify additional readonly properties (`promptName`, `range`, `currentState`, `targetState`, `expectedHash`, `actualHash`, `registryDir`). | Status: not_done

### Storage Tests
- [ ] **Write `src/__tests__/storage/content-reader.test.ts`** — Test reading markdown, text, and JSON message array content files. Test that JSON arrays parse into `PromptMessage[]`. Test UTF-8 encoding handling. Test missing file throws error. | Status: not_done
- [ ] **Write `src/__tests__/storage/content-writer.test.ts`** — Test writing content files in all three formats. Verify file extensions match format (`.md`, `.txt`, `.json`). Verify content roundtrips (write then read). | Status: not_done
- [ ] **Write `src/__tests__/storage/hash.test.ts`** — Test SHA-256 hashing of content. Verify deterministic output. Verify `sha256:<hex>` format. Test with various content sizes. | Status: not_done
- [ ] **Write `src/__tests__/storage/directory.test.ts`** — Test directory creation (registry root, prompt dirs, version dirs). Test path resolution. Test existence checks. Use temporary directories. | Status: not_done

### Manifest Tests
- [ ] **Write `src/__tests__/manifest/reader.test.ts`** — Test reading valid manifests (empty registry, single prompt, multiple prompts with many versions). Test that missing manifest throws `RegistryNotInitializedError`. Test malformed JSON handling. | Status: not_done
- [ ] **Write `src/__tests__/manifest/writer.test.ts`** — Test atomic write (write + rename). Test that `updatedAt` is updated. Test roundtrip (write then read). | Status: not_done
- [ ] **Write `src/__tests__/manifest/validator.test.ts`** — Test validation of manifest structure. Test invalid prompt names. Test missing required fields on version entries. Test invalid semver strings. | Status: not_done

### Resolver Tests
- [ ] **Write `src/__tests__/resolver/range-resolver.test.ts`** — Test all supported range syntaxes: exact, caret, tilde, wildcard (`x`), explicit range, `latest`, and star (`*`). Test with various sets of candidate versions. Test that highest satisfying version is returned. Test with no satisfying version (returns null). Test with a single candidate. Test with many candidates. | Status: not_done
- [ ] **Write `src/__tests__/resolver/lock-resolver.test.ts`** — Test lock file lookup for existing `(name, range)` pair. Test content hash verification (match and mismatch). Test missing lock file (returns null). Test `bypassLock` option. Test lock file that references non-existent version. | Status: not_done
- [ ] **Write `src/__tests__/resolver/state-filter.test.ts`** — Test filtering by default (exclude draft, include deprecated with warning, exclude archived). Test `includeDrafts: true`. Test `excludeDeprecated: true`. Test `includePrerelease: true`. Test combinations of filters. | Status: not_done

### Lifecycle Tests
- [ ] **Write `src/__tests__/lifecycle/state-machine.test.ts`** — Test all valid transitions: `draft -> published`, `published -> deprecated`, `published -> archived`, `deprecated -> archived`. Test all invalid transitions (e.g., `published -> draft`, `archived -> published`, `draft -> deprecated`, `draft -> archived`, `deprecated -> published`). Verify `InvalidStateTransitionError` is thrown with correct properties. | Status: not_done
- [ ] **Write `src/__tests__/lifecycle/publish.test.ts`** — Test successful publish (draft -> published). Test that non-draft throws error. Test that empty content file prevents publish. Test that content file must exist. | Status: not_done
- [ ] **Write `src/__tests__/lifecycle/deprecate.test.ts`** — Test successful deprecation with message. Test that non-published throws error. Test that empty deprecation message is rejected. | Status: not_done
- [ ] **Write `src/__tests__/lifecycle/archive.test.ts`** — Test archive from published. Test archive from deprecated. Test that archiving draft throws error. Test that archiving archived throws error. | Status: not_done

### Changelog Tests
- [ ] **Write `src/__tests__/changelog/generator.test.ts`** — Test changelog entry generation for each bump type: major -> Changed, minor -> Added, patch -> Fixed, prerelease -> Added with pre-release note. Test formatting matches keep-a-changelog format. | Status: not_done
- [ ] **Write `src/__tests__/changelog/writer.test.ts`** — Test creating new CHANGELOG.md for a new prompt. Test prepending version sections to existing changelogs. Test that manual edits in existing changelog are preserved. Test insertion after `[Unreleased]` section. | Status: not_done
- [ ] **Write `src/__tests__/changelog/reader.test.ts`** — Test reading a well-formed changelog. Test reading empty changelog. Test reading changelog with multiple versions. | Status: not_done

### Lock File Tests
- [ ] **Write `src/__tests__/lock/reader.test.ts`** — Test reading valid lock files. Test missing lock file returns null. Test malformed lock file handling. | Status: not_done
- [ ] **Write `src/__tests__/lock/writer.test.ts`** — Test writing lock file with multiple resolutions. Test `generatedAt` timestamp is set. Test roundtrip (write then read). | Status: not_done
- [ ] **Write `src/__tests__/lock/verifier.test.ts`** — Test verification with consistent state (all hashes match). Test with hash mismatch. Test with missing version in manifest. Test with empty lock file. | Status: not_done

### Configuration Tests
- [ ] **Write `src/__tests__/config.test.ts`** — Test configuration file discovery (`.prompt-version.json`, `package.json` key). Test precedence: defaults < config file < env vars < CLI flags < programmatic config. Test invalid configuration (unknown fields, wrong types). Test fallback to defaults when no config file exists. | Status: not_done

### Registry Class Tests
- [ ] **Write `src/__tests__/registry.test.ts`** — Comprehensive unit tests for the `PromptRegistry` class covering all API methods: `getPrompt`, `resolve`, `listPrompts`, `listVersions`, `getMetadata`, `createPrompt`, `bump`, `updateDraft`, `publish`, `deprecate`, `archive`, `lock`, `verifyLock`, `getChangelog`, `export`. Use temporary directories for each test. | Status: not_done

---

## Phase 14: Integration Tests

- [ ] **Write `src/__tests__/integration.test.ts` — full lifecycle test** — Initialize a registry, create a prompt, publish it, bump to a new version, publish the bump, deprecate the old version, archive the old version, resolve the latest version, verify the content. This is the critical path test. | Status: not_done
- [ ] **Write integration test — multi-prompt resolution** — Create three prompts, each with multiple versions in different lifecycle states. Resolve ranges for all three. Verify that resolutions are independent and correct. | Status: not_done
- [ ] **Write integration test — lock file round-trip** — Create prompts, generate a lock file, add new versions, verify that locked resolution still returns the old version, update the lock file, verify that resolution returns the new version. | Status: not_done
- [ ] **Write integration test — deprecation warning** — Create a prompt, publish, deprecate, resolve. Verify that a warning is emitted to stderr. Verify that `suppressDeprecationWarning` suppresses it. Verify that `excludeDeprecated` excludes it. | Status: not_done
- [ ] **Write integration test — pre-release versions** — Create a prompt, bump to a pre-release version, verify it is excluded from default resolution, verify it is included with `includePrerelease`. | Status: not_done
- [ ] **Write integration test — message array format** — Create a prompt with JSON message array format. Verify that `getPrompt()` returns parsed `messages` array with correct `role` and `content` fields. Verify that `content` is the raw JSON string. | Status: not_done

---

## Phase 15: CLI End-to-End Tests

- [ ] **Write `src/__tests__/cli.test.ts` — `init` command E2E** — Run `prompt-version init` against a temp directory. Verify stdout output, exit code 0, and that `prompt-registry.json` and `prompt-versions.lock` are created. Test `--dir` flag. Test error when already initialized (exit code 2). | Status: not_done
- [ ] **Write CLI E2E — `new` command** — Run `prompt-version new` with various flag combinations. Verify prompt directory and version files are created. Test `--publish` flag. Test error for duplicate name (exit code 1). Test error for missing `--description` (exit code 2). | Status: not_done
- [ ] **Write CLI E2E — `bump` command** — Run `prompt-version bump` for major, minor, patch, prerelease. Verify new version directory, manifest update, changelog update. Test `--publish` flag. Test `--content` and `--file` flags. Test `--preid` for prerelease. | Status: not_done
- [ ] **Write CLI E2E — `publish` command** — Run `prompt-version publish`. Verify state change in manifest. Test error for already-published version. | Status: not_done
- [ ] **Write CLI E2E — `deprecate` command** — Run `prompt-version deprecate --message "..."`. Verify state change and deprecation message in manifest. Test error for non-published version. | Status: not_done
- [ ] **Write CLI E2E — `archive` command** — Run `prompt-version archive`. Verify state change. Test error for draft version. | Status: not_done
- [ ] **Write CLI E2E — `list` command** — Run `prompt-version list` and `prompt-version list <name>`. Verify table output format. Test `--json` flag. Test `--state` filter. Test `--verbose` flag. | Status: not_done
- [ ] **Write CLI E2E — `resolve` command** — Run `prompt-version resolve <name> <range>`. Verify output format `<name>@<version>`. Test resolution options flags. Test exit code 1 for no match. | Status: not_done
- [ ] **Write CLI E2E — `diff` command** — Run `prompt-version diff <name> <v1> <v2>`. Verify diff output. Test `--format` flag variants. Test `--no-color` flag. | Status: not_done
- [ ] **Write CLI E2E — `changelog` command** — Run `prompt-version changelog <name>`. Verify changelog content is printed. | Status: not_done
- [ ] **Write CLI E2E — `export` command** — Run `prompt-version export` with raw, json, and bundle formats. Test `--output` flag writes to file. Test version/range resolution in export. | Status: not_done
- [ ] **Write CLI E2E — `lock` command** — Run `prompt-version lock`, `lock --update`, and `lock --add`. Verify lock file contents. | Status: not_done
- [ ] **Write CLI E2E — `verify` command** — Run `prompt-version verify` with consistent and inconsistent states. Verify exit codes. | Status: not_done

---

## Phase 16: Edge Case Tests

- [ ] **Test empty registry** — Verify `listPrompts()` returns empty array. Verify `getPrompt()` throws `PromptNotFoundError`. | Status: not_done
- [ ] **Test prompt with single version** — Verify resolution works with only one version. Verify `latest` resolves to it. | Status: not_done
- [ ] **Test prompt with 100+ versions** — Performance test: create a prompt with 100+ versions and verify resolution completes in under 50ms. | Status: not_done
- [ ] **Test prompt name edge cases** — Test maximum length (128 characters). Test minimum valid name (`a`). Test names with hyphens. Test invalid names: uppercase, spaces, special characters, leading/trailing hyphens, empty string. | Status: not_done
- [ ] **Test large prompt content** — Test with content exceeding 1 MB to verify no issues with reading/writing/hashing. | Status: not_done
- [ ] **Test manifest/filesystem inconsistency — version dir exists but not in manifest** — Verify the system handles this gracefully (manifest is the source of truth). | Status: not_done
- [ ] **Test manifest/filesystem inconsistency — manifest entry without version dir** — Verify appropriate error when trying to load content for a version whose directory is missing. | Status: not_done
- [ ] **Test registry directory does not exist** — Verify `createRegistry()` throws `RegistryNotInitializedError`. | Status: not_done
- [ ] **Test lock file references archived version** — Verify appropriate error or re-resolution behavior when the locked version has been archived. | Status: not_done
- [ ] **Test template variable detection** — Verify that `{{variable}}` patterns in prompt content are detected and recorded in `meta.json` `variables` field. | Status: not_done

---

## Phase 17: Documentation

- [ ] **Write README.md** — Write a comprehensive README with: package overview, installation instructions (`npm install prompt-version`), quick start example, API reference for all public functions and types, CLI reference for all commands and flags, configuration file documentation, lock file explanation, integration guide for sibling packages (`prompt-diff`, `prompt-lint`, `prompt-inherit`), and semver guidelines for prompts. | Status: not_done
- [ ] **Add JSDoc comments to all public API functions** — Add JSDoc comments to `createRegistry`, `initRegistry`, and all `PromptRegistry` methods. Include parameter descriptions, return type descriptions, thrown errors, and usage examples. | Status: not_done
- [ ] **Add inline code comments** — Add comments to non-obvious implementation details: atomic manifest writes, state transition validation logic, resolution algorithm steps, lock file hash verification. | Status: not_done

---

## Phase 18: Build, Lint, and CI Readiness

- [ ] **Configure ESLint** — Set up ESLint configuration for TypeScript. Ensure `npm run lint` passes on all source files. | Status: not_done
- [ ] **Verify TypeScript build** — Ensure `npm run build` compiles all source files to `dist/` with declarations (`.d.ts`), declaration maps, and source maps. Verify no type errors. | Status: not_done
- [ ] **Verify test suite** — Run `npm run test` and confirm all unit, integration, and CLI E2E tests pass. | Status: not_done
- [ ] **Version bump `package.json`** — Bump the version appropriately (currently `0.1.0`) based on the implementation phase completed. | Status: not_done
- [ ] **Verify `npm publish` dry run** — Run `npm publish --dry-run` and verify that only `dist/` and `bin/` are included in the package (per `"files"` field). Verify the CLI binary is correctly linked. | Status: not_done
