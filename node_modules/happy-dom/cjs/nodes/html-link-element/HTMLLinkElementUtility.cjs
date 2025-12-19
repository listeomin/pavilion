"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Event_js_1 = __importDefault(require("../../event/Event.cjs"));
const ResourceFetch_js_1 = __importDefault(require("../../fetch/ResourceFetch.cjs"));
const CSSStyleSheet_js_1 = __importDefault(require("../../css/CSSStyleSheet.cjs"));
const DOMException_js_1 = __importDefault(require("../../exception/DOMException.cjs"));
const DOMExceptionNameEnum_js_1 = __importDefault(require("../../exception/DOMExceptionNameEnum.cjs"));
const WindowErrorUtility_js_1 = __importDefault(require("../../window/WindowErrorUtility.cjs"));
/**
 * Helper class for getting the URL relative to a Location object.
 */
class HTMLLinkElementUtility {
    /**
     * Returns a URL relative to the given Location object.
     *
     * @param options Options.
     * @param options.element Element.
     * @param element
     */
    static async loadExternalStylesheet(element) {
        const href = element.getAttribute('href');
        const rel = element.getAttribute('rel');
        if (href !== null && rel && rel.toLowerCase() === 'stylesheet' && element.isConnected) {
            if (element.ownerDocument.defaultView.happyDOM.settings.disableCSSFileLoading) {
                const error = new DOMException_js_1.default(`Failed to load external stylesheet "${href}". CSS file loading is disabled.`, DOMExceptionNameEnum_js_1.default.notSupportedError);
                WindowErrorUtility_js_1.default.dispatchError(element, error);
                if (element.ownerDocument.defaultView.happyDOM.settings.disableErrorCapturing) {
                    throw error;
                }
                return;
            }
            element.ownerDocument._readyStateManager.startTask();
            let code = null;
            let error = null;
            try {
                code = await ResourceFetch_js_1.default.fetch(element.ownerDocument, href);
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
                const styleSheet = new CSSStyleSheet_js_1.default();
                styleSheet.replaceSync(code);
                element.sheet = styleSheet;
                element.dispatchEvent(new Event_js_1.default('load'));
            }
        }
    }
}
exports.default = HTMLLinkElementUtility;
//# sourceMappingURL=HTMLLinkElementUtility.cjs.map