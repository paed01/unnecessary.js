export interface UnnecessaryOptions {
  /** Project working directory, defaults to `process.cwd()` */
  cwd?: string;
  /** File pattern, defaults to js, cjs, mjs, and json extensions */
  filePattern?: RegExp;
  /** Directories to exclude, relative to `cwd`. Appended to the defaults `node_modules` and `.git` */
  excludeDirs?: string[];
  /** Files to exclude, relative to `cwd`. Appended to the default `package.json` */
  excludeFiles?: string[];
}

export interface UnnecessaryInstance {
  /** Applied options, `excludeDirs` resolved to absolute paths */
  readonly options: Required<UnnecessaryOptions>;
  /** Watched files as absolute paths, `null` until `ready` has resolved */
  files: string[] | null;
  /** Resolves with the watched files once traversal has completed */
  readonly ready: Promise<string[]>;
  /**
   * Watched files that were never loaded, relative to `cwd` with `/` separators.
   * Synchronous - returns an empty list if called before `ready` has resolved.
   */
  untouched(): string[];
}

export interface UnnecessaryStatic {
  /** Initialize the shared instance */
  (options?: UnnecessaryOptions): UnnecessaryInstance;
  /** Create a standalone instance */
  new (options?: UnnecessaryOptions): UnnecessaryInstance;
  /** Untouched files of the shared instance, empty if it was never initialized */
  untouched(): string[];
}

declare const Unnecessary: UnnecessaryStatic;

export default Unnecessary;
