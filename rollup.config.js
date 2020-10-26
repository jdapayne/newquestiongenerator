import includePaths from 'rollup-plugin-includepaths'
import {terser} from 'rollup-plugin-terser'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import {eslint} from 'rollup-plugin-eslint'

const includePathOptions = {
  include: {},
  paths: ['modules', 'modules/Question', 'modules/Question/TextQ', 'modules/Question/GraphicQ', 'modules/vendor'],
  external: [],
  extensions: ['.js', '.mjs']
}

const eslintOptions = {
  fix: function() {return true},
  exclude: ['node_modules/**', 'modules/vendor/nouislider.js', 'modules/vendor/fraction.js']
}


export default {
  input: 'main.js',
  output: [
    {
      file: 'bundle.js',
      format: 'iife',
      sourcemap: 'inline'
    },
    {
      file: 'bundle.min.js',
      format: 'iife',
      plugins: [terser()]
    }],
  plugins: [ includePaths(includePathOptions), nodeResolve(), commonjs(), eslint(eslintOptions) ]
};
