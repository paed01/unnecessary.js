import Path from 'node:path';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { expect } from 'chai';

import { formatReport, loadOptions } from '../lib/report.js';

describe('report helpers', () => {
  describe('loadOptions', () => {
    let dir;
    const cwd = process.cwd();
    beforeEach(() => {
      dir = mkdtempSync(Path.join(tmpdir(), 'unnecessary-options-'));
    });
    afterEach(() => {
      process.chdir(cwd);
      rmSync(dir, { recursive: true, force: true });
    });

    it('returns undefined when cwd has no package.json', () => {
      process.chdir(dir);
      expect(loadOptions()).to.be.undefined;
    });

    it('returns undefined when package.json has no unnecessary field', () => {
      writeFileSync(Path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture' }));
      process.chdir(dir);
      expect(loadOptions()).to.be.undefined;
    });

    it('compiles string filePattern to a case insensitive regex', () => {
      writeFileSync(Path.join(dir, 'package.json'), JSON.stringify({ unnecessary: { filePattern: '\\.js$' } }));
      process.chdir(dir);

      const options = loadOptions();
      expect(options.filePattern).to.be.instanceOf(RegExp);
      expect(options.filePattern.flags).to.equal('i');
      expect(options.filePattern.test('FILE.JS')).to.be.true;
    });
  });

  describe('formatReport', () => {
    it('returns empty string when nothing is untouched', () => {
      expect(formatReport([])).to.equal('');
    });

    it('reports singular file without plural s', () => {
      const output = formatReport(['lonely.js']);
      expect(output).to.include('1 potentially unused file:');
      expect(output).to.include('lonely.js');
    });

    it('reports plural files', () => {
      expect(formatReport(['a.js', 'b.js'])).to.include('2 potentially unused files:');
    });
  });
});
