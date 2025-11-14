"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const sns_bounce_handler_1 = require("./sns-bounce-handler");
async function handler(event, context) {
    return (0, sns_bounce_handler_1.handler)(event, context);
}
//# sourceMappingURL=ses-complaint-handler.js.map