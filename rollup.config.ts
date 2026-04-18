// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const config = {
  input: 'src/index.ts',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    sourcemap: true,
    inlineDynamicImports: true
  },
  plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()],
  onwarn(warning, defaultHandler) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return
    defaultHandler(warning)
  }
}

export default config
