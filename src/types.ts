export type LifecycleState = 'draft' | 'published' | 'deprecated' | 'archived'
export type ContentFormat = 'text' | 'markdown' | 'json'

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface VersionMetadata {
  state: LifecycleState
  createdAt: string
  author: string
  tags?: string[]
  notes?: string
  [k: string]: unknown
}

export interface ResolvedPrompt {
  name: string
  version: string
  content: string | PromptMessage[]
  contentFormat: ContentFormat
  metadata: VersionMetadata
}

export interface RegistryConfig {
  registryDir: string
  format?: ContentFormat
  author?: string
}

export interface GetPromptOptions {
  draft?: boolean
  deprecated?: boolean
}

export interface CreatePromptOptions {
  format?: ContentFormat
  author?: string
  state?: LifecycleState
  tags?: string[]
  notes?: string
}

export interface BumpOptions {
  level: 'major' | 'minor' | 'patch'
  notes?: string
  author?: string
  state?: LifecycleState
}

export interface PromptRegistry {
  getPrompt(name: string, range?: string, options?: GetPromptOptions): Promise<ResolvedPrompt>
  createPrompt(name: string, version: string, content: string, options?: CreatePromptOptions): Promise<void>
  listPrompts(): Promise<string[]>
  listVersions(name: string): Promise<string[]>
  bump(name: string, from: string, options: BumpOptions): Promise<string>
  publish(name: string, version: string): Promise<void>
  deprecate(name: string, version: string, notes?: string): Promise<void>
}
