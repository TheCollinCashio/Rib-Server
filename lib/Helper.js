"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function doesObjectMatchQuery(obj, query) {
    let isFound = true;
    for (let key in query) {
        if (key === '$or') {
            let isOrFind = false;
            for (let nextObj of query[key]) {
                for (let orKey in nextObj) {
                    let queryValue = nextObj[orKey];
                    if (queryValue['$in']) {
                        let foundInArray = true;
                        for (let valueIn of queryValue['$in']) {
                            if (!obj[orKey].includes(valueIn.toString())) {
                                foundInArray = false;
                                break;
                            }
                        }
                        if (!foundInArray) {
                            isFound = false;
                            break;
                        }
                        else {
                            isOrFind = true;
                            break;
                        }
                    }
                    else if (typeof obj[orKey] === 'object' && typeof queryValue === 'object') {
                        isOrFind = doesObjectMatchQuery(obj[orKey], queryValue);
                        if (isOrFind) {
                            break;
                        }
                    }
                    else if (typeof obj[key] !== 'object' && typeof queryValue === 'object') {
                        if (queryValue['$ne'] !== undefined) {
                            if (queryValue['$ne'] !== obj[key]) {
                                isOrFind = true;
                                break;
                            }
                        }
                        if (queryValue['$eq'] !== undefined) {
                            if (queryValue['$eq'] === obj[key]) {
                                isOrFind = true;
                                break;
                            }
                        }
                    }
                    else if (typeof obj[key] !== 'object' && typeof queryValue !== 'object') {
                        if (obj[orKey] === queryValue) {
                            isOrFind = true;
                            break;
                        }
                    }
                    else if (obj[orKey] == queryValue) {
                        isOrFind = true;
                        break;
                    }
                }
                if (isOrFind) {
                    break;
                }
            }
            isFound = isOrFind;
        }
        else {
            let queryValue = query[key];
            if (key === '$in') {
                let foundInArray = true;
                for (let valueIn of query['$in']) {
                    if (!obj.includes(valueIn.toString())) {
                        foundInArray = false;
                        break;
                    }
                }
                if (!foundInArray) {
                    isFound = false;
                    break;
                }
            }
            else {
                if (typeof obj[key] === 'object' && typeof queryValue === 'object') {
                    isFound = doesObjectMatchQuery(obj[key], queryValue);
                    if (!isFound) {
                        break;
                    }
                }
                else if (typeof obj[key] !== 'object' && typeof queryValue === 'object') {
                    if (queryValue['$ne'] !== undefined) {
                        if (queryValue['$ne'] === obj[key]) {
                            isFound = false;
                            break;
                        }
                    }
                    if (queryValue['$eq'] !== undefined) {
                        if (queryValue['$eq'] !== obj[key]) {
                            isFound = false;
                            break;
                        }
                    }
                }
                else if (typeof obj[key] !== 'object' && typeof queryValue !== 'object') {
                    if (obj[key] !== queryValue) {
                        isFound = false;
                        break;
                    }
                }
                else if (obj[key] != queryValue) {
                    isFound = false;
                    break;
                }
            }
        }
    }
    return isFound;
}
exports.doesObjectMatchQuery = doesObjectMatchQuery;
//# sourceMappingURL=Helper.js.map