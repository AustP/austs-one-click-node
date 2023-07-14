import path from 'path';
import TSConfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push({
  test: /\.css$/,
  use: [
    { loader: 'style-loader' },
    { loader: 'css-loader', options: { importLoaders: 1 } },
    {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          config: path.join(__dirname, 'postcss.config.js'),
        },
      },
    },
    ,
  ],
});

export const rendererConfig: Configuration = {
  devtool: 'inline-source-map',
  module: {
    rules,
  },
  plugins,
  resolve: {
    alias: {
      'crypto-wrapper': path.resolve(__dirname, 'src', 'crypto.ts'),
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    plugins: [new TSConfigPathsPlugin({ baseUrl: '.' })],
  },
};
