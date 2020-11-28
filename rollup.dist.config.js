import includePaths from 'rollup-plugin-includepaths'
import {terser} from 'rollup-plugin-terser'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import strip from '@rollup/plugin-strip'
import css from 'rollup-plugin-css-only'

const includePathOptions = {
  include: {},
  paths: ['modules'],
  external: [],
  extensions: ['.js', '.mjs', '.ts']
}

const typescriptOptions = {
  target: "ES6"
}

export default {
  input: 'main.js',
  output: [ 
    {
      dir: 'dist',
      format: 'iife',
      plugins: [terser()]
    }
  ],
  plugins: [
    includePaths(includePathOptions),
    nodeResolve(),
    commonjs(),
    css({output: 'css/bundle.css'}),
    typescript(typescriptOptions),
    strip({include: '**/*.(js|ts)'})
  ]
};
