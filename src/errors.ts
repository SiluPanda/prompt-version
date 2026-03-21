import type { LifecycleState } from './types'

export class PromptVersionError extends Error {
  constructor(message: string, readonly code: string) {
    super(message)
    this.name = 'PromptVersionError'
  }
}

export class PromptNotFoundError extends PromptVersionError {
  constructor(readonly promptName: string, range?: string) {
    super(
      `Prompt "${promptName}" not found${range ? ` matching "${range}"` : ''}`,
      'PROMPT_NOT_FOUND'
    )
    this.name = 'PromptNotFoundError'
  }
}

export class VersionNotFoundError extends PromptVersionError {
  constructor(name: string, version: string) {
    super(`Version ${version} not found for prompt "${name}"`, 'VERSION_NOT_FOUND')
    this.name = 'VersionNotFoundError'
  }
}

export class InvalidStateTransitionError extends PromptVersionError {
  constructor(from: LifecycleState, to: LifecycleState) {
    super(`Invalid state transition: ${from} → ${to}`, 'INVALID_STATE_TRANSITION')
    this.name = 'InvalidStateTransitionError'
  }
}
