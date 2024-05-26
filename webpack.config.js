import HtmlWebpackPlugin from 'html-webpack-plugin'
import path from 'path'
import webpack from 'webpack'

const DIR = path.resolve()

export default {
    mode: 'development',
    context: path.resolve(DIR, 'src'),
    entry: './index.ts',
    output: {
        filename: '[contenthash].js',
        path: path.resolve(DIR, '..', 'wasmd_server', 'build', 'static'),
        clean: true
    },
    resolve: {
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader'
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html'
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /ModuleAdapter$/
            // resourceRegExp: /OpenCVAdapter$/
        })
    ]
}
