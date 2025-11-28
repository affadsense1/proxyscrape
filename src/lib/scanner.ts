import axios from 'axios';
import net from 'net';
import { NodeInfo } from './store';
import { updateProgress, addLog } from './events';
import { ClashTester } from './clash';

interface BatchTestResult {
    batchIndex: number;
    success: boolean;
    validatedNodes: NodeInfo[];
    error?: string;
    skipped: boolean;
}

function isBase64(str: string) {
    try {
        return Buffer.from(str, 'base64').toString('base64') === str;
    } catch (err) {
        return false;
    }
}

function decodeBase64(str: string) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

function parseNodeAddress(url: string): { host: string, port: number } | null {
    try {
        if (url.startsWith('ss://')) {
            let raw = url.substring(5);
            const hashIndex = raw.indexOf('#');
            if (hashIndex !== -1) raw = raw.substring(0, hashIndex);

            if (raw.includes('@')) {
                const parts = raw.split('@');
                const address = parts[1].split(':');
                return { host: address[0], port: parseInt(address[1]) };
            } else {
                const decoded = decodeBase64(raw);
                if (decoded.includes('@')) {
                    const parts = decoded.split('@');
                    const address = parts[1].split(':');
                    return { host: address[0], port: parseInt(address[1]) };
                }
            }
        }

        if (url.startsWith('vmess://')) {
            const raw = url.substring(8);
            const jsonStr = decodeBase64(raw);
            const config = JSON.parse(jsonStr);
            return { host: config.add, port: parseInt(config.port) };
        }

        if (url.startsWith('trojan://') || url.startsWith('vless://') || url.startsWith('socks5://')) {
            const u = new URL(url);
            return { host: u.hostname, port: parseInt(u.port) };
        }

        const match = url.match(/@([^:]+):(\d+)/);
        if (match) {
            return { host: match[1], port: parseInt(match[2]) };
        }

    } catch (e) {
        // Ignore
    }
    return null;
}

function isValidNode(url: string): boolean {
    return url.startsWith('ss://') || 
           url.startsWith('vmess://') || 
           url.startsWith('trojan://') || 
           url.startsWith('vless://') ||
           url.startsWith('socks5://');
}

// 解析 SOCKS5 格式: 国家代码|IP:端口:用户名:密码
function parseSocks5Format(line: string): string | null {
    try {
        const parts = line.trim().split('|');
        if (parts.length !== 2) return null;
        
        const countryCode = parts[0].trim();
        const proxyInfo = parts[1].split(':');
        
        if (proxyInfo.length !== 4) return null;
        
        const [ip, port, username, password] = proxyInfo;
        
        // 验证 IP 和端口
        if (!ip || !port || isNaN(parseInt(port))) return null;
        
        // 构建 SOCKS5 URL: socks5://username:password@host:port#国家代码
        const encodedUsername = encodeURIComponent(username);
        const encodedPassword = encodeURIComponent(password);
        const socks5Url = `socks5://${encodedUsername}:${encodedPassword}@${ip}:${port}#${countryCode}`;
        
        return socks5Url;
    } catch (e) {
        return null;
    }
}

function tcpPing(host: string, port: number, timeout: number = 2000): Promise<number> {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();

        socket.connect(port, host, () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve(latency);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(-1);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(-1);
        });

        socket.setTimeout(timeout);
    });
}

async function queryIpInfo(ip: string): Promise<any> {
    try {
        const response = await axios.get(`https://ipgeo-api.hf.space/${ip}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return response.data;
    } catch {
        return null;
    }
}

function getCountryEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    try {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 0x1F1E6 - 65 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    } catch {
        return '🌐';
    }
}

function generateNodeLabel(ipInfo: any, ip: string): string {
    if (!ipInfo) return `🌐|Unknown-${ip}`;

    const parts: string[] = [];
    const countryCode = ipInfo.country?.code || '';
    const countryName = ipInfo.country?.name || '';

    if (countryCode) parts.push(getCountryEmoji(countryCode));
    if (countryName) parts.push(countryName);

    const asInfo = ipInfo.as?.info || ipInfo.as?.name || '';
    if (asInfo) parts.push(asInfo);

    const regionsShort = ipInfo.regions_short || [];
    if (regionsShort.length > 0) parts.push(regionsShort.join('-'));

    const registeredCountry = ipInfo.registered_country?.code || '';
    if (registeredCountry && countryCode) {
        if (registeredCountry === countryCode) {
            parts.push('原生IP');
        } else {
            parts.push('广播IP');
        }
    }

    return parts.length > 0 ? parts.join('|') : `🌐|Unknown-${ip}`;
}

// 从 Clash YAML 格式中提取代理节点
function extractNodesFromClashYaml(content: string): string[] {
    const nodes: string[] = [];
    
    try {
        // 尝试解析为 YAML
        const yaml = require('yaml');
        const config = yaml.parse(content);
        
        if (config && config.proxies && Array.isArray(config.proxies)) {
            for (const proxy of config.proxies) {
                try {
                    // 将 Clash 代理对象转换为 URL 格式
                    const url = convertClashProxyToUrl(proxy);
                    if (url) {
                        nodes.push(url);
                    }
                } catch (e) {
                    // 忽略单个代理转换失败
                }
            }
        }
    } catch (e) {
        // 不是有效的 YAML，返回空数组
    }
    
    return nodes;
}

// 将 Clash 代理对象转换为标准 URL 格式
function convertClashProxyToUrl(proxy: any): string | null {
    if (!proxy || !proxy.type || !proxy.server || !proxy.port) {
        return null;
    }
    
    try {
        const type = proxy.type.toLowerCase();
        
        if (type === 'ss') {
            // Shadowsocks: ss://method:password@server:port
            const method = proxy.cipher || 'aes-256-gcm';
            const password = proxy.password || '';
            const auth = Buffer.from(`${method}:${password}`).toString('base64');
            return `ss://${auth}@${proxy.server}:${proxy.port}`;
        }
        
        if (type === 'vmess') {
            // VMess: vmess://base64(json)
            const vmessConfig = {
                v: '2',
                ps: proxy.name || '',
                add: proxy.server,
                port: String(proxy.port),
                id: proxy.uuid,
                aid: String(proxy.alterId || 0),
                net: proxy.network || 'tcp',
                type: 'none',
                host: proxy['ws-opts']?.headers?.Host || proxy.servername || '',
                path: proxy['ws-opts']?.path || '',
                tls: proxy.tls ? 'tls' : '',
                sni: proxy.servername || ''
            };
            const vmessJson = JSON.stringify(vmessConfig);
            const vmessBase64 = Buffer.from(vmessJson).toString('base64');
            return `vmess://${vmessBase64}`;
        }
        
        if (type === 'trojan') {
            // Trojan: trojan://password@server:port?sni=xxx&type=ws&path=xxx
            const password = proxy.password || '';
            let url = `trojan://${password}@${proxy.server}:${proxy.port}`;
            
            const params = new URLSearchParams();
            if (proxy.sni || proxy.servername) {
                params.append('sni', proxy.sni || proxy.servername);
            }
            if (proxy.network) {
                params.append('type', proxy.network);
            }
            if (proxy['ws-opts']?.path) {
                params.append('path', proxy['ws-opts'].path);
            }
            if (proxy['ws-opts']?.headers?.Host) {
                params.append('host', proxy['ws-opts'].headers.Host);
            }
            if (proxy['skip-cert-verify']) {
                params.append('allowInsecure', '1');
            }
            
            const paramStr = params.toString();
            if (paramStr) {
                url += '?' + paramStr;
            }
            
            return url;
        }
        
        if (type === 'vless') {
            // VLESS: vless://uuid@server:port?type=ws&security=tls&sni=xxx&path=xxx
            const uuid = proxy.uuid || '';
            let url = `vless://${uuid}@${proxy.server}:${proxy.port}`;
            
            const params = new URLSearchParams();
            if (proxy.network) {
                params.append('type', proxy.network);
            }
            if (proxy.tls) {
                params.append('security', 'tls');
            }
            if (proxy.sni || proxy.servername) {
                params.append('sni', proxy.sni || proxy.servername);
            }
            if (proxy['ws-opts']?.path) {
                params.append('path', proxy['ws-opts'].path);
            }
            if (proxy['ws-opts']?.headers?.Host) {
                params.append('host', proxy['ws-opts'].headers.Host);
            }
            if (proxy['skip-cert-verify']) {
                params.append('allowInsecure', '1');
            }
            
            const paramStr = params.toString();
            if (paramStr) {
                url += '?' + paramStr;
            }
            
            // 添加名称作为 fragment
            if (proxy.name) {
                url += '#' + encodeURIComponent(proxy.name);
            }
            
            return url;
        }
        
    } catch (e) {
        // 转换失败
    }
    
    return null;
}

export function extractNodes(content: string): string[] {
    const nodes: string[] = [];
    if (!content) return nodes;

    // 首先尝试解析为 Clash YAML 格式
    if (content.includes('proxies:') || content.includes('- {name:') || content.includes('- name:')) {
        const clashNodes = extractNodesFromClashYaml(content);
        if (clashNodes.length > 0) {
            return clashNodes;
        }
    }

    // 尝试 Base64 解码
    if (isBase64(content.trim())) {
        const decoded = decodeBase64(content.trim());
        if (decoded) {
            // 递归调用，因为解码后可能是 Clash YAML 或普通 URL 列表
            const decodedNodes = extractNodes(decoded);
            if (decodedNodes.length > 0) {
                return decodedNodes;
            }
        }
    }

    // 解析普通 URL 列表
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
        
        // 检查是否是 SOCKS5 格式: 国家代码|IP:端口:用户名:密码
        if (trimmed.includes('|') && trimmed.split('|').length === 2) {
            const socks5Url = parseSocks5Format(trimmed);
            if (socks5Url) {
                nodes.push(socks5Url);
                continue;
            }
        }
        
        if (isValidNode(trimmed)) {
            nodes.push(trimmed);
        } else if (isBase64(trimmed) && trimmed.length > 20) {
            const decoded = decodeBase64(trimmed);
            if (decoded) {
                const decodedLines = decoded.split('\n');
                for (const decodedLine of decodedLines) {
                    const decodedTrimmed = decodedLine.trim();
                    if (decodedTrimmed && isValidNode(decodedTrimmed)) nodes.push(decodedTrimmed);
                }
            }
        }
    }
    return nodes;
}

export async function checkNode(nodeUrl: string, labelCounter?: Map<string, number>): Promise<NodeInfo | null> {
    const parsed = parseNodeAddress(nodeUrl);
    if (!parsed) return null;

    const { host, port } = parsed;
    const latency = await tcpPing(host, port, 2000);

    if (latency === -1) return null;

    let ipInfo = null;
    let label = `${host}:${port}`;
    let country = undefined;
    let countryCode = undefined;
    let region = undefined;
    let isp = undefined;
    let isNative = undefined;

    // 如果是 SOCKS5，尝试从 URL 中提取国家代码
    if (nodeUrl.startsWith('socks5://')) {
        try {
            const hashIndex = nodeUrl.indexOf('#');
            if (hashIndex !== -1) {
                countryCode = nodeUrl.substring(hashIndex + 1);
                // 根据国家代码生成 emoji 和标签
                const emoji = getCountryEmoji(countryCode);
                label = `${emoji}|SOCKS5|${host}:${port}`;
            } else {
                label = `🧦|SOCKS5|${host}:${port}`;
            }
        } catch (e) {
            label = `🧦|SOCKS5|${host}:${port}`;
        }
    } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
        ipInfo = await queryIpInfo(host);
        if (ipInfo) {
            label = generateNodeLabel(ipInfo, host);
            country = ipInfo.country?.name;
            countryCode = ipInfo.country?.code;
            region = ipInfo.regions_short?.join('-');
            isp = ipInfo.as?.info || ipInfo.as?.name;
            const registeredCountry = ipInfo.registered_country?.code;
            if (registeredCountry && countryCode) {
                isNative = registeredCountry === countryCode;
            }
        }
    }

    // 确保标签唯一性
    if (labelCounter) {
        const baseLabel = label;
        const count = labelCounter.get(baseLabel) || 0;
        labelCounter.set(baseLabel, count + 1);
        
        if (count > 0) {
            label = `${baseLabel}-${count}`;
        }
    }

    return {
        url: nodeUrl,
        host,
        port,
        label,
        country,
        countryCode,
        region,
        isp,
        isNative,
        latency,
        lastCheck: new Date().toISOString(),
    };
}

export async function downloadSubscription(url: string): Promise<string | null> {
    try {
        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        return response.data;
    } catch {
        return null;
    }
}

// 增量保存节点（带重试和事件广播）
async function saveNodesIncremental(nodes: NodeInfo[], retries = 3) {
    const { saveNodes } = await import('./store');
    const { broadcastDataChange } = await import('./events');
    
    const result = {
        totalNodes: nodes.length,
        aliveNodes: nodes.length,
        nodes,
        timestamp: new Date().toISOString(),
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await saveNodes(result);
            addLog(`✅ 增量保存成功: ${nodes.length} 个节点`);
            
            // 广播数据变更事件
            broadcastDataChange({
                type: 'nodes_updated',
                timestamp: new Date().toISOString(),
                data: {
                    totalNodes: nodes.length,
                    aliveNodes: nodes.length,
                    operation: 'incremental_save'
                }
            });
            
            return; // 保存成功，退出
        } catch (e) {
            console.error(`增量保存节点失败 (尝试 ${attempt}/${retries}):`, e);
            addLog(`⚠️ 增量保存失败 (尝试 ${attempt}/${retries})`);
            
            if (attempt < retries) {
                // 等待1秒后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                addLog(`❌ 增量保存最终失败，已重试 ${retries} 次`);
            }
        }
    }
}

// 批次测试封装函数
async function testBatchWithClash(
    batch: NodeInfo[],
    batchIndex: number,
    totalBatches: number,
    globalProcessed: number,
    totalNodes: number,
    currentSuccessCount: number,
    errors: string[]
): Promise<BatchTestResult> {
    const result: BatchTestResult = {
        batchIndex,
        success: false,
        validatedNodes: [],
        skipped: false
    };

    try {
        addLog(`第 ${batchIndex + 1}/${totalBatches} 批：测试 ${batch.length} 个节点...`);
        
        const tester = new ClashTester();
        const clashStarted = await tester.start(batch.map(n => n.url));

        if (!clashStarted) {
            result.error = 'Clash Core 启动失败';
            result.skipped = true;
            addLog(`⚠️ 第 ${batchIndex + 1} 批 Clash Core 启动失败，跳过此批次`);
            return result;
        }

        // 测试每个节点
        for (let i = 0; i < batch.length; i++) {
            const node = batch[i];
            const currentProcessed = globalProcessed + i + 1;
            
            updateProgress({
                total: totalNodes,
                current: currentProcessed,
                currentNode: `[${batchIndex + 1}/${totalBatches}] ${node.label}`,
                successCount: currentSuccessCount + result.validatedNodes.length,
                failedCount: currentProcessed - (currentSuccessCount + result.validatedNodes.length)
            });
            
            try {
                const delay = await tester.testLatency(i);
                if (delay > 0) {
                    node.latency = delay;
                    result.validatedNodes.push(node);
                    addLog(`[可用] ${node.label} (${delay}ms)`);
                }
            } catch (e: any) {
                errors.push(`Clash测试异常 ${node.label}: ${e.message}`);
            }
        }

        tester.stop();
        await new Promise(r => setTimeout(r, 1000));

        result.success = true;
        addLog(`✅ 第 ${batchIndex + 1} 批完成: ${result.validatedNodes.length}/${batch.length} 个节点可用`);
        
    } catch (e: any) {
        result.error = e.message;
        result.skipped = true;
        addLog(`❌ 第 ${batchIndex + 1} 批异常: ${e.message}，跳过此批次`);
    }

    return result;
}

export async function scanSubscriptions(subscriptions: string[], testUrl?: string): Promise<NodeInfo[]> {
    const startTime = new Date();
    const errors: string[] = [];
    const labelCounter = new Map<string, number>(); // 用于跟踪标签计数

    updateProgress({ status: 'scanning', total: 0, current: 0, logs: [], successCount: 0, failedCount: 0 });
    addLog('开始加载订阅源...');
    
    if (testUrl) {
        addLog(`使用测活 URL: ${testUrl}`);
    }

    try {
        const allNodes: string[] = [];

        for (const url of subscriptions) {
            addLog(`正在下载: ${url}`);
            try {
                const content = await downloadSubscription(url);
                if (content) {
                    const nodes = extractNodes(content);
                    addLog(`从 ${url} 解析到 ${nodes.length} 个节点`);
                    allNodes.push(...nodes);
                } else {
                    const err = `下载失败: ${url}`;
                    addLog(err);
                    errors.push(err);
                }
            } catch (e: any) {
                const err = `下载异常 ${url}: ${e.message}`;
                addLog(err);
                errors.push(err);
            }
        }

        const uniqueNodes = Array.from(new Set(allNodes));
        addLog(`去重后共 ${uniqueNodes.length} 个节点，开始 TCP 初筛...`);

        updateProgress({ total: uniqueNodes.length, current: 0, successCount: 0, failedCount: 0 });

        const tcpAliveNodes: NodeInfo[] = [];
        const concurrency = 50;
        let checkedCount = 0;

        for (let i = 0; i < uniqueNodes.length; i += concurrency) {
            const batch = uniqueNodes.slice(i, i + concurrency);
            updateProgress({ currentNode: `TCP Check: ${batch[0]}` });

            const results = await Promise.all(batch.map(async (nodeUrl) => {
                try {
                    const result = await checkNode(nodeUrl, labelCounter);
                    checkedCount++;

                    if (checkedCount % 10 === 0) {
                        updateProgress({
                            current: checkedCount,
                            successCount: tcpAliveNodes.length,
                            failedCount: checkedCount - tcpAliveNodes.length
                        });
                    }

                    return result;
                } catch (e: any) {
                    checkedCount++;
                    errors.push(`TCP检测异常 ${nodeUrl}: ${e.message}`);
                    return null;
                }
            }));

            for (const result of results) {
                if (result) tcpAliveNodes.push(result);
            }
        }

        updateProgress({
            current: uniqueNodes.length,
            successCount: tcpAliveNodes.length,
            failedCount: uniqueNodes.length - tcpAliveNodes.length
        });

        addLog(`TCP 初筛完成，存活: ${tcpAliveNodes.length}，准备 Clash 真机复核...`);

        if (tcpAliveNodes.length === 0) {
            updateProgress({ status: 'completed', current: uniqueNodes.length });
            setTimeout(() => updateProgress({ status: 'idle' }), 3000);

            await saveScanHistory(startTime, new Date(), uniqueNodes.length, 0, uniqueNodes.length, errors);
            return [];
        }

        // Clash 分批测试 + 增量保存 + 容错机制
        const BATCH_SIZE = 50;
        const batches = [];
        for (let i = 0; i < tcpAliveNodes.length; i += BATCH_SIZE) {
            batches.push(tcpAliveNodes.slice(i, i + BATCH_SIZE));
        }

        addLog(`开始 Clash 分批测试，共 ${batches.length} 批...`);
        let finalNodes: NodeInfo[] = [];
        let globalProcessed = 0;
        let successfulBatches = 0;
        let skippedBatches = 0;
        const skippedBatchNodes: NodeInfo[] = []; // 保存跳过批次的 TCP 结果

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            addLog(`第 ${batchIndex + 1}/${batches.length} 批：测试 ${batch.length} 个节点...`);

            try {
                const tester = new ClashTester(testUrl);
                const clashStarted = await tester.start(batch.map(n => n.url));

                if (clashStarted) {
                    successfulBatches++;
                    
                    // 添加开始测试的日志
                    addLog(`开始测试批次中的 ${batch.length} 个节点...`);
                    
                    for (let i = 0; i < batch.length; i++) {
                        const node = batch[i];
                        globalProcessed++;

                        // 每10个节点输出一次进度
                        if (i % 10 === 0) {
                            addLog(`批次进度: ${i}/${batch.length}`);
                        }

                        updateProgress({
                            total: tcpAliveNodes.length,
                            current: globalProcessed,
                            currentNode: `[${batchIndex + 1}/${batches.length}] ${node.label}`,
                            successCount: finalNodes.length,
                            failedCount: globalProcessed - finalNodes.length
                        });

                        try {
                            const delay = await tester.testLatency(i);
                            if (delay > 0) {
                                node.latency = delay;
                                finalNodes.push(node);
                                addLog(`[可用] ${node.label} (${delay}ms)`);
                            }
                        } catch (e: any) {
                            errors.push(`Clash测试异常 ${node.label}: ${e.message}`);
                        }
                    }
                    
                    addLog(`批次测试循环完成，共测试 ${batch.length} 个节点`);


                    tester.stop();
                    await new Promise(r => setTimeout(r, 1000));

                    // 每批完成后立即保存
                    if (finalNodes.length > 0) {
                        await saveNodesIncremental(finalNodes);
                    }
                    
                    addLog(`✅ 第 ${batchIndex + 1} 批完成: ${finalNodes.length} 个节点可用`);
                } else {
                    // Clash 启动失败，跳过此批次
                    skippedBatches++;
                    skippedBatchNodes.push(...batch);
                    globalProcessed += batch.length;
                    
                    const err = `第 ${batchIndex + 1} 批 Clash Core 启动失败，跳过`;
                    addLog(`⚠️ ${err}`);
                    errors.push(err);
                    
                    updateProgress({
                        current: globalProcessed,
                        failedCount: globalProcessed - finalNodes.length
                    });
                }
            } catch (e: any) {
                // 批次异常，跳过此批次
                skippedBatches++;
                skippedBatchNodes.push(...batch);
                globalProcessed += batch.length;
                
                const err = `第 ${batchIndex + 1} 批异常: ${e.message}`;
                addLog(`❌ ${err}，跳过此批次`);
                errors.push(err);
                
                updateProgress({
                    current: globalProcessed,
                    failedCount: globalProcessed - finalNodes.length
                });

                // 异常时也保存已成功的节点
                if (finalNodes.length > 0) {
                    await saveNodesIncremental(finalNodes);
                }
            }
        }

        // 输出扫描摘要
        addLog('');
        addLog('========== 扫描摘要 ==========');
        addLog(`总批次: ${batches.length}`);
        addLog(`成功批次: ${successfulBatches}`);
        addLog(`跳过批次: ${skippedBatches}`);
        addLog(`Clash 验证通过: ${finalNodes.length} 个节点`);
        
        // 如果所有批次都失败，降级使用 TCP 结果
        if (finalNodes.length === 0 && skippedBatchNodes.length > 0) {
            addLog('⚠️ 所有 Clash 批次均失败，降级使用 TCP 初筛结果');
            finalNodes = tcpAliveNodes;
            await saveNodesIncremental(finalNodes);
        } else if (skippedBatchNodes.length > 0) {
            // 部分批次失败，将跳过批次的 TCP 结果也加入最终结果
            addLog(`📋 将 ${skippedBatchNodes.length} 个跳过批次的 TCP 结果加入最终列表`);
            finalNodes.push(...skippedBatchNodes);
            await saveNodesIncremental(finalNodes);
        }
        
        addLog(`最终节点总数: ${finalNodes.length}`);
        addLog('==============================');

        addLog(`扫描完成，最终存活: ${finalNodes.length}`);
        updateProgress({
            status: 'completed',
            current: uniqueNodes.length,
            successCount: finalNodes.length,
            failedCount: tcpAliveNodes.length - finalNodes.length
        });

        setTimeout(() => {
            updateProgress({ status: 'idle' });
        }, 3000);

        await saveScanHistory(startTime, new Date(), uniqueNodes.length, finalNodes.length, uniqueNodes.length - finalNodes.length, errors);

        return finalNodes;
    } catch (e: any) {
        const err = `扫描致命错误: ${e.message}`;
        addLog(err);
        errors.push(err);
        updateProgress({ status: 'error' });

        await saveScanHistory(startTime, new Date(), 0, 0, 0, errors);
        throw e;
    }
}

async function saveScanHistory(
    startTime: Date,
    endTime: Date,
    totalNodes: number,
    successNodes: number,
    failedNodes: number,
    errors: string[]
) {
    try {
        const { loadConfig, saveConfig } = await import('./store');
        const config = await loadConfig();

        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        const successRate = totalNodes > 0 ? (successNodes / totalNodes) * 100 : 0;

        config.lastScan = {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration,
            totalNodes,
            successNodes,
            failedNodes,
            successRate: parseFloat(successRate.toFixed(2)),
            errors: errors.length > 0 ? errors : undefined
        };

        await saveConfig(config);
        addLog(`历史已保存: 成功率 ${successRate.toFixed(1)}%, 耗时 ${duration}s`);
    } catch (e) {
        console.error('保存扫描历史失败:', e);
    }
}
