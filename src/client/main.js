import document from 'global/document'
import React from 'react'
import { render } from 'react-dom'
import { Router, browserHistory } from 'react-router'
import routes from '../routes.js'

const container = document.getElementById('container')

render(<Router history={browserHistory} routes={routes}/>, container)
