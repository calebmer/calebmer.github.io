import { IS_DEVELOPMENT } from '../constants.js'
import Express from 'express'
import renderSite from './render.js'

const server = new Express()

if (IS_DEVELOPMENT) {
  const Compiler = require('webpack')
  const WebpackDevMiddleware = require('webpack-dev-middleware')
  const WebpackHotMiddleware = require('webpack-hot-middleware')
  const webpackConfig = require('../../webpack.config.js')

  const compiler = new Compiler(webpackConfig)
  
  server.use(new WebpackDevMiddleware(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath
  }))
  
  server.use(new WebpackHotMiddleware(compiler, {
    log: console.log,
    path: '/webpack-hot-reload',
    heartbeat: 10 * 1000
  }))
}

server.use((req, res, next) => (
  renderSite(req.url, (error, html) => {
    if (error) {
      return next(error)
    }
    res.status(200).send(html)
  })
))

export default server
