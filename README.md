# Rib-Server
Rib-Server is the simplest way to create and horizontally scale a realtime backend. This should be coupled with [rib-client](https://www.npmjs.com/package/rib-client) to create a simple real-time application. Rib-Server allows you to call client-side functions directly from the client.

For the official github, please click [here](https://github.com/TheCollinCashio/Rib).

## Example
```js
let RibServer = require('rib-server').default
RibServer.startServer(5000, 'This is much easier to program')

let myRib = new RibServer()
myRib.onConnect((client) => {
    //  call the client-side function sendMSG on all clients except the one that just connected
    myRib.sendMSG('Someone else joined the party 🎊', { query: client })

    // call the client-side function sendMSG for just the newly connected client
    client.sendMSG('Welcome to this example 😃')
})

function logMessage(msg) {
    console.log(msg)
}

myRib.exposeFunction(logMessage)    // allows us to call logMessage from the client
```

## Documentation
**startServer: Static Function**

Starts up a server with a specified port and an optional message log.

**setRedisUrl: Static Function**

Link to a redis server. This is for horizontal scaling your application. More can be found on the official redis documentation at https://redis.io/.

**setRoute: Static Function**

Set a route for your application and the file to send with the associated route.

**setClientFolder: Static Function**

Set static folder that can be accessed by a client.

**setClientFolders: Static Function**

Set static folders that can be accessed by a client.

**The default constructor takes two parameters:**
```
1) namespace //  The key that all clients are connected to (default is '/')
```
```
2) isSinglton   //  If true each instentiation of RibServer will yeild the same object (default is true)
```

**onConnect: Function**

Call a function after a client connects to the server.

**onDisconnect: Function**

Call a function when a client disconnects from the server.

**exposeFunction: Function** 

Expose a server-side function that can be called from the rib-client instance.

**exposeFunctions: Function** 

Expose an array of server-side functions that can be called with a rib-client instance.

**concealFunction: Function** 

Conceal a server-side function where it can no longer be accessed from all clients.

**concealFunctions: Function** 

Conceal server-side functions where they can no longer be accessed from the client.

**possibleClientFunctions: Function**

Be able to call your client-side functions with ease of mind by setting an array of possible client-side functions.

**call: Function**

The safest way to call a client function.