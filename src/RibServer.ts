import * as express from "express"
import * as socket from "socket.io"
import * as redisAdapter from "socket.io-redis"
import { Server } from "http"
import { doesObjectMatchQuery } from "./Helper"

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
            this._nameSpace = nameSpace ? io.of(nameSpace) : io.of("/")
            this._nameSpace.on("connection", (socket: SocketIORib.Socket) => {
                this.connFunction = this.connFunction ? this.connFunction : () => { } // keep app from breaking if user does not input a connFunction
                this.setUpPersistentObject(socket)
                this.setUpSocketMap(socket)
                this.setSocketFunctions(socket)
                this.sendKeysToClient(socket)
                this.setUpKeysFromClient(socket)
            })
        }

        if (isRedisConnected) {
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
                let errorMessage = new Error(`${fnName} has not been bound properly to server`)
                console.error(errorMessage)
            })
        }
    }

    /**
        * The safest way to call a client function.
        * @param fnName
        * @param args
    **/
    call(fnName: string, ...args: any[]) {
        if (typeof this[fnName] === "function") {
            this[fnName](...args)
        } else {
            let errorMessage = `${fnName} is not an availiable function`
            console.error(errorMessage)
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
    static setClientFolder(folderPath: any) {
        app.use(folderPath.path, express.static(folderPath.fullPath))
    }

    /**
        * Set static folders that can be accessed by a client
        * @param folderPaths
    **/
    static setClientFolders(folderPaths: any[]) {
        for (let folderPath of folderPaths) {
            let folderObject = {
                path: null,
                fullPath: null
            }
            if (typeof folderPath === 'string') {
                folderObject.path = ''
                folderObject.fullPath = folderPath
            } else {
                folderObject = folderPath
            }
            this.setClientFolder(folderObject)
        }
    }

    /**
        * Get express app to use for middleware
    **/
    static getApp(): any {
        return app
    }

    /**
        * Expose a server-side function that can be called from the rib-client instance
        * @param fn
    **/
    exposeFunction(fn: ((...args: any[]) => void)) {
        let fnName = fn.name

        //  @ts-ignore
        let argTypes: string[] = fn.argTypes

        if (this.isArgTypesValid(argTypes, fnName)) {
            if (this.serverFunctionMap.get(fnName)) {
                throw new Error(`${fnName} already exists. The function names need to be unique.`)
            } else {
                this.serverFunctionMap.set(fnName, (...args) => {
                    if (this.isArgsValid(args, argTypes, fnName)) {
                        return fn(...args)
                    }
                })
            }
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
        let socket = this._socketMap.get(client._ribId)
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

    /**
        * Run a persistent object function that matches a query
        * @param fnName
        * @param args
    **/
    runPOF(key: string, ...args: any[]) {
        return new Promise((resolve, reject) => {
            let query = {}
            if (args.length > 0) {
                let finalArgument = args[args.length - 1]
                if (typeof finalArgument === 'object') {
                    if (typeof finalArgument.query === 'object') {
                        query = Object.assign({}, finalArgument.query)
                        delete args[args.length - 1]
                    }
                }
            }

            if (isRedisConnected) {
                //  @ts-ignore
                this._nameSpace.adapter.customRequest({ key: key, args: [...args], query: query }, (err: any, replies: any) => {
                    if (err) {
                        reject(err)
                    } else {
                        let cleanData = this.getCleanData(replies)
                        resolve(cleanData)
                    }
                })
            }
            else {
                let data = []
                this._socketMap.forEach(socket => {
                    let client = this.getPersistentObject(socket);
                    if (doesObjectMatchQuery(client, query) && typeof client[key] === 'function') {
                        let retData = client[key](...args)
                        if (retData !== undefined) {
                            data.push(retData)
                        }
                    }
                });
                resolve(data)
            }
        })
    }

    private getCleanData(arr: any[]) {
        let retData = []
        arr.forEach((val) => {
            if (val !== undefined) {
                retData.push(val)
            }
        })
        return retData
    }

    private isArgTypesValid(argTypes: string[], fnName: string) {
        let isValid = true
        if (typeof argTypes === "object") {
            let validArgTypes = ["undefined", "object", "boolean", "number", "string", "symbol", "object", "null", "any"]
            for (let i = 0; i < argTypes.length; i++) {
                if (validArgTypes.indexOf(argTypes[i]) === -1) {
                    let possibleTypes = ""
                    for (let x = 0; x < validArgTypes.length; x++) {
                        if (x === validArgTypes.length - 1) {
                            possibleTypes += `or \x1b[33m${validArgTypes[x]}\x1b[0m.`
                        } else {
                            possibleTypes += `\x1b[33m${validArgTypes[x]}\x1b[0m, `
                        }
                    }
                    isValid = false
                    throw new Error(`Invalid argType \x1b[31m${argTypes[i]}\x1b[0m in \x1b[36m${fnName}.argTypes\x1b[0m[\x1b[35m${i}\x1b[0m]:\nValid argTypes: ${possibleTypes}`)
                }
            }
        }
        return isValid
    }

    private isArgsValid(args: any[], argTypes: string[], fnName: string) {
        let isArgsValid = true

        if (typeof argTypes === "object") {
            let argTypesLength = argTypes.length
            let nTh = { 1: "st", 2: "nd", 3: "rd" }

            for (let i = 0; i < argTypesLength; i++) {
                let actualType = args[i] === null ? "null" : typeof args[i]
                let expectedType = argTypes[i]
                if (actualType !== expectedType && argTypes[i] !== "any") {
                    let numChar = `${i + 1}${nTh[i + 1] ? nTh[i + 1] : "th"}`
                    isArgsValid = false
                    let errorMessage = new Error(`In function \x1b[36m${fnName}\x1b[0m:\nExpected argument type of \x1b[33m${expectedType}\x1b[0m for \x1b[35m${numChar}\x1b[0m parameter, but found \x1b[31m${actualType}\x1b[0m`)
                    console.error(errorMessage)
                }
            }

            if (!(args[argTypesLength] instanceof PersistentObj)) {
                let num = argTypesLength + 1
                let numChar = `${num}${nTh[num] ? nTh[num] : "th"}`
                isArgsValid = false
                let errorMessage = new Error(`In function \x1b[36m${fnName}\x1b[0m:\nExpected argument to be an instance of \x1b[33mPersistentObject\x1b[0m for \x1b[35m${numChar}\x1b[0m parameter, but found \x1b[31m${typeof args[argTypesLength]}\x1b[0m`)
                console.error(errorMessage)
            }
        }

        return isArgsValid
    }

    private setCustomHook() {
        this._nameSpace.adapter.customHook = ({ key, args, query, isEmit }, cb: (...argments: any) => void) => {
            let data = []
            this._socketMap.forEach(socket => {
                let persistentObj = this.getPersistentObject(socket)
                if (doesObjectMatchQuery(persistentObj, query)) {
                    if (isEmit) {
                        socket.emit(key, ...args)
                    } else {
                        let fn = persistentObj[key]
                        if (typeof fn === "function") {
                            data.push(fn(...args))
                        }
                    }
                }
            })
            cb(...data)
        }
    }

    private setUpSocketMap(socket: SocketIORib.Socket) {
        this._socketMap.set(socket.id, socket)
        socket.on("disconnect", () => {
            this._socketMap.delete(socket.id)
            this.disconnFunction && this.disconnFunction(this.getPersistentObject(socket))
        })
    }

    private setSocketFunctions(socket: SocketIORib.Socket) {
        this.serverFunctionMap.forEach((x, event) => {
            socket.on(event, (...args) => {
                let fn = this.serverFunctionMap.get(event)
                let excludeResArgs = Object.assign([], args)
                let resolve = null
                if (args[args.length - 1] !== undefined && typeof args[args.length - 1] === "function") {
                    resolve = args[args.length - 1]
                    excludeResArgs.splice(excludeResArgs.length - 1, 1)
                }
                let returnVal: any = fn(...excludeResArgs, this.getPersistentObject(socket))
                if (typeof resolve === "function") {
                    if (returnVal instanceof Promise) {
                        returnVal.then((val) => {
                            resolve(val)
                        })
                    } else {
                        resolve(returnVal)
                    }
                }
            })
        })
    }

    private sendKeysToClient(socket: SocketIORib.Socket) {
        let keys = [...this.serverFunctionMap.keys()]
        socket.emit("RibSendKeysToClient", keys)
    }

    private setUpPersistentObject(socket: SocketIORib.Socket) {
        Object.assign(socket, { _ribClient: new PersistentObj(socket.id) })
    }

    private getPersistentObject(socket: SocketIORib.Socket) {
        return socket._ribClient
    }

    private setUpKeysFromClient(socket: SocketIORib.Socket) {
        socket.on("RibSendKeysToServer", (keys: string[]) => {
            this.setClientFunctionMap(keys)
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
                    if (typeof finalArgument === 'object') {
                        if (typeof finalArgument.query === 'object') {
                            let finalArgumentQuery = Object.assign({}, finalArgument.query)
                            let includeId = finalArgumentQuery._ribId
                            delete args[args.length - 1]
                            
                            if (includeId && typeof includeId === "string") {
                                this._nameSpace.to(includeId).emit(key, ...args)
                            } else {
                                if (isRedisConnected) {
                                    this._nameSpace.adapter.customRequest({ key: key, args: [...args], query: finalArgumentQuery, isEmit: true }, () => { })
                                } else {
                                    this._socketMap.forEach(socket => {
                                        if (doesObjectMatchQuery(this.getPersistentObject(socket), finalArgumentQuery)) {
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
    readonly _ribId: string

    constructor(id: string) {
        this._ribId = id
    }
}

export namespace SocketIORib {
    export interface Socket extends SocketIO.Socket {
        _ribClient: PersistentObj,
        _ribSentFirstSetOfKeys: boolean
    }
}