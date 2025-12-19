"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FocusEvent_js_1 = __importDefault(require("../../event/events/FocusEvent.cjs"));
/**
 * HTMLElement utility.
 */
class HTMLElementUtility {
    /**
     * Triggers a blur event.
     *
     * @param element Element.
     */
    static blur(element) {
        if (element.ownerDocument['_activeElement'] !== element || !element.isConnected) {
            return;
        }
        const relatedTarget = element.ownerDocument['_nextActiveElement'] ?? null;
        element.ownerDocument['_activeElement'] = null;
        element.dispatchEvent(new FocusEvent_js_1.default('blur', {
            relatedTarget,
            bubbles: false,
            composed: true
        }));
        element.dispatchEvent(new FocusEvent_js_1.default('focusout', {
            relatedTarget,
            bubbles: true,
            composed: true
        }));
    }
    /**
     * Triggers a focus event.
     *
     * @param element Element.
     */
    static focus(element) {
        if (element.ownerDocument['_activeElement'] === element || !element.isConnected) {
            return;
        }
        // Set the next active element so `blur` can use it for `relatedTarget`.
        element.ownerDocument['_nextActiveElement'] = element;
        const relatedTarget = element.ownerDocument['_activeElement'];
        if (element.ownerDocument['_activeElement'] !== null) {
            element.ownerDocument['_activeElement'].blur();
        }
        // Clean up after blur, so it does not affect next blur call.
        element.ownerDocument['_nextActiveElement'] = null;
        element.ownerDocument['_activeElement'] = element;
        element.dispatchEvent(new FocusEvent_js_1.default('focus', {
            relatedTarget,
            bubbles: false,
            composed: true
        }));
        element.dispatchEvent(new FocusEvent_js_1.default('focusin', {
            relatedTarget,
            bubbles: true,
            composed: true
        }));
    }
}
exports.default = HTMLElementUtility;
//# sourceMappingURL=HTMLElementUtility.cjs.map