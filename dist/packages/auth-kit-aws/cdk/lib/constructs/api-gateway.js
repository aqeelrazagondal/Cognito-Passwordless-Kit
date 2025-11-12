"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGatewayConstruct = void 0;
const constructs_1 = require("constructs");
class ApiGatewayConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.httpApi = {};
        this.handlerFunctions = [];
    }
}
exports.ApiGatewayConstruct = ApiGatewayConstruct;
//# sourceMappingURL=api-gateway.js.map