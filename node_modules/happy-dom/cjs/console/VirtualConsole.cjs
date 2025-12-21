"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const VirtualConsoleLogLevelEnum_js_1 = __importDefault(require("./enums/VirtualConsoleLogLevelEnum.cjs"));
const VirtualConsoleLogTypeEnum_js_1 = __importDefault(require("./enums/VirtualConsoleLogTypeEnum.cjs"));
const PerfHooks = __importStar(require("perf_hooks"));
/**
 * Virtual Console.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Console
 */
class VirtualConsole {
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
                type: VirtualConsoleLogTypeEnum_js_1.default.assert,
                level: VirtualConsoleLogLevelEnum_js_1.default.error,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.count,
            level: VirtualConsoleLogLevelEnum_js_1.default.info,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.countReset,
            level: VirtualConsoleLogLevelEnum_js_1.default.warn,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.debug,
            level: VirtualConsoleLogLevelEnum_js_1.default.log,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.dir,
            level: VirtualConsoleLogLevelEnum_js_1.default.log,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.dirxml,
            level: VirtualConsoleLogLevelEnum_js_1.default.log,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.error,
            level: VirtualConsoleLogLevelEnum_js_1.default.error,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.group,
            level: VirtualConsoleLogLevelEnum_js_1.default.log,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.groupCollapsed,
            level: VirtualConsoleLogLevelEnum_js_1.default.log,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.info,
            level: VirtualConsoleLogLevelEnum_js_1.default.info,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.log,
            level: VirtualConsoleLogLevelEnum_js_1.default.log,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.table,
            level: VirtualConsoleLogLevelEnum_js_1.default.log,
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
                type: VirtualConsoleLogTypeEnum_js_1.default.timeEnd,
                level: VirtualConsoleLogLevelEnum_js_1.default.info,
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
                type: VirtualConsoleLogTypeEnum_js_1.default.timeLog,
                level: VirtualConsoleLogLevelEnum_js_1.default.info,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.trace,
            level: VirtualConsoleLogLevelEnum_js_1.default.log,
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
            type: VirtualConsoleLogTypeEnum_js_1.default.warn,
            level: VirtualConsoleLogLevelEnum_js_1.default.warn,
            message: args,
            group: this._groups[this._groups.length - 1] || null
        });
    }
}
exports.default = VirtualConsole;
//# sourceMappingURL=VirtualConsole.cjs.map