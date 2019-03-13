export default class RibClient {
    private socket;
    private functionMap;
    constructor(urlNamespace?: string, isSingleton?: boolean);
    onConnect(cb: Function): void;
    exposeFunction(func: Function): void;
    exposeFunctions(funcs: Function[]): void;
    concealFunction(func: Function): void;
    concealFunctions(funcs: Function[]): void;
    private setUpSocketFunctions;
    private setUpFunctions;
}
