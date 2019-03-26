let RibServer = require('../lib/RibServer').default
let PORT = process.argv[2] || 5000
let NAME = process.argv[3] || 'Collin'
RibServer.startServer(PORT, 'This is much easier to program')
RibServer.setRedisUrl('//localhost:6379/')

let myRib = new RibServer()
myRib.onConnect((client) => {
    client.name = NAME
    myRib.sendMSG('Welcome to this example 😃', { query: { name: { $ne: 'Joe' } } })
    // client.sendMSG('Welcome to this example 😃')
})

myRib.onDisconnect((client) => {
    console.log('A client disconnected 🙁')
})

function logMessage(msg) {
    console.log(msg)
}

myRib.exposeFunction(logMessage)    // allows us to call logMessage from the client