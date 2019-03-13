/// <reference types="socket.io" />
export default class RibServer {
    private connFunc;
    private nameSpace;
    private serverFunctionMap;
    private clientFunctionMap;
    private socketList;
    constructor(nameSpace?: string, isSingleton?: boolean);
    /**
        * Called after a rib client connects to the server
        * @callback clientObject
    **/
    onConnect(callback: Function): void;
    /**
        * Sets all possible client functions
        * @param funcNames
    **/
    possibleClientFunctions(funcNames: string[]): void;
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
        * Set a static file that can be accessed from your app
        * @param request
        * @param fileName
    **/
    static setClientFolder(folderNames: string[]): void;
    /**
        * Expose a server function that can be called with ClientRib
        * @param func
    **/
    exposeFunction(func: Function): void;
    /**
        * Expose an array of server functions that can be called with ClientRib
        * @param func
    **/
    exposeFunctions(funcs: Function[]): void;
    /**
        * Stop listening for requests from this function called on the client
        * @param func
    **/
    concealFunction(func: Function): void;
    /**
        * Stop listening for requests from these functions called on the client
        * @param func
    **/
    concealFunctions(funcs: Function[]): void;
    private setUpSocketList;
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
    }
}
