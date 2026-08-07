const generatedCode = {
  constBindings: true,
};

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
      paths: (id) => (id.endsWith('/index.js') ? './main.cjs' : id),
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
      paths: (id) => (id.endsWith('/index.js') ? './main.cjs' : id),
      generatedCode,
    },
  },
];
