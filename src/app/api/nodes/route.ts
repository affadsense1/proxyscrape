import { NextResponse } from 'next/server';
import { loadNodes, saveNodes } from '@/lib/store';
import { broadcastDataChange } from '@/lib/events';

export async function GET() {
    try {
        const data = await loadNodes();
        
        if (!data) {
            return NextResponse.json({
                totalNodes: 0,
                aliveNodes: 0,
                nodes: [],
                timestamp: new Date().toISOString()
            });
        }
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('Load nodes error:', error);
        return NextResponse.json({ error: 'Failed to load nodes' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        console.log('[API] Clearing proxy pool...');
        
        // 保存空节点列表
        const emptyResult = {
            totalNodes: 0,
            aliveNodes: 0,
            nodes: [],
            timestamp: new Date().toISOString(),
        };

        await saveNodes(emptyResult);
        
        console.log('[API] Proxy pool cleared successfully');
        
        // 广播数据变更事件
        broadcastDataChange({
            type: 'nodes_cleared',
            timestamp: new Date().toISOString(),
            data: {
                totalNodes: 0,
                aliveNodes: 0,
                operation: 'clear_all'
            }
        });

        return NextResponse.json({ success: true, message: '代理池已清空' });
    } catch (error) {
        console.error('Clear nodes error:', error);
        return NextResponse.json({ error: 'Failed to clear nodes' }, { status: 500 });
    }
}
