const generatedCode = {
  constBindings: true,
};

// rollup resolves the external ./index.js import to an absolute id - match with
// both separators since the id keeps backslashes on windows
const mainPath = (id) => (/[\\/]index\.js$/.test(id) ? './main.cjs' : id);

export default [
  {
    input: './lib/index.js',
    external: [/^node:/],
    output: {
      file: './dist/main.cjs',
      format: 'cjs',
      exports: 'default',
      generatedCode,
    },
  },
  {
    input: './lib/mocha.js',
    external: [/^node:/, './index.js'],
    output: {
      file: './dist/mocha.cjs',
      format: 'cjs',
      exports: 'named',
      paths: mainPath,
      generatedCode,
    },
  },
  {
    input: './lib/node-test.js',
    external: [/^node:/, './index.js'],
    output: {
      file: './dist/node-test.cjs',
      format: 'cjs',
      exports: 'default',
      paths: mainPath,
      generatedCode,
    },
  },
  {
    input: './lib/lab.js',
    external: [/^node:/, './index.js'],
    output: {
      file: './dist/lab.cjs',
      format: 'cjs',
      exports: 'default',
      paths: mainPath,
      generatedCode,
    },
  },
];
