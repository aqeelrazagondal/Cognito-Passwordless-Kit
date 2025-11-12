"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityConstruct = void 0;
const constructs_1 = require("constructs");
class ObservabilityConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.dashboardUrl = 'https://console.aws.amazon.com/cloudwatch';
    }
}
exports.ObservabilityConstruct = ObservabilityConstruct;
//# sourceMappingURL=observability.js.map