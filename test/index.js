let RibServer = require('../lib/RibServer').default
// let PORT = process.argv[2] || 5000
// let NAME = process.argv[3] || 'Collin'
RibServer.startServer(5000, 'This is much easier to program')

let myRib = new RibServer()
myRib.onConnect((client) => {
    myRib.sendMSG('Someone else joined the party 🎊', { query: { _ribId: { $ne: client._ribId } }})
    myRib.sendMSG('Welcome to this example 😃', { query: client })
})

myRib.onDisconnect((client) => {
    console.log('A client disconnected 🙁')
})

function logMessage(msg) {
    console.log(msg)
}

logMessage.argTypes = ['string']

myRib.exposeFunction(logMessage)    // allows us to call logMessage from the client