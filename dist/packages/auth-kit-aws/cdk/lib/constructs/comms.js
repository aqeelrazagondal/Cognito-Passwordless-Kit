"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommsConstruct = void 0;
const constructs_1 = require("constructs");
class CommsConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.snsTopic = {};
        this.sesIdentity = 'noreply@example.com';
    }
}
exports.CommsConstruct = CommsConstruct;
//# sourceMappingURL=comms.js.map