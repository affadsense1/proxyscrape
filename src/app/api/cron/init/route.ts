import { NextResponse } from 'next/server';

let cronInitialized = false;

export async function POST() {
    if (cronInitialized) {
        return NextResponse.json({ message: 'Cron already initialized' });
    }

    try {
        const { startCronJob } = await import('@/cron');
        await startCronJob();
        cronInitialized = true;
        return NextResponse.json({ message: 'Cron job started' });
    } catch (error) {
        console.error('Failed to start cron:', error);
        return NextResponse.json({ error: 'Failed to start cron' }, { status: 500 });
    }
}
