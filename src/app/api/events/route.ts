import { NextResponse } from 'next/server';
import { dataChangeEvents } from '@/lib/events';

// 禁用静态生成
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // 发送初始连接确认
            const initialMessage = JSON.stringify({ 
                type: 'connected', 
                timestamp: new Date().toISOString() 
            });
            controller.enqueue(encoder.encode(`data: ${initialMessage}\n\n`));

            // 监听数据变更事件
            const onDataChange = (data: any) => {
                try {
                    const message = JSON.stringify(data);
                    controller.enqueue(encoder.encode(`data: ${message}\n\n`));
                } catch (e) {
                    console.error('Error sending data change event:', e);
                }
            };

            dataChangeEvents.on('dataChange', onDataChange);

            // 清理函数
            request.signal.addEventListener('abort', () => {
                console.log('[SSE] Client disconnected from data change events');
                dataChangeEvents.off('dataChange', onDataChange);
                controller.close();
            });
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
