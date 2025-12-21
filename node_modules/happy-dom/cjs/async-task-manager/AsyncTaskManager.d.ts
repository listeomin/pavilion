/// <reference types="node" />
/**
 * Handles async tasks.
 */
export default class AsyncTaskManager {
    private static taskID;
    private runningTasks;
    private runningTaskCount;
    private runningTimers;
    private runningImmediates;
    private whenCompleteImmediate;
    private whenCompleteResolvers;
    /**
     * Returns a promise that is resolved when async tasks are complete.
     *
     * @returns Promise.
     */
    whenComplete(): Promise<void>;
    /**
     * Cancels all tasks.
     */
    cancelAll(): void;
    /**
     * Starts a timer.
     *
     * @param timerID Timer ID.
     */
    startTimer(timerID: NodeJS.Timeout): void;
    /**
     * Ends a timer.
     *
     * @param timerID Timer ID.
     */
    endTimer(timerID: NodeJS.Timeout): void;
    /**
     * Starts an immediate.
     *
     * @param immediateID Immediate ID.
     */
    startImmediate(immediateID: NodeJS.Immediate): void;
    /**
     * Ends an immediate.
     *
     * @param immediateID Immediate ID.
     */
    endImmediate(immediateID: NodeJS.Immediate): void;
    /**
     * Starts an async task.
     *
     * @param abortHandler Abort handler.
     * @returns Task ID.
     */
    startTask(abortHandler?: () => void): number;
    /**
     * Ends an async task.
     *
     * @param taskID Task ID.
     */
    endTask(taskID: number): void;
    /**
     * Returns the amount of running tasks.
     *
     * @returns Count.
     */
    getTaskCount(): number;
    /**
     * Returns a new task ID.
     *
     * @returns Task ID.
     */
    private newTaskID;
    /**
     * Resolves when complete.
     */
    private resolveWhenComplete;
}
//# sourceMappingURL=AsyncTaskManager.d.ts.map