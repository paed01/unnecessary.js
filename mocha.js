/* eslint no-console: 0 */
import Fs from 'node:fs';
import Path from 'node:path';

import Unnecessary from './index.js';

let unnecessary;

export const mochaHooks = {
  async beforeAll() {
    unnecessary = new Unnecessary(loadOptions());
    await unnecessary.ready;
  },
  afterAll() {
    if (!unnecessary) return;
    const untouched = unnecessary.untouched();
    if (!untouched.length) return;
    console.log('\n\x1b[31mFound %d potentially unused file%s:\x1b[0m', untouched.length, untouched.length > 1 ? 's' : '');
    untouched.forEach((file) => {
      console.log('\x1b[33m  %s\x1b[0m', file);
    });
  },
};

function loadOptions() {
  let config;
  try {
    config = JSON.parse(Fs.readFileSync(Path.resolve('package.json'), 'utf8')).unnecessary;
  } catch {
    return undefined;
  }
  if (!config) return undefined;
  if (typeof config.filePattern === 'string') config = { ...config, filePattern: new RegExp(config.filePattern, 'i') };
  return config;
}
