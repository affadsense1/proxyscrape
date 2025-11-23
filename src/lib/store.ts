import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface ScanHistory {
    startTime: string;
    endTime: string;
    duration: number; // 秒
    totalNodes: number;
    successNodes: number;
    failedNodes: number;
    successRate: number; // 百分比
    errors?: string[];
}

export interface Config {
    subscriptions: string[];
    scanInterval: number; // hours
    subscribeKey?: string;
    webPassword?: string;
    testUrl?: string; // 测活 URL
    customDomain?: string; // 自定义域名
    lastScan?: ScanHistory;
}

export interface NodeInfo {
    url: string;
    host: string;
    port: number;
    label: string;
    country?: string;
    countryCode?: string;
    region?: string;
    isp?: string;
    isNative?: boolean;
    latency?: number;
    lastCheck: string;
}

export interface ScanResult {
    totalNodes: number;
    aliveNodes: number;
    nodes: NodeInfo[];
    timestamp: string;
}

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export async function loadConfig(): Promise<Config> {
    await ensureDataDir();
    const configPath = path.join(DATA_DIR, 'config.json');

    try {
        const data = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        const defaultConfig: Config = {
            subscriptions: [],
            scanInterval: 24,
            subscribeKey: '',
            testUrl: 'https://www.cloudflare.com/cdn-cgi/trace',
        };
        await saveConfig(defaultConfig);
        return defaultConfig;
    }
}

export async function saveConfig(config: Config): Promise<void> {
    await ensureDataDir();
    const configPath = path.join(DATA_DIR, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function loadNodes(): Promise<ScanResult | null> {
    await ensureDataDir();
    const nodesPath = path.join(DATA_DIR, 'nodes.json');

    try {
        const data = await fs.readFile(nodesPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export async function saveNodes(result: ScanResult): Promise<void> {
    await ensureDataDir();
    const nodesPath = path.join(DATA_DIR, 'nodes.json');
    await fs.writeFile(nodesPath, JSON.stringify(result, null, 2));
}
