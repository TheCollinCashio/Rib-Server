"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const socket = require("socket.io");
const redisAdapter = require("socket.io-redis");
const http_1 = require("http");
const Helper_1 = require("./Helper");
//  Setup Socket Application
let app = express();
let server = new http_1.Server(app);
let io = socket(server, { pingInterval: 3000, pingTimeout: 7500 });
let isRedisConnected = false;
//  Setup instance for Singleton Design Pattern
let instance = null;
class RibServer {
    /**
        * Create an instance of rib-server.
        * @param nameSpace
        * @param isSingleton
    **/
    constructor(nameSpace, isSingleton = true) {
        this._socketMap = new Map();
        this.serverFunctionMap = new Map();
        this.clientFunctionMap = new Map();
        let returnInstance = this;
        if (isSingleton && instance) {
            returnInstance = instance;
        }
        else {
            this._nameSpace = this._nameSpace ? io.of(nameSpace) : io.of('/');
            this._nameSpace.on('connection', (socket) => {
                this.connFunction = this.connFunction ? this.connFunction : () => { }; // keep app from breaking if user does not input a connFunction
                this.setUpPersistentObject(socket);
                this.setUpSocketMap(socket);
                this.setSocketFunctions(socket);
                this.sendKeysToClient(socket);
                this.setUpKeysFromClient(socket);
            });
        }
        if (isRedisConnected) {
            this.setCustomHook();
        }
        if (isSingleton && !instance) {
            instance = this;
        }
        return returnInstance;
    }
    /**
        * Call a function after a client connects to the server.
        * @callback clientObject
    **/
    onConnect(callback) {
        this.connFunction = callback;
    }
    /**
        * Call a function when a client disconnects from the server.
        * @callback clientObject
    **/
    onDisconnect(callback) {
        this.disconnFunction = callback;
    }
    /**
        * Be able to call your client-side functions with ease of mind by setting an array of possible client-side functions.
        * @param fnNames
    **/
    possibleClientFunctions(fnNames) {
        for (let fnName of fnNames) {
            this.clientFunctionMap.set(fnName, () => {
                let errorMessage = new Error(`${fnName} has not been bound properly to server`);
                console.error(errorMessage);
            });
        }
    }
    /**
        * The safest way to call a client function.
        * @param fnName
        * @param args
    **/
    call(fnName, args) {
        if (typeof this[fnName] === 'function') {
            this[fnName](...args);
        }
        else {
            let errorMessage = `${fnName} is not an availiable function`;
            console.error(errorMessage);
        }
    }
    /**
        * Starts up a server with a specified port and an optional message log.
        * @param port
        * @param startMessage
    **/
    static startServer(port, startMessage) {
        server.listen(port, () => {
            if (startMessage) {
                console.log(startMessage);
            }
        });
    }
    /**
        * Link to a redis server. This is for horizontal scaling your application
        * More can be found on the official redis documentation at https://redis.io/.
        * @param url
    **/
    static setRedisUrl(url) {
        io.adapter(redisAdapter(url));
        isRedisConnected = true;
    }
    /**
        * Set a route for your application and the file to send with the associated route.
        * @param request
        * @param fileName
    **/
    static setRoute(request, fileName) {
        app.get(request, (req, res) => res.sendFile(fileName));
    }
    /**
        * Set static folders that can be accessed by a client
        * @param folderPath
    **/
    static setClientFolder(folderPath) {
        app.use(express.static(folderPath));
    }
    /**
        * Set static folders that can be accessed by a client
        * @param folderPaths
    **/
    static setClientFolders(folderPaths) {
        for (let folderPath of folderPaths) {
            this.setClientFolder(folderPath);
        }
    }
    /**
        * Expose a server-side function that can be called from the rib-client instance
        * @param fn
    **/
    exposeFunction(fn) {
        let fnName = fn.name;
        //  @ts-ignore
        let argTypes = fn.argTypes;
        if (this.isArgTypesValid(argTypes, fnName)) {
            if (this.serverFunctionMap.get(fnName)) {
                throw new Error(`${fnName} already exists. The function names need to be unique.`);
            }
            else {
                this.serverFunctionMap.set(fnName, (...args) => {
                    if (this.isArgsValid(args, argTypes, fnName)) {
                        return fn(...args);
                    }
                });
            }
        }
    }
    /**
        * Expose an array of server-side functions that can be called with a rib-client instance
        * @param fns
    **/
    exposeFunctions(fns) {
        for (let fn of fns) {
            this.exposeFunction(fn);
        }
    }
    /**
        * Conceal a server-side function where it can no longer be accessed from all clients
        * @param fn
    **/
    concealFunction(fn, client) {
        let fnName = fn.name;
        let listener = this.serverFunctionMap.get(fnName);
        let socket = this._socketMap.get(client._ribId);
        socket.removeListener(fnName, listener);
    }
    /**
        * Conceal server-side functions where they can no longer be accessed from the client
        * @param fn
    **/
    concealFunctions(fns, client) {
        for (let fn of fns) {
            this.concealFunction(fn, client);
        }
    }
    /**
        * Run a persistent object function that matches a query
        * @param fnName
        * @param args
        * @param query
        * @param cb
    **/
    runPOF(key, args, query, cb) {
        if (isRedisConnected) {
            this._nameSpace.adapter.customRequest({ key: key, args: [...args], query: query }, cb);
        }
        else {
            this._socketMap.forEach(socket => {
                if (Helper_1.doesObjectMatchQuery(this.getPersistentObject(socket), query)) {
                    socket.emit(key, ...args);
                }
            });
        }
    }
    isArgTypesValid(argTypes, fnName) {
        let isValid = true;
        if (typeof argTypes === 'object') {
            let validArgTypes = ['undefined', 'object', 'boolean', 'number', 'string', 'symbol', 'object', 'any'];
            for (let i = 0; i < argTypes.length; i++) {
                if (validArgTypes.indexOf(argTypes[i]) === -1) {
                    let possibleTypes = '';
                    for (let x = 0; x < validArgTypes.length; x++) {
                        if (x === validArgTypes.length - 1) {
                            possibleTypes += `or \x1b[33m${validArgTypes[x]}\x1b[0m.`;
                        }
                        else {
                            possibleTypes += `\x1b[33m${validArgTypes[x]}\x1b[0m, `;
                        }
                    }
                    isValid = false;
                    throw new Error(`Invalid argType \x1b[31m${argTypes[i]}\x1b[0m in \x1b[36m${fnName}.argTypes\x1b[0m[\x1b[35m${i}\x1b[0m]:\nValid argTypes: ${possibleTypes}`);
                }
            }
        }
        return isValid;
    }
    isArgsValid(args, argTypes, fnName) {
        let isArgsValid = true;
        if (typeof argTypes === 'object') {
            let argTypesLength = argTypes.length;
            let nTh = { 1: 'st', 2: 'nd', 3: 'rd' };
            for (let i = 0; i < argTypesLength; i++) {
                if (typeof args[i] !== argTypes[i] && argTypes[i] !== 'any') {
                    let numChar = `${i + 1}${nTh[i + 1] ? nTh[i + 1] : 'th'}`;
                    isArgsValid = false;
                    let errorMessage = new Error(`In function \x1b[36m${fnName}\x1b[0m:\nExpected argument type of \x1b[33m${argTypes[i]}\x1b[0m for \x1b[35m${numChar}\x1b[0m parameter, but found \x1b[31m${typeof args[i]}\x1b[0m`);
                    console.error(errorMessage);
                }
            }
            if (!(args[argTypesLength] instanceof PersistentObj)) {
                let num = argTypesLength + 1;
                let numChar = `${num}${nTh[num] ? nTh[num] : 'th'}`;
                isArgsValid = false;
                let errorMessage = new Error(`In function \x1b[36m${fnName}\x1b[0m:\nExpected argument to be an instance of \x1b[33mPersistentObject\x1b[0m for \x1b[35m${numChar}\x1b[0m parameter, but found \x1b[31m${typeof args[argTypesLength]}\x1b[0m`);
                console.error(errorMessage);
            }
        }
        return isArgsValid;
    }
    setCustomHook() {
        this._nameSpace.adapter.customHook = ({ key, args, query }, cb) => {
            this._socketMap.forEach(socket => {
                let persistentObj = this.getPersistentObject(socket);
                if (Helper_1.doesObjectMatchQuery(persistentObj, query)) {
                    let fn = persistentObj[key];
                    if (typeof fn === 'function') {
                        let data = fn(...args);
                        if (typeof cb === 'function') {
                            cb(data);
                        }
                    }
                }
            });
        };
    }
    setUpSocketMap(socket) {
        this._socketMap.set(socket.id, socket);
        socket.on('disconnect', () => {
            this._socketMap.delete(socket.id);
            this.disconnFunction && this.disconnFunction(this.getPersistentObject(socket));
        });
    }
    setSocketFunctions(socket) {
        this.serverFunctionMap.forEach((x, event) => {
            socket.on(event, (...args) => {
                let fn = this.serverFunctionMap.get(event);
                let excludeResArgs = Object.assign([], args);
                let resolve = null;
                if (args[args.length - 1] !== undefined && typeof args[args.length - 1] === 'function') {
                    resolve = args[args.length - 1];
                    excludeResArgs.splice(excludeResArgs.length - 1, 1);
                }
                let returnVal = fn(...excludeResArgs, this.getPersistentObject(socket));
                if (typeof resolve === 'function') {
                    if (returnVal instanceof Promise) {
                        returnVal.then((val) => {
                            resolve(val);
                        });
                    }
                    else {
                        resolve(returnVal);
                    }
                }
            });
        });
    }
    sendKeysToClient(socket) {
        let keys = [...this.serverFunctionMap.keys()];
        socket.emit('RibSendKeysToClient', keys);
    }
    setUpPersistentObject(socket) {
        Object.assign(socket, { _ribClient: new PersistentObj(socket.id) });
    }
    getPersistentObject(socket) {
        return socket._ribClient;
    }
    setUpKeysFromClient(socket) {
        socket.on('RibSendKeysToServer', (keys) => {
            this.setClientFunctionMap(keys);
            this.recievedKeysFromClientForSocket();
            this.recieveKeysFromClient();
            if (!socket._ribSentFirstSetOfKeys) {
                this.connFunction && this.connFunction(this.getPersistentObject(socket));
                socket._ribSentFirstSetOfKeys = true;
            }
        });
    }
    setClientFunctionMap(keys) {
        for (let key of keys) {
            this.clientFunctionMap.set(key, (...args) => {
                let isGlobalEmit = true;
                if (args.length > 0) {
                    let finalArgument = args[args.length - 1];
                    if (finalArgument) {
                        if (finalArgument.query) {
                            let finalArgumentQuery = finalArgument.query;
                            let includeId = finalArgumentQuery._ribId;
                            if (includeId && typeof includeId === 'string') {
                                delete args[args.length - 1];
                                this._nameSpace.to(includeId).emit(key, ...args);
                            }
                            else {
                                if (isRedisConnected) {
                                    this._nameSpace.adapter.customRequest({ key: key, args: [...args], query: finalArgumentQuery });
                                }
                                else {
                                    this._socketMap.forEach(socket => {
                                        if (Helper_1.doesObjectMatchQuery(this.getPersistentObject(socket), finalArgumentQuery)) {
                                            socket.emit(key, ...args);
                                        }
                                    });
                                }
                            }
                            isGlobalEmit = false;
                        }
                    }
                }
                if (isGlobalEmit) {
                    this._nameSpace.emit(key, ...args);
                }
            });
        }
    }
    recievedKeysFromClientForSocket() {
        let socketKeys = [...this._socketMap.keys()];
        for (let socketId of socketKeys) {
            let socket = this._socketMap.get(socketId);
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
            if (!this[key]) {
                this[key] = this.clientFunctionMap.get(key);
            }
        }
    }
}
exports.default = RibServer;
class PersistentObj {
    constructor(id) {
        this._ribId = id;
    }
}
//# sourceMappingURL=RibServer.js.map