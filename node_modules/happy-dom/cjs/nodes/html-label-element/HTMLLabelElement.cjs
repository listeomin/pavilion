"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTMLElement_js_1 = __importDefault(require("../html-element/HTMLElement.cjs"));
const EventPhaseEnum_js_1 = __importDefault(require("../../event/EventPhaseEnum.cjs"));
const PointerEvent_js_1 = __importDefault(require("../../event/events/PointerEvent.cjs"));
/**
 * HTML Label Element.
 *
 * Reference:
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement.
 */
class HTMLLabelElement extends HTMLElement_js_1.default {
    /**
     * Returns a string containing the ID of the labeled control. This reflects the "for" attribute.
     *
     * @returns ID of the labeled control.
     */
    get htmlFor() {
        const htmlFor = this.getAttribute('for');
        if (htmlFor !== null) {
            return htmlFor;
        }
        return htmlFor !== null ? htmlFor : '';
    }
    /**
     * Sets a string containing the ID of the labeled control. This reflects the "for" attribute.
     *
     * @param htmlFor ID of the labeled control.
     */
    set htmlFor(htmlFor) {
        this.setAttribute('for', htmlFor);
    }
    /**
     * Returns an HTML element representing the control with which the label is associated.
     *
     * @returns Control element.
     */
    get control() {
        const htmlFor = this.htmlFor;
        if (htmlFor) {
            const control = this.ownerDocument.getElementById(htmlFor);
            return control !== this ? control : null;
        }
        return (this.querySelector('button,input:not([type="hidden"]),meter,output,progress,select,textarea'));
    }
    /**
     * Returns the parent form element.
     *
     * @returns Form.
     */
    get form() {
        return this._formNode;
    }
    /**
     * Clones a node.
     *
     * @override
     * @param [deep=false] "true" to clone deep.
     * @returns Cloned node.
     */
    cloneNode(deep = false) {
        return super.cloneNode(deep);
    }
    /**
     * @override
     */
    dispatchEvent(event) {
        const returnValue = super.dispatchEvent(event);
        if (event.type === 'click' &&
            (event.eventPhase === EventPhaseEnum_js_1.default.atTarget || event.eventPhase === EventPhaseEnum_js_1.default.bubbling)) {
            const control = this.control;
            if (control && event.target !== control) {
                control.dispatchEvent(new PointerEvent_js_1.default('click', { bubbles: true, cancelable: true }));
            }
        }
        return returnValue;
    }
}
exports.default = HTMLLabelElement;
//# sourceMappingURL=HTMLLabelElement.cjs.map