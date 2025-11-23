import { NextResponse } from 'next/server';
import { scanEvents, getProgress } from '@/lib/events';

// 禁用静态生成
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // 发送初始状态
            const initialData = JSON.stringify(getProgress());
            controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

            // 监听进度更新
            const onProgress = (data: any) => {
                try {
                    const message = JSON.stringify(data);
                    controller.enqueue(encoder.encode(`data: ${message}\n\n`));
                } catch (e) {
                    console.error('Error sending progress:', e);
                }
            };

            scanEvents.on('progress', onProgress);

            // 清理函数
            request.signal.addEventListener('abort', () => {
                scanEvents.off('progress', onProgress);
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
