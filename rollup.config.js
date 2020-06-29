import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/intercept.ts',
  plugins: [typescript(), resolve(), commonjs()],
  onwarn: (e) => {
    throw new Error(e);
  },
  output: [
    {
      name: 'StateManager',
      file: 'dist/index.js',
      format: 'umd',
    },
    {
      file: 'dist/index.es.js',
      format: 'es',
    },
  ],
};
