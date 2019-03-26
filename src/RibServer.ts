import * as express from 'express'
import * as socket from 'socket.io'
import * as redisAdapter from 'socket.io-redis'
import { Server } from 'http'
import { doesObjectMatchQuery } from './Helper'

//  Setup Socket Application
let app = express()
let server = new Server(app)
let io = socket(server, { pingInterval: 3000, pingTimeout: 7500 })
let isRedisConnected = false

//  Setup instance for Singleton Design Pattern
let instance = null

export default class RibServer {
    public _nameSpace: SocketIO.Namespace
    public _socketMap = new Map<string, SocketIORib.Socket>()
    private connFunction: Function
    private disconnFunction: Function
    private serverFunctionMap = new Map<string, ((...args: any[]) => void)>()
    private clientFunctionMap = new Map<string, ((...args: any[]) => void)>()

    /**
        * Create an instance of rib-server.
        * @param nameSpace
        * @param isSingleton
    **/
    constructor(nameSpace?: string, isSingleton = true) {
        let returnInstance = this

        if (isSingleton && instance) {
            returnInstance = instance
        } else {
            this._nameSpace = this._nameSpace ? io.of(nameSpace) : io.of('/')
            this._nameSpace.on('connection', (socket: SocketIORib.Socket) => {
                this.connFunction = this.connFunction ? this.connFunction : () => { } // keep app from breaking if user does not input a connFunction
                this.setUpPersistentObject(socket)
                this.setUpSocketMap(socket)
                this.setSocketFunctions(socket)
                this.sendKeysToClient(socket)
                this.setUpKeysFromClient(socket)
            })
        }

        if(isRedisConnected) {
            this.setCustomHook()
        }

        if (isSingleton && !instance) {
            instance = this
        }

        return returnInstance
    }

    /**
        * Call a function after a client connects to the server.
        * @callback clientObject
    **/
    onConnect(callback: Function) {
        this.connFunction = callback
    }

    /**
        * Call a function when a client disconnects from the server.
        * @callback clientObject
    **/
    onDisconnect(callback: Function) {
        this.disconnFunction = callback
    }

    /**
        * Be able to call your client-side functions with ease of mind by setting an array of possible client-side functions.
        * @param fnNames
    **/
    possibleClientFunctions(fnNames: string[]) {
        for (let fnName of fnNames) {
            this.clientFunctionMap.set(fnName, () => {
                console.log(`${fnName} has not been bound properly to server`)    //  this will never be logged
            })
        }
    }

    /**
        * The safest way to call a client function.
        * @param fnName
        * @param args
    **/
    call(fnName: string, args: any[]) {
        if (typeof this[fnName] === 'function') {
            this[fnName](...args)
        } else {
            console.error(`${fnName} is not an availiable function`)
        }
    }

    /**
        * Starts up a server with a specified port and an optional message log.
        * @param port
        * @param startMessage
    **/
    static startServer(port: number, startMessage?: string) {
        server.listen(port, () => {
            if (startMessage) {
                console.log(startMessage)
            }
        })
    }

    /**
        * Link to a redis server. This is for horizontal scaling your application
        * More can be found on the official redis documentation at https://redis.io/.
        * @param url
    **/
    static setRedisUrl(url: string) {
        io.adapter(redisAdapter(url))
        isRedisConnected = true
    }

    /**
        * Set a route for your application and the file to send with the associated route.
        * @param request
        * @param fileName
    **/
    static setRoute(request: string, fileName: string) {
        app.get(request, (req, res) => res.sendFile(fileName))
    }

    /**
        * Set static folders that can be accessed by a client
        * @param folderPath
    **/
    static setClientFolder(folderPath) {
        app.use(express.static(folderPath))
    }

    /**
        * Set static folders that can be accessed by a client
        * @param folderPaths
    **/
    static setClientFolders(folderPaths: string[]) {
        for (let folderPath of folderPaths) {
            this.setClientFolder(folderPath)
        }
    }

    /**
        * Expose a server-side function that can be called from the rib-client instance
        * @param fn
    **/
    exposeFunction(fn: ((...args: any[]) => void)) {
        let fnName = fn.name

        if (this.serverFunctionMap.get(fnName)) {
            throw new Error(`${fnName} already exists. The function names need to be unique`)
        } else {
            this.serverFunctionMap.set(fnName, fn)
        }
    }

    /**
        * Expose an array of server-side functions that can be called with a rib-client instance
        * @param fns
    **/
    exposeFunctions(fns: ((...args: any[]) => void)[]) {
        for (let fn of fns) {
            this.exposeFunction(fn)
        }
    }

    /**
        * Conceal a server-side function where it can no longer be accessed from all clients
        * @param fn
    **/
    concealFunction(fn: ((...args: any[]) => void), client: any) {
        let fnName = fn.name
        let listener = this.serverFunctionMap.get(fnName)
        let socket = this._socketMap.get(client._ribSocketId)
        socket.removeListener(fnName, listener)
    }

    /**
        * Conceal server-side functions where they can no longer be accessed from the client
        * @param fn
    **/
    concealFunctions(fns: ((...args) => void)[], client: any) {
        for (let fn of fns) {
            this.concealFunction(fn, client)
        }
    }

    private setCustomHook() {
        this._nameSpace.adapter.customHook = ({ key, args, query, isInclude }, cb: (data: any) => void) => {
            this._socketMap.forEach(socket => {
                let persistentObj = this.getPersistentObject(socket)
                if(doesObjectMatchQuery(persistentObj, query) && isInclude){
                    let fn = persistentObj[key]
                    if (typeof fn === 'function') {
                        fn(...args)
                    }
                } else if(!doesObjectMatchQuery(persistentObj, query) && !isInclude) {
                    let fn = persistentObj[key]
                    if (typeof fn === 'function') {
                        fn(...args)
                    }
                }
            })
        }
    }

    private setUpSocketMap(socket: SocketIORib.Socket) {
        this._socketMap.set(socket.id, socket)
        socket.on('disconnect', () => {
            this._socketMap.delete(socket.id)
            this.disconnFunction && this.disconnFunction(this.getPersistentObject(socket))
        })
    }

    private setSocketFunctions(socket: SocketIORib.Socket) {
        this.serverFunctionMap.forEach((fn, event) => {
            socket.on(event, (...args) => {
                fn(...args, this.getPersistentObject(socket))
            })
        })
    }

    private sendKeysToClient(socket: SocketIORib.Socket) {
        let keys = [...this.serverFunctionMap.keys()]
        socket.emit('RibSendKeysToClient', keys)
    }

    private setUpPersistentObject(socket: SocketIORib.Socket) {
        Object.assign(socket, { _ribClient: new PersistentObj(socket.id) })
    }

    private getPersistentObject(socket: SocketIORib.Socket) {
        return socket._ribClient
    }

    private setUpKeysFromClient(socket: SocketIORib.Socket) {
        socket.on('RibSendKeysToServer', (keys: string[]) => {
            this.setClientFunctionMap(keys)
            this.recievedKeysFromClientForSocket()
            this.recieveKeysFromClient()

            if (!socket._ribSentFirstSetOfKeys) {
                this.connFunction && this.connFunction(this.getPersistentObject(socket))
                socket._ribSentFirstSetOfKeys = true
            }
        })
    }

    private setClientFunctionMap(keys: string[]) {
        for (let key of keys) {
            this.clientFunctionMap.set(key, (...args) => {
                let isGlobalEmit = true
                if (args.length > 0) {
                    let finalArgument = args[args.length - 1]
                    if (finalArgument) {
                        if (finalArgument.exclude) {
                            finalArgument = Object.assign({}, finalArgument)    // store final argument
                            delete args[args.length - 1]
                            let excludeSocketId = finalArgument.exclude._ribSocketId

                            if (excludeSocketId) {
                                let excludeSocket = this._socketMap.get(excludeSocketId)
                                delete args[args.length - 1]
                                excludeSocket.broadcast.emit(key, ...args)
                            } else {
                                let finalArgumentQuery = finalArgument.exclude
                                if (isRedisConnected) {
                                    this._nameSpace.adapter.customRequest({ key: key, args: [...args], query: finalArgumentQuery, isInclude: false })
                                } else {
                                    this._socketMap.forEach(socket => {
                                        if(!doesObjectMatchQuery(this.getPersistentObject(socket), finalArgumentQuery)) {
                                            socket.emit(key, ...args)
                                        }
                                    })
                                }
                            }
                            isGlobalEmit = false
                        } else if (finalArgument.include) {
                            let includeSocketId = finalArgument.include._ribSocketId
                            if (includeSocketId) {
                                let includeSocket = this._socketMap.get(includeSocketId)
                                delete args[args.length - 1]
                                includeSocket.emit(key, ...args)
                            } else {
                                let finalArgumentQuery = finalArgument.include
                                if (isRedisConnected) {
                                    this._nameSpace.adapter.customRequest({ key: key, args: [...args], query: finalArgumentQuery, isInclude: true })
                                } else {
                                    this._socketMap.forEach(socket => {
                                        if(doesObjectMatchQuery(this.getPersistentObject(socket), finalArgumentQuery)) {
                                            socket.emit(key, ...args)
                                        }
                                    })
                                }
                            }
                            isGlobalEmit = false
                        }
                    }
                }

                if (isGlobalEmit) {
                    this._nameSpace.emit(key, ...args)
                }
            })
        }
    }

    private recievedKeysFromClientForSocket() {
        let socketKeys = [...this._socketMap.keys()]
        for (let socketId of socketKeys) {
            let socket = this._socketMap.get(socketId)
            let ribClient = this.getPersistentObject(socket)
            let funcKeys = [...this.clientFunctionMap.keys()]
            for (let key of funcKeys) {
                ribClient[key] = (...args) => {
                    socket.emit(key, ...args)
                }
            }
        }
    }

    private recieveKeysFromClient() {
        let funcKeys = [...this.clientFunctionMap.keys()]
        for (let key of funcKeys) {
            if (!this[key]) {
                this[key] = this.clientFunctionMap.get(key)
            }
        }
    }
}

class PersistentObj {
    readonly _ribSocketId: string

    constructor(id: string) {
        this._ribSocketId = id
    }
}

export namespace SocketIORib {
    export interface Socket extends SocketIO.Socket {
        _ribClient: PersistentObj,
        _ribSentFirstSetOfKeys: boolean
    }
}