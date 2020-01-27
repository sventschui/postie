export default (config, env, helpers) => {
    let { rule } = helpers.getLoadersByName(config, 'babel-loader')[0];
    let babelConfig = rule.options;
    
    babelConfig.plugins.push(require.resolve('styled-jsx/babel'));

    config.devServer['proxy'] = [
      {
        ws: true,
        path:'/graphql',
        target: 'http://localhost:8025',
        // ...any other stuff...
      }
    ]
};
