let RibServer = require("../lib/RibServer").default
const PORT = process.argv[2] || 5000
RibServer.startServer(PORT, "This is much easier to program")
RibServer.setRedisUrl('//localhost:6379')

let myRib = new RibServer()
myRib.onConnect((client) => {
    client.name = process.argv[3]
    client.setName = (name) => {
        client.name = name
    }

    client.getName = () => {
        return client.name
    }

    // myRib.runPOF('setName', ["Test"], { name: "Joe" })
    myRib.sendMSG("Someone else joined the party 🎊", { query: { _ribId: { $ne: client._ribId } }})
    myRib.sendMSG("Welcome to this example 😃", { query: client })
})

function setName(querName, name) {
    myRib.runPOF('setName', [name], { name: querName })
}

async function getNames() {
    let names = await myRib.runPOF('getName', [], {})
    return names
}

myRib.onDisconnect((client) => {
    console.log("A client disconnected 🙁")
})

setTimeout(() => {
    console.log('TRY TO SEND')
    myRib.sendMSG('HELOOOOOOO')
}, 10000)

myRib.exposeFunctions([setName, getNames])