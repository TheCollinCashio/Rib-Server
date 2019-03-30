let RibServer = require("../lib/RibServer").default
RibServer.startServer(5000, "This is much easier to program")

let myRib = new RibServer()
myRib.onConnect((client) => {
    myRib.sendMSG("Someone else joined the party 🎊", { query: { _ribId: { $ne: client._ribId } }})
    myRib.sendMSG("Welcome to this example 😃", { query: client })
})

myRib.onDisconnect((client) => {
    console.log("A client disconnected 🙁")
})

function add(x, y) {
    return x+y
}
add.argTypes = ["number", "number"]

function logMessage(msg) {
    console.log(msg)
}
logMessage.argTypes = ["string"]

myRib.exposeFunctions([logMessage, add])