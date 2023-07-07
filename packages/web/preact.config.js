const crypto = require("crypto");

/**
 * md4 algorithm is not available anymore in NodeJS 17+ (because of lib SSL 3).
 * In that case, silently replace md4 by md5 algorithm.
 */
try {
  crypto.createHash('md4');
} catch (e) {
  console.warn('Crypto "md4" is not supported anymore by this Node version');
  const origCreateHash = crypto.createHash;
  crypto.createHash = (alg, opts) => {
    return origCreateHash(alg === 'md4' ? 'md5' : alg, opts);
  };
}
export default (config, env, helpers) => {
  let { rule } = helpers.getLoadersByName(config, 'babel-loader')[0];
  let babelConfig = rule.use[0].options;

  babelConfig.plugins.push(require.resolve('styled-jsx/babel'));
  babelConfig.plugins.push(require.resolve('babel-plugin-graphql-tag'));

  const htmlPlugin = helpers.getPluginsByName(config, 'HtmlWebpackPlugin')[0].plugin;

  htmlPlugin.options.base = '/';
  config.output.publicPath = '';

  if (config.devServer) {
    config.devServer['proxy'] = [
      {
        ws: true,
        path: '/graphql',
        target: 'http://localhost:8025',
        // ...any other stuff...
      },
      {
        path: '/attachments',
        target: 'http://localhost:8025',
        // ...any other stuff...
      },
    ];
  }
};
