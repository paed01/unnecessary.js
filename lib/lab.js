import Unnecessary from './index.js';
import { formatReport, loadOptions } from './report.js';

export default class UnnecessaryReporter {
  constructor(options) {
    this.settings = options;
    this.unnecessary = new Unnecessary(loadOptions());
  }

  start() {}

  test() {}

  async end() {
    await this.unnecessary.ready;
    const output = formatReport(this.unnecessary.untouched());
    if (output) this.report(`\n${output}\n`);
  }
}
