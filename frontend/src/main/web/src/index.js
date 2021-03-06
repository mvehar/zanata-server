import 'babel-polyfill'
import React from 'react'
import { render } from 'react-dom'
import { mapValues } from 'lodash'
import { createStore, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'
import createLogger from 'redux-logger'
import { hashHistory } from 'react-router'
import { syncHistory } from 'react-router-redux'
import WebFont from 'webfontloader'
import { apiMiddleware } from 'redux-api-middleware'
import rootReducer from './reducers'
import Root from './containers/Root'
import './styles/base.css'
import './styles/atomic.css'
import './styles/animations.css'
import './styles/extras.css'
import { isJsonString } from './utils/StringUtils'

WebFont.load({
  google: {
    families: [
      'Source Sans Pro:200,400,600',
      'Source Code Pro:400,600'
    ]
  },
  timeout: 2000
})

const routerMiddleware = syncHistory(hashHistory)

const logger = createLogger({
  predicate: (getState, action) =>
  process.env && (process.env.NODE_ENV === 'development')
})

const finalCreateStore = compose(
  applyMiddleware(
    thunk,
    apiMiddleware,
    routerMiddleware,
    logger
  )
)(createStore)

// Call and assign the store with no initial state
const store = ((initialState) => {
  const store = finalCreateStore(rootReducer, initialState)
  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept('./reducers', () => {
      const nextRootReducer = require('./reducers')
      store.replaceReducer(nextRootReducer)
    })
  }
  return store
})()

window.config = mapValues(window.config, (value) =>
  isJsonString(value) ? JSON.parse(value) : value)
// baseUrl should be /zanata or ''
window.config.baseUrl = window.config.baseUrl || ''

render(
  <Root store={store} history={hashHistory} />,
  document.getElementById('root')
)
