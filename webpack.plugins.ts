import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import { NormalModuleReplacementPlugin } from 'webpack';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new NodePolyfillPlugin(),
  new NormalModuleReplacementPlugin(/^ws$/, 'isomorphic-ws'),
  // force webpack to use the browser versions of these modules (they are all loaded by crypto-browserify)
  new NormalModuleReplacementPlugin(
    /^browserify-cipher$/,
    'browserify-cipher/browser',
  ),
  new NormalModuleReplacementPlugin(/^create-hmac$/, 'create-hmac/browser'),
  new NormalModuleReplacementPlugin(/^randombytes$/, 'randombytes/browser'),
];
