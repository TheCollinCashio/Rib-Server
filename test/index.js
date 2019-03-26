let RibServer = require('../lib/RibServer').default
RibServer.startServer(5000, 'This is much easier to program')

let myRib = new RibServer()
myRib.onConnect((client) => {
    client.sendMSG('Welcome to this example 😃')
})

myRib.onDisconnect((client) => {
    console.log('A client disconnected 🙁')
})

function logMessage(msg) {
    console.log(msg)
}

myRib.exposeFunction(logMessage)    // allows us to call logMessage from the client