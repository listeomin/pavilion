import VirtualConsoleLogLevelEnum from './enums/VirtualConsoleLogLevelEnum.js';
import VirtualConsoleLogTypeEnum from './enums/VirtualConsoleLogTypeEnum.js';
import * as PerfHooks from 'perf_hooks';
/**
 * Virtual Console.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console
 */
export default class VirtualConsole {
    /**
     * Constructor.
     *
     * @param printer Console printer.
     */
    constructor(printer) {
        this._count = {};
        this._time = {};
        this._groupID = 0;
        this._groups = [];
        this._printer = printer;
    }
    /**
     * Writes an error message to the console if the assertion is false. If the assertion is true, nothing happens.
     *
     * @param assertion Assertion.
     * @param args Arguments.
     */
    assert(assertion, ...args) {
        if (!assertion) {
            this._printer.print({
                type: VirtualConsoleLogTypeEnum.assert,
                level: VirtualConsoleLogLevelEnum.error,
                message: ['Assertion failed:', ...args],
                group: this._groups[this._groups.length - 1] || null
            });
        }
    }
    /**
     * Clears the console.
     */
    clear() {
        this._printer.clear();
    }
    /**
     * Logs the number of times that this particular call to count() has been called.
     *
     * @param [label='default'] Label.
     */
    count(label = 'default') {
        if (!this._count[label]) {
            this._count[label] = 0;
        }
        this._count[label]++;
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.count,
            level: VirtualConsoleLogLevelEnum.info,
            message: [`${label}: ${this._count[label]}`],
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Resets the counter.
     *
     * @param [label='default'] Label.
     */
    countReset(label = 'default') {
        delete this._count[label];
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.countReset,
            level: VirtualConsoleLogLevelEnum.warn,
            message: [`${label}: 0`],
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Outputs a message to the web console at the "debug" log level.
     *
     * @param args Arguments.
     */
    debug(...args) {
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.debug,
            level: VirtualConsoleLogLevelEnum.log,
            message: args,
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Displays an interactive list of the properties of the specified JavaScript object.
     *
     * @param data Data.
     */
    dir(data) {
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.dir,
            level: VirtualConsoleLogLevelEnum.log,
            message: [data],
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Displays an interactive tree of the descendant elements of the specified XML/HTML element.
     *
     * @param data Data.
     */
    dirxml(data) {
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.dirxml,
            level: VirtualConsoleLogLevelEnum.log,
            message: [data],
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Outputs an error message to the console.
     *
     * @param args Arguments.
     */
    error(...args) {
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.error,
            level: VirtualConsoleLogLevelEnum.error,
            message: args,
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Alias for error().
     *
     * @deprecated
     * @alias error()
     * @param args Arguments.
     */
    exception(...args) {
        this.error(...args);
    }
    /**
     * Creates a new inline group in the console, causing any subsequent console messages to be indented by an additional level, until console.groupEnd() is called.
     *
     * @param [label] Label.
     */
    group(label) {
        this._groupID++;
        const group = {
            id: this._groupID,
            label: label || 'default',
            collapsed: false,
            parent: this._groups[this._groups.length - 1] || null
        };
        this._groups.push(group);
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.group,
            level: VirtualConsoleLogLevelEnum.log,
            message: [label || 'default'],
            group
        });
    }
    /**
     * Creates a new inline group in the console, but prints it as collapsed, requiring the use of a disclosure button to expand it.
     *
     * @param [label] Label.
     */
    groupCollapsed(label) {
        this._groupID++;
        const group = {
            id: this._groupID,
            label: label || 'default',
            collapsed: true,
            parent: this._groups[this._groups.length - 1] || null
        };
        this._groups.push(group);
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.groupCollapsed,
            level: VirtualConsoleLogLevelEnum.log,
            message: [label || 'default'],
            group
        });
    }
    /**
     * Exits the current inline group in the console.
     */
    groupEnd() {
        if (this._groups.length === 0) {
            return;
        }
        this._groups.pop();
    }
    /**
     *
     * @param args
     */
    info(...args) {
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.info,
            level: VirtualConsoleLogLevelEnum.info,
            message: args,
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Outputs a message to the console.
     *
     * @param args Arguments.
     */
    log(...args) {
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.log,
            level: VirtualConsoleLogLevelEnum.log,
            message: args,
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Starts recording a performance profile.
     *
     * TODO: Implement this.
     */
    profile() {
        throw new Error('Method not implemented.');
    }
    /**
     * Stops recording a performance profile.
     *
     * TODO: Implement this.
     */
    profileEnd() {
        throw new Error('Method not implemented.');
    }
    /**
     * Displays tabular data as a table.
     *
     * @param data Data.
     */
    table(data) {
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.table,
            level: VirtualConsoleLogLevelEnum.log,
            message: [data],
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Starts a timer you can use to track how long an operation takes.
     *
     * @param [label=default] Label.
     */
    time(label = 'default') {
        this._time[label] = PerfHooks.performance.now();
    }
    /**
     * Stops a timer that was previously started by calling console.time().
     * The method logs the elapsed time in milliseconds.
     *
     * @param [label=default] Label.
     */
    timeEnd(label = 'default') {
        const time = this._time[label];
        if (time) {
            const duration = PerfHooks.performance.now() - time;
            this._printer.print({
                type: VirtualConsoleLogTypeEnum.timeEnd,
                level: VirtualConsoleLogLevelEnum.info,
                message: [`${label}: ${duration}ms - timer ended`],
                group: this._groups[this._groups.length - 1] || null
            });
        }
    }
    /**
     * Logs the current value of a timer that was previously started by calling console.time().
     * The method logs the elapsed time in milliseconds.
     *
     * @param [label=default] Label.
     * @param [args] Arguments.
     */
    timeLog(label = 'default', ...args) {
        const time = this._time[label];
        if (time) {
            const duration = PerfHooks.performance.now() - time;
            this._printer.print({
                type: VirtualConsoleLogTypeEnum.timeLog,
                level: VirtualConsoleLogLevelEnum.info,
                message: [`${label}: ${duration}ms`, ...args],
                group: this._groups[this._groups.length - 1] || null
            });
        }
    }
    /**
     * Adds a single marker to the browser's Performance tool.
     *
     * TODO: Implement this.
     */
    timeStamp() {
        throw new Error('Method not implemented.');
    }
    /**
     * Outputs a stack trace to the console.
     *
     * @param args Arguments.
     */
    trace(...args) {
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.trace,
            level: VirtualConsoleLogLevelEnum.log,
            message: [...args, new Error('stack').stack.replace('Error: stack', '')],
            group: this._groups[this._groups.length - 1] || null
        });
    }
    /**
     * Outputs a warning message to the console.
     *
     * @param args Arguments.
     */
    warn(...args) {
        this._printer.print({
            type: VirtualConsoleLogTypeEnum.warn,
            level: VirtualConsoleLogLevelEnum.warn,
            message: args,
            group: this._groups[this._groups.length - 1] || null
        });
    }
}
//# sourceMappingURL=VirtualConsole.js.map