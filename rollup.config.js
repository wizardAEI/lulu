import resolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import css from "rollup-plugin-import-css";

export default [{
  input: './background/src/index.js', // 入口
  output: {
    file: './background/main.js', // 出口
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
    file: './content/main.js', // 出口
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
  input: './src/index.js', // 入口
  output: {
    file: './popup.js', // 出口
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