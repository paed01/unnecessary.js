/* eslint no-console: 0 */
import Unnecessary from './index.js';
import { formatReport, loadOptions } from './report.js';

let unnecessary;

export const mochaHooks = {
  async beforeAll() {
    unnecessary = new Unnecessary(loadOptions());
    await unnecessary.ready;
  },
  afterAll() {
    if (!unnecessary) return;
    const output = formatReport(unnecessary.untouched());
    if (output) console.log(`\n${output}`);
  },
};
