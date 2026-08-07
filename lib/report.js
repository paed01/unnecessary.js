import Fs from 'node:fs';
import Path from 'node:path';

export function loadOptions() {
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

export function formatReport(untouched) {
  if (!untouched.length) return '';
  const lines = [`\x1b[31mFound ${untouched.length} potentially unused file${untouched.length > 1 ? 's' : ''}:\x1b[0m`];
  for (const file of untouched) {
    lines.push(`\x1b[33m  ${file}\x1b[0m`);
  }
  return lines.join('\n');
}
