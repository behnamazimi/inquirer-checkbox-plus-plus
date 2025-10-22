import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
  input: 'index.js',
  external: [
    '@inquirer/core',
    '@inquirer/ansi', 
    '@inquirer/figures',
    'yoctocolors-cjs',
    'lodash'
  ],
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
      exports: 'named'
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      exports: 'named',
      sourcemap: true
    }
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true
    }),
    commonjs(),
    copy({
      targets: [
        { src: 'index.d.ts', dest: 'dist' }
      ]
    })
  ]
};
