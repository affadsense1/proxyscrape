import { NextRequest, NextResponse } from 'next/server';
import { loadConfig, saveConfig } from '@/lib/store';

export async function GET() {
    try {
        const config = await loadConfig();
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        await saveConfig(body);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
