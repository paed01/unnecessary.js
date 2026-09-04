// type-checked by `npm run test:types`, the require variants of the exports map
import Unnecessary = require('unnecessary');
import mocha = require('unnecessary/mocha');
import LabReporter = require('unnecessary/lab');
import nodeTestReporter = require('unnecessary/node-test');

const options: Unnecessary.UnnecessaryOptions = { excludeDirs: ['coverage'] };
const shared: Unnecessary.UnnecessaryInstance = Unnecessary(options);
const standalone: Unnecessary.UnnecessaryInstance = new Unnecessary();
const untouched: string[] = Unnecessary.untouched();

const before: Promise<void> = mocha.mochaHooks.beforeAll();
const reporter = new LabReporter({});
const ended: Promise<void> = reporter.end();
const stream: AsyncGenerator<string> = nodeTestReporter([] as unknown as AsyncIterable<unknown>);

void [shared, standalone, untouched, before, ended, stream];
