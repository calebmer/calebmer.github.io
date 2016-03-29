import Path from 'path'
import process from 'process'

export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
export const IS_DEVELOPMENT = !IS_PRODUCTION
export const IS_CLIENT = process.browser
export const IS_SERVER = !IS_CLIENT
