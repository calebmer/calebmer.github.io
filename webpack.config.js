const Path = require('path')
const Webpack = require('webpack')

module.exports = {
  devtool: 'cheap-eval-source-map',
  entry: [
    'webpack-hot-middleware/client?path=/webpack-hot-reload&timeout=20000',
    Path.resolve(__dirname, 'src/client/main.js')
  ],
  output: {
    path: Path.resolve(__dirname, 'dist'),
    publicPath: '/assets',
    filename: 'main.js'
  },
  plugins: [
    new Webpack.optimize.OccurenceOrderPlugin(),
    new Webpack.HotModuleReplacementPlugin(),
    new Webpack.NoErrorsPlugin()
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        include: Path.resolve(__dirname, 'src'),
        loaders: ['react-hot', 'babel']
      }
    ]
  }
}
