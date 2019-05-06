let RibServer = require("../lib/RibServer").default
const PORT = process.argv[2] || 5000
RibServer.startServer(PORT, "This is much easier to program")
// RibServer.setRedisUrl('//localhost:6379')
// RibServer.setClientFolders([
//     { path: "/Home/Client/", fullPath: `${ __dirname }/Home/Client/` },
// ])
// RibServer.setRoute("/", `${ __dirname }/Home/Client/index.html`)

let myRib = new RibServer()
myRib.onConnect((client) => {
    client.name = process.argv[3]
    client.setName = (name, other) => {
        client.name = name
    }

    client.getName = () => {
        return client.name
    }

    myRib.sendMSG("Someone else joined the party 🎊", { query: { _ribId: { $ne: client._ribId } }})
    myRib.sendMSG("Welcome to this example 😃", { query: client })
})

function setName(querName, name) {
    myRib.runPOF('setName', name, { query: { name: querName }})
}

async function getNames() {
    let names = await myRib.runPOF('getName')
    return names
}

myRib.onDisconnect((client) => {
    console.log("A client disconnected 🙁")
})

myRib.exposeFunctions([setName, getNames])