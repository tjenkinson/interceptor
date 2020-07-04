import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/interceptor.ts',
  plugins: [typescript(), resolve(), commonjs()],
  onwarn: (e) => {
    throw new Error(e);
  },
  output: [
    {
      name: 'Interceptor',
      file: 'dist/interceptor.js',
      format: 'umd',
    },
    {
      file: 'dist/interceptor.es.js',
      format: 'es',
    },
  ],
};
