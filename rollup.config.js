const generatedCode = {
  constBindings: true,
};

export default [
  {
    input: './index.js',
    external: [/^node:/],
    output: {
      file: './main.cjs',
      format: 'cjs',
      exports: 'default',
      generatedCode,
    },
  },
  {
    input: './mocha.js',
    external: [/^node:/, './index.js'],
    output: {
      file: './mocha.cjs',
      format: 'cjs',
      exports: 'named',
      paths: (id) => (id.endsWith('/index.js') ? './main.cjs' : id),
      generatedCode,
    },
  },
];
