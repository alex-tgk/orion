const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (config, context) => {
  return {
    output: {
      path: join(__dirname, '../../dist/packages/admin-ui'),
    },
    plugins: [
      // Backend build
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        tsConfig: './tsconfig.app.json',
        assets: [],
        optimization: false,
        outputHashing: 'none',
        generatePackageJson: true,
      }),
      // Frontend HTML
      new HtmlWebpackPlugin({
        template: './src/frontend/index.html',
        filename: 'public/index.html',
        chunks: ['frontend'],
        inject: true,
      }),
    ],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          include: join(__dirname, 'src/frontend'),
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: join(__dirname, 'tsconfig.frontend.json'),
                transpileOnly: true,
              },
            },
          ],
        },
        {
          test: /\.css$/,
          include: join(__dirname, 'src/frontend'),
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('tailwindcss'),
                    require('autoprefixer'),
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },
    entry: {
      frontend: './src/frontend/index.tsx',
    },
  };
};
