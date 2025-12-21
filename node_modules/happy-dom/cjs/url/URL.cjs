"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const buffer_1 = require("buffer");
const Blob_js_1 = __importDefault(require("../file/Blob.cjs"));
/**
 * URL.
 */
class URL extends url_1.URL {
    /**
     * Creates a string containing a URL representing the object given in the parameter.
     *
     * @param object Object.
     * @returns URL.
     */
    static createObjectURL(object) {
        if (object instanceof Blob_js_1.default) {
            const blob = new buffer_1.Blob([object._buffer], { type: object.type });
            return super.createObjectURL(blob);
        }
        return super.createObjectURL(object);
    }
}
exports.default = URL;
//# sourceMappingURL=URL.cjs.map