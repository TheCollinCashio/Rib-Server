"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const socket = require("socket.io");
const redisAdapter = require("socket.io-redis");
const http_1 = require("http");
//  Setup Socket Application
let app = express();
let server = new http_1.Server(app);
let io = socket(server, { pingInterval: 3000, pingTimeout: 7500 });
//  Setup instance for Singleton Design Pattern
let instance = null;
class RibServer {
    constructor(nameSpace, isSingleton = true) {
        this.serverFunctionMap = new Map();
        this.clientFunctionMap = new Map();
        this.socketList = new Map();
        let returnInstance = this;
        if (isSingleton && instance) {
            returnInstance = instance;
        }
        else {
            this.nameSpace = this.nameSpace ? io.of(nameSpace) : io.of('/');
            this.nameSpace.on('connection', (socket) => {
                this.connFunc = this.connFunc ? this.connFunc : () => { }; // keep app from breaking if user does not input a connFunc
                this.setUpPersistentObject(socket);
                this.setUpSocketList(socket);
                this.setSocketFunctions(socket);
                this.sendKeysToClient(socket);
                this.setUpKeysFromClient(socket);
            });
        }
        if (isSingleton && !instance) {
            instance = this;
        }
        return returnInstance;
    }
    /**
        * Called after a rib client connects to the server
        * @callback clientObject
    **/
    onConnect(callback) {
        this.connFunc = callback;
    }
    /**
        * Sets all possible client functions
        * @param funcNames
    **/
    possibleClientFunctions(funcNames) {
        for (let funcName of funcNames) {
            this.clientFunctionMap.set(funcName, () => {
                console.log(`${funcName} has not been bound properly to server`); //  this will never be logged
            });
        }
    }
    /**
        * Starts up a server with a specified port and an optional message log
        * @param port
        * @param startMessage
    **/
    static startServer(port, startMessage) {
        server.listen(port, () => { if (startMessage)
            console.log(startMessage); });
    }
    /**
        * Link to a redis server. This is for horizontal scaling your application
        * More can be found on the official redis documentation at https://redis.io/
        * @param url
    **/
    static setRedisUrl(url) {
        io.adapter(redisAdapter(url));
    }
    /**
        * Set a route for your application and the file to send with the associated route
        * @param request
        * @param fileName
    **/
    static setRoute(request, fileName) {
        app.get(request, (req, res) => res.sendFile(fileName));
    }
    /**
        * Set a static file that can be accessed from your app
        * @param request
        * @param fileName
    **/
    static setClientFolder(folderNames) {
        for (let folder of folderNames) {
            app.use(express.static(folder));
        }
    }
    /**
        * Expose a server function that can be called with ClientRib
        * @param func
    **/
    exposeFunction(func) {
        let funcName = func.name;
        if (this.serverFunctionMap.get(funcName)) {
            throw new Error(`${funcName} already exists. The function names need to be unique`);
        }
        else {
            this.serverFunctionMap.set(funcName, func);
        }
    }
    /**
        * Expose an array of server functions that can be called with ClientRib
        * @param func
    **/
    exposeFunctions(funcs) {
        for (let func of funcs) {
            this.exposeFunction(func);
        }
    }
    /**
        * Stop listening for requests from this function called on the client
        * @param func
    **/
    concealFunction(func) {
        let funcName = func.name;
        this.serverFunctionMap.delete(funcName);
    }
    /**
        * Stop listening for requests from these functions called on the client
        * @param func
    **/
    concealFunctions(funcs) {
        for (let func of funcs) {
            this.concealFunction(func);
        }
    }
    setUpSocketList(socket) {
        this.socketList.set(socket.id, socket);
        socket.on('disconnect', () => { this.socketList.delete(socket.id); });
    }
    setSocketFunctions(socket) {
        this.serverFunctionMap.forEach((fn, event) => {
            socket.on(event, (...args) => {
                fn(...args, this.getPersistentObject(socket));
            });
        });
    }
    sendKeysToClient(socket) {
        let keys = [...this.serverFunctionMap.keys()];
        socket.emit('RibSendKeysToClient', keys);
    }
    setUpPersistentObject(socket) {
        Object.assign(socket, { _ribClient: { _ribSocketId: socket.id } });
    }
    getPersistentObject(socket) {
        return socket._ribClient;
    }
    setUpKeysFromClient(socket) {
        socket.on('RibSendKeysToServer', (keys) => {
            this.setClientFunctionMap(keys);
            this.recievedKeysFromClientForSocket();
            this.recieveKeysFromClient();
            this.connFunc(this.getPersistentObject(socket));
        });
    }
    setClientFunctionMap(keys) {
        for (let key of keys) {
            this.clientFunctionMap.set(key, (...args) => {
                if (args.length > 0) {
                    let finalArgument = args[args.length - 1];
                    if (finalArgument) {
                        if (finalArgument.exclude) {
                            let excludeSocketId = finalArgument.exclude._ribSocketId;
                            let excludeSocket = this.socketList.get(excludeSocketId);
                            delete args[args.length - 1];
                            excludeSocket.broadcast.emit(key, ...args);
                        }
                    }
                }
                else {
                    this.nameSpace.emit(key, ...args);
                }
            });
        }
    }
    recievedKeysFromClientForSocket() {
        let socketKeys = [...this.socketList.keys()];
        for (let socketId of socketKeys) {
            let socket = this.socketList.get(socketId);
            let ribClient = this.getPersistentObject(socket);
            let funcKeys = [...this.clientFunctionMap.keys()];
            for (let key of funcKeys) {
                ribClient[key] = (...args) => {
                    socket.emit(key, ...args);
                };
            }
        }
    }
    recieveKeysFromClient() {
        let funcKeys = [...this.clientFunctionMap.keys()];
        for (let key of funcKeys) {
            this[key] = this.clientFunctionMap.get(key);
        }
    }
}
exports.default = RibServer;
//# sourceMappingURL=Rib.js.map