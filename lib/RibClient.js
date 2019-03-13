"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io-client");
let instance = null;
class RibClient {
    constructor(urlNamespace, isSingleton = true) {
        this.functionMap = new Map();
        let returnInstance = this;
        if (isSingleton && instance) {
            returnInstance = instance;
        }
        else {
            this.socket = urlNamespace ? io(urlNamespace) : io('/');
        }
        if (isSingleton && !instance) {
            instance = this;
        }
        return returnInstance;
    }
    onConnect(cb) {
        this.socket.on('RibSendKeysToClient', (keys) => {
            this.setUpFunctions(keys);
            this.setUpSocketFunctions();
            let clientKeys = [...this.functionMap.keys()];
            this.socket.emit('RibSendKeysToServer', clientKeys);
            cb();
        });
    }
    exposeFunction(func) {
        let funcName = func.name;
        if (this.functionMap.get(funcName)) {
            throw new Error(`${funcName} already exists. The function names need to be unique`);
        }
        else {
            this.functionMap.set(funcName, func);
        }
    }
    exposeFunctions(funcs) {
        for (let func of funcs) {
            this.exposeFunction(func);
        }
    }
    concealFunction(func) {
        let funcName = func.name;
        this.functionMap.delete(funcName);
    }
    concealFunctions(funcs) {
        for (let func of funcs) {
            this.concealFunction(func);
        }
    }
    setUpSocketFunctions() {
        this.functionMap.forEach((fn, event) => {
            this.socket.on(event, (...args) => {
                fn(...args);
            });
        });
    }
    setUpFunctions(keys) {
        for (let key of keys) {
            this[key] = (...args) => {
                this.socket.emit(key, ...args);
            };
        }
    }
}
exports.default = RibClient;
//# sourceMappingURL=RibClient.js.map