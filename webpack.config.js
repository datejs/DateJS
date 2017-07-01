const path                 = require('path');
const webpack              = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const BabiliPlugin         = require('babili-webpack-plugin');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');

class config {
    constructor(options) {
        let name    = options.name || 'date';
        let filename = options.filename || 'date.js';
        let plugins = [
            new FriendlyErrorsPlugin({ clearConsole: true }),
            ...options.plugins,
        ];

        this.config = {
            context: path.normalize(__dirname),
            entry: {
                [name]: path.normalize(__dirname + '/src/Date.js'),
            },
            output: {
                path: path.normalize(__dirname + '/dist'),
                filename,
                library: 'Datejs',
                libraryExport: 'default',
                libraryTarget: 'umd',
            },
            devtool: 'source-map',
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        loader: 'buble-loader',
                        include: path.join(__dirname, 'src'),
                        options: {
                            transforms: {
                                modules: false,
                                dangerousForOf: true,
                            },
                        },
                    },
                ],
            },
            plugins,
        };
    }
}

const full = new config({
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'webpack-report.html',
            openAnalyzer: false,
        }),
    ],
});

const minified    = new config({
    filename: 'date.min.js',
    plugins: [
        new BabiliPlugin(),
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'webpack-report-min.html',
            openAnalyzer: false,
        }),
    ],
});

module.exports = [full.config, minified.config];
