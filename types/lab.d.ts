import type { UnnecessaryInstance } from './index.js';

/** @hapi/lab custom reporter, `lab -r unnecessary/lab` */
export default class UnnecessaryLabReporter {
  constructor(settings: unknown);
  settings: unknown;
  unnecessary: UnnecessaryInstance;
  /** Attached by lab after construction */
  report: (text: string) => void;
  start(): void;
  test(): void;
  /** Awaits traversal and reports potentially unused files */
  end(): Promise<void>;
}
