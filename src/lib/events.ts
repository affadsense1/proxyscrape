import { EventEmitter } from 'events';

// 使用全局变量确保在 Next.js 开发环境下热重载时保持单例
const globalForEvents = global as unknown as { 
    scanEvents: EventEmitter;
    dataChangeEvents: EventEmitter;
};

export const scanEvents = globalForEvents.scanEvents || new EventEmitter();
export const dataChangeEvents = globalForEvents.dataChangeEvents || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
    globalForEvents.scanEvents = scanEvents;
    globalForEvents.dataChangeEvents = dataChangeEvents;
}

export interface ScanProgress {
    total: number;
    current: number;
    currentNode?: string;
    status: 'idle' | 'scanning' | 'completed' | 'error';
    logs: string[];
    successCount?: number;
    failedCount?: number;
}

export interface DataChangeEvent {
    type: 'nodes_updated' | 'nodes_cleared' | 'config_updated';
    timestamp: string;
    data?: {
        totalNodes?: number;
        aliveNodes?: number;
        operation?: string;
    };
}

let currentProgress: ScanProgress = {
    total: 0,
    current: 0,
    status: 'idle',
    logs: []
};

// 节流控制
let lastBroadcastTime = 0;
const BROADCAST_THROTTLE_MS = 500; // 每秒最多2次

export function updateProgress(update: Partial<ScanProgress>) {
    currentProgress = { ...currentProgress, ...update };
    // 限制日志长度
    if (currentProgress.logs.length > 50) {
        currentProgress.logs = currentProgress.logs.slice(-50);
    }
    scanEvents.emit('progress', currentProgress);
}

export function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${message}`;
    const newLogs = [...currentProgress.logs, log];
    updateProgress({ logs: newLogs });
}

export function getProgress() {
    return currentProgress;
}

export function broadcastDataChange(event: DataChangeEvent) {
    const now = Date.now();
    
    // 节流：限制广播频率
    if (now - lastBroadcastTime < BROADCAST_THROTTLE_MS) {
        // 如果是重要事件（清空或完成），跳过节流
        if (event.type !== 'nodes_cleared') {
            return;
        }
    }
    
    lastBroadcastTime = now;
    
    console.log('[Events] Broadcasting data change:', event.type);
    dataChangeEvents.emit('dataChange', event);
}
