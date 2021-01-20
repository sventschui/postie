export default (config, env, helpers) => {
    let { rule } = helpers.getLoadersByName(config, 'babel-loader')[0];
    let babelConfig = rule.options;
    console.log(babelConfig);

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
