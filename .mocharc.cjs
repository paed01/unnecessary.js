'use strict';

process.env.NODE_ENV = 'test';

var Unnecessary = require('./main.cjs');
var unnecessary = new Unnecessary({
  excludeDirs: ['coverage', '.vscode'],
  excludeFiles: [
    'package-lock.json',
    '.prettierrc.json',
    'eslint.config.js',
    'rollup.config.js',
    // ESM files are loaded via import and never show up in the require cache
    'index.js',
    'test/index.js',
  ],
});

process.on('exit', (code, signal) => {
  if (!signal && code === 0) {
    log();
  }
});

module.exports = {
  reporter: 'spec',
  recursive: false,
  timeout: 1000,
};

function log() {
  /* eslint no-console: 0 */
  var untouched = unnecessary.untouched();
  if (!untouched.length) return;
  console.log('\n\x1b[31mFound %d potentially unused file%s:\x1b[0m', untouched.length, untouched.length > 1 ? 's' : '');
  untouched.forEach((file) => {
    console.log('\x1b[33m  %s\x1b[0m', file);
  });
}
