export class StepUpRequiredException extends Error {
  readonly code = 'STEP_UP_REQUIRED' as const;
  public challengeId?: string;
  public expiresInSeconds?: number;

  constructor(challengeId?: string, expiresInSeconds?: number) {
    super('Step-up authentication required for transfers over 1000.');
    this.name = 'StepUpRequiredException';
    this.challengeId = challengeId;
    this.expiresInSeconds = expiresInSeconds;
  }

  getResponse() {
    if (this.challengeId) {
      return {
        code: this.code,
        message: 'Step-up authentication required for this transfer.',
        challengeId: this.challengeId,
        expiresInSeconds: this.expiresInSeconds,
      };
    }
    return {
      code: this.code,
      message: this.message,
    };
  }
}
