import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RouterContext, match } from 'react-router'
import routes from '../routes.js'
import Frame from './frame.js'

export default function renderSite (path, callback) {
  match({ routes, location: path }, (error, redirectLocation, renderProps) => {
    if (error) {
      return callback(error)
    } else if (redirectLocation) {
      return callback(new Error(`Couldn’t render "${location.pathname}" because we can’t redirect to "${redirectLocation.pathname}" in static rendering.`))
    } else if (renderProps) {
      const markup = renderToStaticMarkup(<Frame><RouterContext {...renderProps}/></Frame>)
      return callback(null, `<!doctype html>\n${markup}`)
    } else {
      return callback(new Error(`Couldn’t find a route to render for "${location.pathname}".`))
    }
  })
}
