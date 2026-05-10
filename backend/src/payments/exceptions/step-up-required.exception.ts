export class StepUpRequiredException extends Error {
  readonly code = 'STEP_UP_REQUIRED' as const;

  constructor() {
    super('Step-up authentication required for transfers over 1000.');
    this.name = 'StepUpRequiredException';
  }
}
