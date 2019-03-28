/// <reference types="socket.io" />
export default class RibServer {
    _nameSpace: SocketIO.Namespace;
    _socketMap: Map<string, SocketIORib.Socket>;
    private connFunction;
    private disconnFunction;
    private serverFunctionMap;
    private clientFunctionMap;
    /**
        * Create an instance of rib-server.
        * @param nameSpace
        * @param isSingleton
    **/
    constructor(nameSpace?: string, isSingleton?: boolean);
    /**
        * Call a function after a client connects to the server.
        * @callback clientObject
    **/
    onConnect(callback: Function): void;
    /**
        * Call a function when a client disconnects from the server.
        * @callback clientObject
    **/
    onDisconnect(callback: Function): void;
    /**
        * Be able to call your client-side functions with ease of mind by setting an array of possible client-side functions.
        * @param fnNames
    **/
    possibleClientFunctions(fnNames: string[]): void;
    /**
        * The safest way to call a client function.
        * @param fnName
        * @param args
    **/
    call(fnName: string, args: any[]): void;
    /**
        * Starts up a server with a specified port and an optional message log.
        * @param port
        * @param startMessage
    **/
    static startServer(port: number, startMessage?: string): void;
    /**
        * Link to a redis server. This is for horizontal scaling your application
        * More can be found on the official redis documentation at https://redis.io/.
        * @param url
    **/
    static setRedisUrl(url: string): void;
    /**
        * Set a route for your application and the file to send with the associated route.
        * @param request
        * @param fileName
    **/
    static setRoute(request: string, fileName: string): void;
    /**
        * Set static folders that can be accessed by a client
        * @param folderPath
    **/
    static setClientFolder(folderPath: any): void;
    /**
        * Set static folders that can be accessed by a client
        * @param folderPaths
    **/
    static setClientFolders(folderPaths: string[]): void;
    /**
        * Expose a server-side function that can be called from the rib-client instance
        * @param fn
    **/
    exposeFunction(fn: ((...args: any[]) => void)): void;
    /**
        * Expose an array of server-side functions that can be called with a rib-client instance
        * @param fns
    **/
    exposeFunctions(fns: ((...args: any[]) => void)[]): void;
    /**
        * Conceal a server-side function where it can no longer be accessed from all clients
        * @param fn
    **/
    concealFunction(fn: ((...args: any[]) => void), client: any): void;
    /**
        * Conceal server-side functions where they can no longer be accessed from the client
        * @param fn
    **/
    concealFunctions(fns: ((...args: any[]) => void)[], client: any): void;
    /**
        * Run a persistent object function that matches a query
        * @param fnName
        * @param args
        * @param query
        * @param cb
    **/
    runPOF(key: string, args: any[], query: object, cb: (...args: any) => void): void;
    private isArgTypesValid;
    private isArgsValid;
    private setCustomHook;
    private setUpSocketMap;
    private setSocketFunctions;
    private sendKeysToClient;
    private setUpPersistentObject;
    private getPersistentObject;
    private setUpKeysFromClient;
    private setClientFunctionMap;
    private recievedKeysFromClientForSocket;
    private recieveKeysFromClient;
}
declare class PersistentObj {
    readonly _ribId: string;
    constructor(id: string);
}
export declare namespace SocketIORib {
    interface Socket extends SocketIO.Socket {
        _ribClient: PersistentObj;
        _ribSentFirstSetOfKeys: boolean;
    }
}
export {};
