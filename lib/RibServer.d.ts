/// <reference types="socket.io" />
export default class RibServer {
    _nameSpace: SocketIO.Namespace;
    private connFunction;
    private serverFunctionMap;
    private clientFunctionMap;
    _socketMap: Map<string, SocketIORib.Socket>;
    /**
        * Create an instance of RibServer
        * @param nameSpace
        * @param isSingleton
    **/
    constructor(nameSpace?: string, isSingleton?: boolean);
    /**
        * Called after a rib client connects to the server
        * @callback clientObject
    **/
    onConnect(callback: Function): void;
    /**
        * Sets all possible client functions
        * @param fnNames
    **/
    possibleClientFunctions(fnNames: string[]): void;
    /**
        * Starts up a server with a specified port and an optional message log
        * @param port
        * @param startMessage
    **/
    static startServer(port: number, startMessage?: string): void;
    /**
        * Link to a redis server. This is for horizontal scaling your application
        * More can be found on the official redis documentation at https://redis.io/
        * @param url
    **/
    static setRedisUrl(url: string): void;
    /**
        * Set a route for your application and the file to send with the associated route
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
        * Expose a server function that can be called with an instance of rib client
        * @param fn
    **/
    exposeFunction(fn: ((...args: any[]) => void)): void;
    /**
        * Expose server functions that can be called with an instance of rib client
        * @param fns
    **/
    exposeFunctions(fns: ((...args: any[]) => void)[]): void;
    /**
        * Conceal a server side function where it can no longer be accessed from a specific client
        * @param fn
    **/
    concealFunction(fn: ((...args: any[]) => void), client: any): void;
    /**
        * Conceal server side functions where they can no longer be accessed from a specific client
        * @param fn
    **/
    concealFunctions(fns: ((...args: any[]) => void)[], client: any): void;
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
export declare namespace SocketIORib {
    interface Socket extends SocketIO.Socket {
        _ribClient: any;
        _ribSentFirstSetOfKeys: boolean;
    }
}
