import { NextResponse } from 'next/server';
import { loadNodes, saveNodes } from '@/lib/store';
import { ClashTester } from '@/lib/clash';
import { acquireLock, releaseLock, getCurrentTask } from '@/lib/taskLock';

export async function POST() {
    // 尝试获取任务锁
    if (!acquireLock('health-check')) {
        const currentTask = getCurrentTask();
        return NextResponse.json({
            error: 'Task already running',
            message: `当前正在执行${currentTask.type === 'scan' ? '扫描' : '测活'}任务，请等待完成后再试`,
            currentTask: {
                type: currentTask.type,
                startTime: currentTask.startTime
            }
        }, { status: 409 });
    }

    try {
        // 加载配置以获取 testUrl
        const { loadConfig } = await import('@/lib/store');
        const config = await loadConfig();
        const testUrl = config.testUrl || 'https://www.cloudflare.com/cdn-cgi/trace';
        
        console.log('[HealthCheck] Using test URL:', testUrl);
        
        const nodesData = await loadNodes();

        if (!nodesData || !nodesData.nodes) {
            return NextResponse.json({
                success: true,
                message: '没有节点需要测活',
                before: 0,
                after: 0,
                removed: 0
            });
        }

        const currentNodes = nodesData.nodes;

        if (currentNodes.length === 0) {
            return NextResponse.json({
                success: true,
                message: '没有节点需要测活',
                before: 0,
                after: 0,
                removed: 0
            });
        }

        const beforeCount = currentNodes.length;
        const aliveNodes = [];
        const deadNodes = [];

        // 分批测试（每批50个）
        const BATCH_SIZE = 50;
        for (let i = 0; i < currentNodes.length; i += BATCH_SIZE) {
            const batch = currentNodes.slice(i, i + BATCH_SIZE);

            try {
                const tester = new ClashTester(testUrl);
                const started = await tester.start(batch.map(n => n.url));

                if (started) {
                    for (let j = 0; j < batch.length; j++) {
                        const node = batch[j];
                        try {
                            const delay = await tester.testLatency(j);
                            if (delay > 0) {
                                node.latency = delay;
                                node.lastCheck = new Date().toISOString();
                                aliveNodes.push(node);
                            } else {
                                deadNodes.push(node);
                            }
                        } catch {
                            deadNodes.push(node);
                        }
                    }

                    tester.stop();
                    await new Promise(r => setTimeout(r, 1000));
                } else {
                    // Clash 启动失败，保留所有节点
                    aliveNodes.push(...batch);
                }
            } catch (error) {
                console.error(`批次 ${i / BATCH_SIZE + 1} 测试失败:`, error);
                // 测试失败时保留节点
                aliveNodes.push(...batch);
            }
        }

        const afterCount = aliveNodes.length;
        const removedCount = beforeCount - afterCount;

        // 保存存活的节点
        const result = {
            totalNodes: aliveNodes.length,
            aliveNodes: aliveNodes.length,
            nodes: aliveNodes,
            timestamp: new Date().toISOString(),
        };

        await saveNodes(result);

        return NextResponse.json({
            success: true,
            message: `测活完成，移除 ${removedCount} 个失效节点`,
            before: beforeCount,
            after: afterCount,
            removed: removedCount,
            deadNodes: deadNodes.map(n => ({ label: n.label, host: n.host }))
        });
    } catch (error) {
        console.error('Health check error:', error);
        return NextResponse.json({
            error: 'Health check failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    } finally {
        // 无论成功或失败，都要释放锁
        releaseLock('health-check');
    }
}
