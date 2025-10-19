// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/packages/auth'),
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMaps: true,
    }),
  ],
};
