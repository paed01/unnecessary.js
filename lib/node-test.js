import Unnecessary from './index.js';
import { formatReport, loadOptions } from './report.js';

export default async function* unnecessaryReporter(source) {
  const unnecessary = new Unnecessary(loadOptions());

  // drain the event stream, the report is produced once the test run has completed
  for await (const event of source) void event;

  await unnecessary.ready;
  const output = formatReport(unnecessary.untouched());
  if (output) yield `\n${output}\n`;
}
