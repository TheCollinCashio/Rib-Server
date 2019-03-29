let RibServer = require('../lib/RibServer').default
RibServer.startServer(5000, 'This is much easier to program')

let myRib = new RibServer()
myRib.onConnect((client) => {
    myRib.sendMSG('Someone else joined the party 🎊', { query: { _ribId: { $ne: client._ribId } }})
    myRib.sendMSG('Welcome to this example 😃', { query: client })
})

myRib.onDisconnect((client) => {
    console.log('A client disconnected 🙁')
})

async function waitAndAdd(x, y) {
    await waitAFew()
    return x+y
}
waitAndAdd.argTypes = ['number', 'number']

function waitAFew() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, 3000)
    })
}

function logMessage(msg) {
    console.log(msg)
}
logMessage.argTypes = ['string']

myRib.exposeFunctions([logMessage, waitAndAdd])