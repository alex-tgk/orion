const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  return {
    ...config,
    target: 'node',
    output: {
      ...config.output,
      filename: 'main.js',
    },
  };
});
