import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const DIRNAME = path.resolve();

export default {
    mode: 'development',
    context: path.resolve(DIRNAME, 'src'),
    entry: './index.ts',
    output: {
        filename: '[contenthash].js',
        path: path.resolve(DIRNAME, 'build'),
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader'
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'wasmd_web'
        })
    ]
};
