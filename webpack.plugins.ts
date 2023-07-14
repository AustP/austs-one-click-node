import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import { NormalModuleReplacementPlugin } from 'webpack';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new NodePolyfillPlugin({
    excludeAliases: ['crypto'],
  }),
  new NormalModuleReplacementPlugin(/^ws$/, 'isomorphic-ws'),
  new NormalModuleReplacementPlugin(/^crypto$/, 'crypto-wrapper'),
];
