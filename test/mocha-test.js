/* eslint no-console: 0 */
import { format } from 'node:util';

import { expect } from 'chai';

import { mochaHooks } from '../mocha.js';

describe('mocha root hooks', () => {
  it('afterAll before beforeAll is a noop', async () => {
    const { mochaHooks: freshHooks } = await import('../mocha.js?uninitiated');
    expect(freshHooks.afterAll()).to.be.undefined;
  });

  it('beforeAll traverses project tree and afterAll reports untouched files', async () => {
    await mochaHooks.beforeAll();

    const lines = [];
    const originalLog = console.log;
    console.log = (...args) => lines.push(format(...args));
    try {
      mochaHooks.afterAll();
    } finally {
      console.log = originalLog;
    }

    const output = lines.join('\n');
    expect(output).to.include('potentially unused');
    expect(output).to.include('test/data/arbitrary.json');
    // options are picked up from the package.json unnecessary field
    expect(output).to.not.include('rollup.config.js');
  });
});
