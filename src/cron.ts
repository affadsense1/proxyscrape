import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { loadConfig, saveConfig, saveNodes } from './lib/store';
import { scanSubscriptions } from './lib/scanner';
import { acquireLock, releaseLock, isLocked } from './lib/taskLock';

let cronJob: ScheduledTask | null = null;

async function runScheduledScan() {
    console.log('[Cron] Starting scheduled scan...');

    // 检查是否有任务正在运行
    if (isLocked()) {
        console.log('[Cron] Another task is already running, skipping this scheduled scan');
        return;
    }

    // 尝试获取任务锁
    if (!acquireLock('scan')) {
        console.log('[Cron] Failed to acquire task lock, skipping this scheduled scan');
        return;
    }

    try {
        const config = await loadConfig();

        if (config.subscriptions.length === 0) {
            console.log('[Cron] No subscriptions configured, skipping scan');
            return;
        }

        const nodes = await scanSubscriptions(config.subscriptions, config.testUrl);

        const result = {
            totalNodes: nodes.length,
            aliveNodes: nodes.length,
            nodes,
            timestamp: new Date().toISOString(),
        };

        await saveNodes(result);

        // 不需要更新 lastScan，因为 scanner.ts 中的 saveScanHistory 已经处理了
        await saveConfig(config);

        console.log(`[Cron] Scan completed: ${nodes.length} nodes found`);
    } catch (error) {
        console.error('[Cron] Scan failed:', error);
    } finally {
        // 确保释放锁
        releaseLock('scan');
    }
}

export async function startCronJob() {
    if (cronJob) {
        console.log('[Cron] Job already running');
        return;
    }

    const config = await loadConfig();
    const interval = config.scanInterval || 24;

    // 每 N 小时执行一次 (默认24小时)
    const cronExpression = `0 */${interval} * * *`;

    cronJob = cron.schedule(cronExpression, runScheduledScan);

    console.log(`[Cron] Scheduled scan every ${interval} hours`);

    // 启动时立即执行一次
    runScheduledScan();
}

export function stopCronJob() {
    if (cronJob) {
        cronJob.stop();
        cronJob = null;
        console.log('[Cron] Job stopped');
    }
}
