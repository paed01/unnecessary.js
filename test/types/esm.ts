// type-checked by `npm run test:types`, resolves the package through its own exports map
import Unnecessary, { type UnnecessaryInstance, type UnnecessaryOptions } from 'unnecessary';
import { mochaHooks } from 'unnecessary/mocha';
import LabReporter from 'unnecessary/lab';
import nodeTestReporter from 'unnecessary/node-test';

const options: UnnecessaryOptions = { cwd: '.', filePattern: /\.js$/i, excludeDirs: ['coverage'], excludeFiles: ['tsconfig.json'] };

const shared: UnnecessaryInstance = Unnecessary(options);
const standalone = new Unnecessary();
const files: string[] = await shared.ready;
const maybeFiles: string[] | null = standalone.files;
const untouched: string[] = shared.untouched();
const staticUntouched: string[] = Unnecessary.untouched();
const cwd: string = shared.options.cwd;

// @ts-expect-error filePattern is a RegExp
Unnecessary({ filePattern: '\\.js$' });
// @ts-expect-error untouched is synchronous
shared.untouched().then;

const before: Promise<void> = mochaHooks.beforeAll();
const after: void = mochaHooks.afterAll();

const reporter = new LabReporter({});
reporter.start();
reporter.test();
const ended: Promise<void> = reporter.end();

for await (const chunk of nodeTestReporter([][Symbol.iterator]() as unknown as AsyncIterable<unknown>)) {
  const text: string = chunk;
  void text;
}

void [files, maybeFiles, untouched, staticUntouched, cwd, before, after, ended];
