import Event from '../../event/Event.js';
import HTMLElement from '../html-element/HTMLElement.js';
/**
 * HTML Dialog Element.
 *
 * Reference:
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement.
 */
export default class HTMLDialogElement extends HTMLElement {
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
            this.dispatchEvent(new Event('close'));
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
//# sourceMappingURL=HTMLDialogElement.js.map