/**
 * Handles async tasks.
 */
class AsyncTaskManager {
    constructor() {
        this.runningTasks = {};
        this.runningTaskCount = 0;
        this.runningTimers = [];
        this.runningImmediates = [];
        this.whenCompleteImmediate = null;
        this.whenCompleteResolvers = [];
    }
    /**
     * Returns a promise that is resolved when async tasks are complete.
     *
     * @returns Promise.
     */
    whenComplete() {
        return new Promise((resolve) => {
            this.whenCompleteResolvers.push(resolve);
            this.endTask(this.startTask());
        });
    }
    /**
     * Cancels all tasks.
     */
    cancelAll() {
        const runningTimers = this.runningTimers;
        const runningImmediates = this.runningImmediates;
        const runningTasks = this.runningTasks;
        this.runningTasks = {};
        this.runningTaskCount = 0;
        this.runningImmediates = [];
        this.runningTimers = [];
        if (this.whenCompleteImmediate) {
            global.clearImmediate(this.whenCompleteImmediate);
            this.whenCompleteImmediate = null;
        }
        for (const immediate of runningImmediates) {
            global.clearImmediate(immediate);
        }
        for (const timer of runningTimers) {
            global.clearTimeout(timer);
        }
        for (const key of Object.keys(runningTasks)) {
            runningTasks[key]();
        }
        this.resolveWhenComplete();
    }
    /**
     * Starts a timer.
     *
     * @param timerID Timer ID.
     */
    startTimer(timerID) {
        this.runningTimers.push(timerID);
    }
    /**
     * Ends a timer.
     *
     * @param timerID Timer ID.
     */
    endTimer(timerID) {
        const index = this.runningTimers.indexOf(timerID);
        if (index !== -1) {
            this.runningTimers.splice(index, 1);
            if (!this.runningTaskCount && !this.runningTimers.length && !this.runningImmediates.length) {
                this.resolveWhenComplete();
            }
        }
    }
    /**
     * Starts an immediate.
     *
     * @param immediateID Immediate ID.
     */
    startImmediate(immediateID) {
        this.runningImmediates.push(immediateID);
    }
    /**
     * Ends an immediate.
     *
     * @param immediateID Immediate ID.
     */
    endImmediate(immediateID) {
        const index = this.runningImmediates.indexOf(immediateID);
        if (index !== -1) {
            this.runningImmediates.splice(index, 1);
            if (!this.runningTaskCount && !this.runningTimers.length && !this.runningImmediates.length) {
                this.resolveWhenComplete();
            }
        }
    }
    /**
     * Starts an async task.
     *
     * @param abortHandler Abort handler.
     * @returns Task ID.
     */
    startTask(abortHandler) {
        const taskID = this.newTaskID();
        this.runningTasks[taskID] = abortHandler ? abortHandler : () => { };
        this.runningTaskCount++;
        return taskID;
    }
    /**
     * Ends an async task.
     *
     * @param taskID Task ID.
     */
    endTask(taskID) {
        if (this.runningTasks[taskID]) {
            delete this.runningTasks[taskID];
            this.runningTaskCount--;
            if (this.whenCompleteImmediate) {
                global.clearImmediate(this.whenCompleteImmediate);
            }
            if (!this.runningTaskCount && !this.runningTimers.length && !this.runningImmediates.length) {
                this.whenCompleteImmediate = global.setImmediate(() => {
                    this.whenCompleteImmediate = null;
                    if (!this.runningTaskCount &&
                        !this.runningTimers.length &&
                        !this.runningImmediates.length) {
                        this.resolveWhenComplete();
                    }
                });
            }
        }
    }
    /**
     * Returns the amount of running tasks.
     *
     * @returns Count.
     */
    getTaskCount() {
        return this.runningTaskCount;
    }
    /**
     * Returns a new task ID.
     *
     * @returns Task ID.
     */
    newTaskID() {
        this.constructor.taskID++;
        return this.constructor.taskID;
    }
    /**
     * Resolves when complete.
     */
    resolveWhenComplete() {
        const resolvers = this.whenCompleteResolvers;
        this.whenCompleteResolvers = [];
        for (const resolver of resolvers) {
            resolver();
        }
    }
}
AsyncTaskManager.taskID = 0;
export default AsyncTaskManager;
//# sourceMappingURL=AsyncTaskManager.js.map