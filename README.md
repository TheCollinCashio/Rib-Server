# Rib-Server [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/TheCollinCashio/Rib/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/rib-server.svg?style=flat)](https://www.npmjs.com/package/rib-server)
Rib-Server is the simplest way to create and horizontally scale a realtime backend. This should be coupled with [rib-client](https://www.npmjs.com/package/rib-client) to create a simple real-time application. Rib-Server allows you to call client-side functions directly from the server.

For the official github, please click [here](https://github.com/TheCollinCashio/Rib).

## Example
```js
let RibServer = require("rib-server").default
RibServer.startServer(5000, "This is much easier to program")

let myRib = new RibServer()
myRib.onConnect((client) => {
    //  call the client-side function sendMSG on all clients except the one that just connected
    myRib.sendMSG("Someone else joined the party 🎊", { query: { _ribId: { $ne: client._ribId } }})

    // call the client-side function sendMSG for just the newly connected client
    myRib.sendMSG("Welcome to this example 😃", { query: client })
})

function logMessage(msg) {
    console.log(msg)
}
logMessage.argTypes = ["string"]    //  validates client passed 1st parameter of type string

function add(x, y) {
    return x + y
}
add.argTypes = ["number", "number"]    //  validates client passed 1st & 2nd parameter of type number

myRib.exposeFunctions([logMessage, add])    // allows us to call add & logMessage functions from the client
```

## Documentation
**startServer: Static Function**
```js
const PORT = 5000
RibServer.startServer(PORT, `Started up on port ${PORT}`)
```

Starts up a server with a specified port and an optional message log.

**setRedisUrl: Static Function**
```js
RibServer.setRedisUrl("//localhost:6379")
```
Link to a redis server. This is for horizontal scaling your application. More can be found on the official redis documentation at https://redis.io/.

**setRoute: Static Function**
```js
RibServer.setRoute("/", `${ __dirname }/Home/Client/index.html`)
```
Set a route for your application and the file to send with the associated route.

**setClientFolder: Static Function**
```js
RibServer.setClientFolder(
    { path: "/Home/Client/", fullPath: `${ __dirname }/Home/Client/` }
)
```

Set static folder that can be accessed by a client.

**setClientFolders: Static Function**
```js
RibServer.setClientFolders([
    { path: "/Home/Scripts/", fullPath: `${ __dirname }/Home/Scripts/` },
    { path: "/Home/Styles/", fullPath: `${ __dirname }/Home/Styles/` },
])
```

Set static folders that can be accessed by a client.

**getApp: Static Function**
```js
const app = RibServer.getApp()
```
Get express app to use for middleware.

**The default constructor takes two parameters:**
```js
let myRib = new RibServer()
```
Instantiate rib server. 

Note: The constructor takes two optional parameters. The first is the namespace that the client is trying to connect to(default is "/"). The second is whether or not you want to use the singleton design pattern(default is true).

**onConnect: Function**
```js
myRib.onConnect((client) => {
    console.log(client)
})
```
Call a function after a client connects to the server. The object given is called a Persistent Client Object(PCO for short). This object is given each time a client calls a serverside function, and you can attach any data to this object and it will be persistent each time that client calls a server side function.

**onDisconnect: Function**
```js
myRib.onDisconnect((client) => {
    console.log("A client disconnected 🙁")
})
```
Call a function when a client disconnects from the server. The callback value is a Persistent Client Object(PCO for short).

**exposeFunction: Function** 
```js
function add(x, y) {
    return x + y
}
add.argTypes = ["number", "number"]
myRib.exposeFunction(add)
```
Expose a server-side function that can be called from the rib-client instance. If argTypes is an added onto the function, aka functionName.argTypes = [], then this function's arguments will be validated before executing the function. Recognized argtypes are "undefined", "object", "boolean", "number", "string", "symbol", "null", and "any".

**exposeFunctions: Function** 
```js
myRib.exposeFunctions([
    add,
    subtract,
    multiply,
])
```
Expose an array of server-side functions that can be called with a rib-client instance. If argTypes is added onto a function, functionName.argTypes = [], then that function's arguments will be validated before executing the function. Recognized argtypes are "undefined", "object", "boolean", "number", "string", "symbol", "null", and "any".

**concealFunction: Function** 
```js
myRib.concealFunction(add)
```
Conceal a server-side function where it can no longer be accessed from all clients.

**concealFunctions: Function** 
```js
myRib.concealFunctions([
    add,
    subtract,
    multiply,
])
```
Conceal server-side functions where they can no longer be accessed from the client.

**possibleClientFunctions: Function**
```js
myRib.possibleClientFunctions = ["logMessage"]
```
Gives ability to call your client-side functions with ease of mind by setting an array of possible client-side functions.

**call: Function**
```js
app.call(
    "logMessage",
    "Log this message client side 👋🏻",
    { query: { locationId: client.locationId } },
)
```
The safest way to call a client function.

**runPOF: Function**
```js
const res = await app.runPOF(
    "getName",
    [],
    { locationId: locationId.toString() },
)   //  run function getName on each PCO whose locationId matches specified
```
Run a persistent object function that matches a query
