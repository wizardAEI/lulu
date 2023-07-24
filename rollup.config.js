import resolve from "@rollup/plugin-node-resolve";
import copy from "rollup-plugin-copy";
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import css from "rollup-plugin-import-css";

export default [{
  input: './background/src/index.js', // 入口
  output: {
    file: './lulu_dist/background/main.js', // 出口
    format: 'umd',
  },
  plugins: [
    css(),
    commonjs({
      include: /node_modules/
    }),
    json(),
    resolve(),
  ]
}, {
  input: './content/src/index.js', // 入口
  output: {
    file: './lulu_dist/content/main.js', // 出口
    format: 'umd',
  },
  plugins: [
    copy({
      targets: [
        { src: 'content/style/*', dest: 'lulu_dist/content/style' },
      ]
    }),
    css(),
    commonjs({
      include: /node_modules/
    }),
    json(),
    resolve(),
  ]
}, {
  input: './popup/index.js', // 入口
  output: {
    file: './lulu_dist/popup.js', // 出口
    format: 'umd',
  },
  plugins: [
    css(),
    commonjs({
      include: /node_modules/
    }),
    json(),
    resolve(),
  ]
}]