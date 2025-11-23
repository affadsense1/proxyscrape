// 全局任务锁管理
let currentTask: { type: 'scan' | 'health-check' | null; startTime: Date | null } = {
    type: null,
    startTime: null
};

export function acquireLock(taskType: 'scan' | 'health-check'): boolean {
    if (currentTask.type !== null) {
        // 已有任务在运行
        return false;
    }

    const now = new Date();
    currentTask = {
        type: taskType,
        startTime: now
    };

    console.log(`[TaskLock] 获取锁: ${taskType} at ${now.toISOString()}`);
    return true;
}

export function releaseLock(taskType: 'scan' | 'health-check'): void {
    if (currentTask.type === taskType) {
        const duration = currentTask.startTime
            ? Math.floor((new Date().getTime() - currentTask.startTime.getTime()) / 1000)
            : 0;

        console.log(`[TaskLock] 释放锁: ${taskType}, 耗时 ${duration}s`);

        currentTask = {
            type: null,
            startTime: null
        };
    }
}

export function getCurrentTask(): { type: 'scan' | 'health-check' | null; startTime: Date | null } {
    return { ...currentTask };
}

export function isLocked(): boolean {
    return currentTask.type !== null;
}

export function getTaskStatus() {
    if (!currentTask.type) {
        return {
            locked: false,
            taskType: null,
            duration: 0
        };
    }

    const duration = currentTask.startTime
        ? Math.floor((new Date().getTime() - currentTask.startTime.getTime()) / 1000)
        : 0;

    return {
        locked: true,
        taskType: currentTask.type,
        startTime: currentTask.startTime?.toISOString(),
        duration
    };
}
