export default {
  input: './index.js',
  external: [/^node:/],
  output: {
    file: './main.cjs',
    format: 'cjs',
    exports: 'default',
    generatedCode: {
      constBindings: true,
    },
  },
};
