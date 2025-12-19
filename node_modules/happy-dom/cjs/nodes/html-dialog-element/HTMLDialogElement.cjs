"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Event_js_1 = __importDefault(require("../../event/Event.cjs"));
const HTMLElement_js_1 = __importDefault(require("../html-element/HTMLElement.cjs"));
/**
 * HTML Dialog Element.
 *
 * Reference:
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement.
 */
class HTMLDialogElement extends HTMLElement_js_1.default {
    constructor() {
        super(...arguments);
        this.returnValue = '';
        // Events
        this.oncancel = null;
        this.onclose = null;
    }
    /**
     * Sets the "open" attribute.
     *
     * @param open Open.
     */
    set open(open) {
        if (open) {
            this.setAttribute('open', '');
        }
        else {
            this.removeAttribute('open');
        }
    }
    /**
     * Returns open.
     *
     * @returns Open.
     */
    get open() {
        return this.getAttribute('open') !== null;
    }
    /**
     * Closes the dialog.
     *
     * @param [returnValue] ReturnValue.
     */
    close(returnValue = '') {
        const wasOpen = this.open;
        this.removeAttribute('open');
        this.returnValue = returnValue;
        if (wasOpen) {
            this.dispatchEvent(new Event_js_1.default('close'));
        }
    }
    /**
     * Shows the modal.
     */
    showModal() {
        this.setAttribute('open', '');
    }
    /**
     * Shows the dialog.
     */
    show() {
        this.setAttribute('open', '');
    }
}
exports.default = HTMLDialogElement;
//# sourceMappingURL=HTMLDialogElement.cjs.map