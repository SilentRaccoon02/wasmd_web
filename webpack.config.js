import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'

export default {
    mode: 'development',
    context: path.resolve(path.resolve(), 'src'),
    entry: './index.ts',
    output: {
        filename: '[contenthash].js',
        path: path.resolve(path.resolve(), 'build'),
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
        })
    ]
}
