import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import html from '@rollup/plugin-html';
import livereload from 'rollup-plugin-livereload';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import serve from 'rollup-plugin-serve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import url from '@rollup/plugin-url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const production = !process.env.ROLLUP_WATCH;
const outputPath = path.resolve(__dirname, 'dist');

export default {
  input: path.join(__dirname, 'src', 'main.ts'),
  output: {
    dir: outputPath,
    entryFileNames: `[name]${production ? '-[hash]' : ''}.js`,
    format: 'iife',
    sourcemap: !production,
  },
  plugins: [
    url({ include: ['**/*.exr', '**/*.jpg', '**/*.ogg'], destDir: 'dist/assets', publicPath: '/assets/' }),
    nodeResolve({ extensions: ['.js', '.ts'] }),
    svelte({ preprocess: sveltePreprocess({ sourceMap: !production }) }),
    typescript({ sourceMap: !production, inlineSources: !production }),
    postcss({ extract: true, minimize: production }),
    html({
      template: ({ files }) => (
        fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8')
          .replace(
            '<link rel="stylesheet">',
            (files.css || [])
              .map(({ fileName }) => `<link rel="stylesheet" href="/${fileName}">`)
          )
          .replace(
            '<script></script>',
            (files.js || [])
              .map(({ fileName }) => `<script defer src="/${fileName}"></script>`)
          )
          .replace(/(  |\n)/g, '')
      ),
    }),
    ...(production ? [
      terser({ format: { comments: false } }),
    ] : [
      serve({
        contentBase: outputPath,
        port: 8080,
      }),
      livereload({
        watch: outputPath,
      }),
    ]),
  ],
  watch: { clearScreen: false },
};
