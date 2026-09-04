/**
 * node:test custom reporter, `node --test-reporter unnecessary/node-test`.
 * Drains the event stream and yields the report of potentially unused files once the run has completed.
 */
export default function unnecessaryReporter(source: AsyncIterable<unknown>): AsyncGenerator<string, void, undefined>;
