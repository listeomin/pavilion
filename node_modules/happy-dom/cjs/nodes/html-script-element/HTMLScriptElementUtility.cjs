"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Event_js_1 = __importDefault(require("../../event/Event.cjs"));
const DOMException_js_1 = __importDefault(require("../../exception/DOMException.cjs"));
const DOMExceptionNameEnum_js_1 = __importDefault(require("../../exception/DOMExceptionNameEnum.cjs"));
const ResourceFetch_js_1 = __importDefault(require("../../fetch/ResourceFetch.cjs"));
const WindowErrorUtility_js_1 = __importDefault(require("../../window/WindowErrorUtility.cjs"));
/**
 * Helper class for getting the URL relative to a Location object.
 */
class HTMLScriptElementUtility {
    /**
     * Returns a URL relative to the given Location object.
     *
     * @param options Options.
     * @param options.element Element.
     * @param element
     */
    static async loadExternalScript(element) {
        const src = element.getAttribute('src');
        const async = element.getAttribute('async') !== null;
        if (element.ownerDocument.defaultView.happyDOM.settings.disableJavaScriptFileLoading ||
            element.ownerDocument.defaultView.happyDOM.settings.disableJavaScriptEvaluation) {
            const error = new DOMException_js_1.default(`Failed to load external script "${src}". JavaScript file loading is disabled.`, DOMExceptionNameEnum_js_1.default.notSupportedError);
            WindowErrorUtility_js_1.default.dispatchError(element, error);
            if (element.ownerDocument.defaultView.happyDOM.settings.disableErrorCapturing) {
                throw error;
            }
            return;
        }
        if (async) {
            element.ownerDocument._readyStateManager.startTask();
            let code = null;
            let error = null;
            try {
                code = await ResourceFetch_js_1.default.fetch(element.ownerDocument, src);
            }
            catch (e) {
                error = e;
            }
            element.ownerDocument._readyStateManager.endTask();
            if (error) {
                WindowErrorUtility_js_1.default.dispatchError(element, error);
                if (element.ownerDocument.defaultView.happyDOM.settings.disableErrorCapturing) {
                    throw error;
                }
            }
            else {
                element.ownerDocument['_currentScript'] = element;
                if (element.ownerDocument.defaultView.happyDOM.settings.disableErrorCapturing) {
                    element.ownerDocument.defaultView.eval(code);
                }
                else {
                    WindowErrorUtility_js_1.default.captureError(element.ownerDocument.defaultView, () => element.ownerDocument.defaultView.eval(code));
                }
                element.ownerDocument['_currentScript'] = null;
                element.dispatchEvent(new Event_js_1.default('load'));
            }
        }
        else {
            let code = null;
            let error = null;
            try {
                code = ResourceFetch_js_1.default.fetchSync(element.ownerDocument, src);
            }
            catch (e) {
                error = e;
            }
            if (error) {
                WindowErrorUtility_js_1.default.dispatchError(element, error);
                if (element.ownerDocument.defaultView.happyDOM.settings.disableErrorCapturing) {
                    throw error;
                }
            }
            else {
                element.ownerDocument['_currentScript'] = element;
                if (element.ownerDocument.defaultView.happyDOM.settings.disableErrorCapturing) {
                    element.ownerDocument.defaultView.eval(code);
                }
                else {
                    WindowErrorUtility_js_1.default.captureError(element.ownerDocument.defaultView, () => element.ownerDocument.defaultView.eval(code));
                }
                element.ownerDocument['_currentScript'] = null;
                element.dispatchEvent(new Event_js_1.default('load'));
            }
        }
    }
}
exports.default = HTMLScriptElementUtility;
//# sourceMappingURL=HTMLScriptElementUtility.cjs.map