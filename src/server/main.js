import Chalk from 'chalk'
import server from './server.js'

const HOSTNAME = 'localhost'
const PORT = 3000

server.listen(PORT, HOSTNAME, (error) => {
  if (error) {
    return console.error(error)
  }
  console.log(`Listening on ${Chalk.underline(`http://${HOSTNAME}:${PORT}`)}`)
})
