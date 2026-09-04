export interface UnnecessaryMochaHooks {
  /** Initializes the shared instance and awaits traversal */
  beforeAll(): Promise<void>;
  /** Prints the report of potentially unused files */
  afterAll(): void;
}

/** Mocha root hook plugin, `mocha --require unnecessary/mocha` */
export const mochaHooks: UnnecessaryMochaHooks;
