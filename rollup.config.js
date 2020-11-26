import includePaths from 'rollup-plugin-includepaths'
/*import {terser} from 'rollup-plugin-terser'*/
import {nodeResolve} from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
// import {eslint} from 'rollup-plugin-eslint'
import typescript from '@rollup/plugin-typescript'
import css from 'rollup-plugin-css-only'

const includePathOptions = {
  include: {},
  paths: ['modules'],
  external: [],
  extensions: ['.js', '.mjs', '.ts']
}

/*
const eslintOptions = {
  fix: function() {return false},
  exclude: ['node_modules/**', 'modules/vendor/*']
}
*/

const typescriptOptions = {
  target: "ES6"
}

export default {
  input: 'main.js',
  output: [ 
    {
      dir: 'dist',
      format: 'iife',
      sourcemap: 'inline'
    }/*,
    {
      dir: 'dist',
      format: 'iife',
      plugins: [terser()]
    }*/
  ],
  plugins: [
    includePaths(includePathOptions),
    nodeResolve(),
    commonjs(),
    css({output: 'style/bundle.css'}),
    typescript(typescriptOptions),
  ]
};
