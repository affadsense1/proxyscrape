import { NextResponse } from 'next/server';
import { loadConfig, saveConfig, saveNodes } from '@/lib/store';
import { scanSubscriptions } from '@/lib/scanner';
import { acquireLock, releaseLock, getCurrentTask } from '@/lib/taskLock';

export async function POST() {
    // 尝试获取任务锁
    if (!acquireLock('scan')) {
        const currentTask = getCurrentTask();
        return NextResponse.json({
            error: 'Task already running',
            message: `当前正在执行${currentTask.type === 'scan' ? '扫描' : '测活'}任务，请等待完成后再试`,
            currentTask: {
                type: currentTask.type,
                startTime: currentTask.startTime
            }
        }, { status: 409 }); // 409 Conflict
    }

    try {
        const config = await loadConfig();

        if (config.subscriptions.length === 0) {
            releaseLock('scan');
            return NextResponse.json({ error: 'No subscriptions configured' }, { status: 400 });
        }

        // 执行扫描
        const nodes = await scanSubscriptions(config.subscriptions, config.testUrl);

        const result = {
            totalNodes: nodes.length,
            aliveNodes: nodes.length,
            nodes,
            timestamp: new Date().toISOString(),
        };

        // 保存结果
        await saveNodes(result);

        // 不需要更新 lastScan，因为 scanner.ts 中的 saveScanHistory 已经处理了
        await saveConfig(config);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Scan error:', error);
        return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
    } finally {
        // 无论成功或失败，都要释放锁
        releaseLock('scan');
    }
}
