import { mapValues } from 'lodash'
import React from 'react'
import { renderToString } from 'react-dom/server'
import Helmet from 'react-helmet'

export default (
  function Frame ({ children }) {
    const markup = renderToString(children)
    const { title, meta } = mapValues(Helmet.rewind(), value => value.toComponent())
    return (
      <html lang="en">
        <head>
          <meta charSet="utf8"/>
          {title}
          {meta}
        </head>
        <body>
          <div id="container" innerHTML={{ __html: markup }}/>
          <script src="/assets/main.js"/>
        </body>
      </html>
    )
  }
)
