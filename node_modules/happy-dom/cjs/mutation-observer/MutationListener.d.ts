import IMutationObserverInit from './IMutationObserverInit.cjs';
import MutationObserver from './MutationObserver.cjs';
import MutationRecord from './MutationRecord.cjs';
/**
 * MutationObserverListener is a model for what to listen for on a Node.
 */
export default class MutationListener {
    options: IMutationObserverInit;
    observer: MutationObserver;
    callback: (record: MutationRecord[], observer: MutationObserver) => void;
}
//# sourceMappingURL=MutationListener.d.ts.map