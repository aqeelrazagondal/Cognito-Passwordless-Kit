"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoConstruct = void 0;
const constructs_1 = require("constructs");
class CognitoConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.userPool = {};
        this.publicClient = {};
        this.triggerFunctions = [];
    }
}
exports.CognitoConstruct = CognitoConstruct;
//# sourceMappingURL=cognito.js.map