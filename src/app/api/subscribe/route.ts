import { NextResponse } from 'next/server';
import { loadNodes, loadConfig } from '@/lib/store';
import yaml from 'yaml';

// 将节点 URL 转换为 Clash 代理对象
function urlToClashProxy(url: string, label: string): any {
    try {
        if (url.startsWith('ss://')) {
            let raw = url.substring(5);
            const hashIndex = raw.indexOf('#');
            if (hashIndex !== -1) raw = raw.substring(0, hashIndex);

            let userInfo = raw;
            if (!raw.includes('@')) {
                userInfo = Buffer.from(raw, 'base64').toString('utf-8');
            }

            const parts = userInfo.match(/^(.*?):(.*?)@(.*):(\d+)$/);
            if (parts) {
                return {
                    name: label,
                    type: 'ss',
                    server: parts[3],
                    port: parseInt(parts[4]),
                    cipher: parts[1],
                    password: parts[2],
                };
            }
        }

        if (url.startsWith('vmess://')) {
            const raw = url.substring(8);
            const jsonStr = Buffer.from(raw, 'base64').toString('utf-8');
            const config = JSON.parse(jsonStr);

            const proxy: any = {
                name: label,
                type: 'vmess',
                server: config.add,
                port: parseInt(config.port),
                uuid: config.id,
                alterId: parseInt(config.aid || '0'),
                cipher: 'auto',
            };

            if (config.tls === 'tls') {
                proxy.tls = true;
            }
            if (config.host || config.sni) {
                proxy.servername = config.host || config.sni;
            }
            if (config.net) {
                proxy.network = config.net;
            }
            if (config.net === 'ws' && (config.path || config.host)) {
                proxy['ws-opts'] = {};
                if (config.path) proxy['ws-opts'].path = config.path;
                if (config.host) {
                    proxy['ws-opts'].headers = { Host: config.host };
                }
            }

            return proxy;
        }

        if (url.startsWith('trojan://')) {
            const urlObj = new URL(url);
            const proxy: any = {
                name: label,
                type: 'trojan',
                server: urlObj.hostname,
                port: parseInt(urlObj.port),
                password: urlObj.username,
            };

            const sni = urlObj.searchParams.get('sni') || urlObj.searchParams.get('peer');
            if (sni) proxy.sni = sni;

            const allowInsecure = urlObj.searchParams.get('allowInsecure');
            if (allowInsecure === '1') {
                proxy['skip-cert-verify'] = true;
            }

            const networkType = urlObj.searchParams.get('type');
            if (networkType && (networkType === 'tcp' || networkType === 'ws')) {
                proxy.network = networkType;
            }

            if (networkType === 'ws') {
                const path = urlObj.searchParams.get('path');
                const host = urlObj.searchParams.get('host');
                if (path || host) {
                    proxy['ws-opts'] = {};
                    if (path) proxy['ws-opts'].path = path;
                    if (host) {
                        proxy['ws-opts'].headers = { Host: host };
                    }
                }
            }

            return proxy;
        }

        if (url.startsWith('vless://')) {
            const urlObj = new URL(url);
            const proxy: any = {
                name: label,
                type: 'vless',
                server: urlObj.hostname,
                port: parseInt(urlObj.port),
                uuid: urlObj.username,
            };

            const security = urlObj.searchParams.get('security');
            if (security === 'tls') {
                proxy.tls = true;
            }

            const sni = urlObj.searchParams.get('sni') || urlObj.searchParams.get('peer');
            if (sni) proxy.servername = sni;

            const allowInsecure = urlObj.searchParams.get('allowInsecure');
            if (allowInsecure === '1') {
                proxy['skip-cert-verify'] = true;
            }

            const networkType = urlObj.searchParams.get('type');
            if (networkType && (networkType === 'tcp' || networkType === 'ws')) {
                proxy.network = networkType;
            }

            if (networkType === 'ws') {
                const path = urlObj.searchParams.get('path');
                const host = urlObj.searchParams.get('host');
                if (path || host) {
                    proxy['ws-opts'] = {};
                    if (path) proxy['ws-opts'].path = path;
                    if (host) {
                        proxy['ws-opts'].headers = { Host: host };
                    }
                }
            }

            const fingerprint = urlObj.searchParams.get('fp') || urlObj.searchParams.get('fingerprint');
            if (fingerprint) {
                proxy['client-fingerprint'] = fingerprint;
            }

            return proxy;
        }

    } catch (e) {
        console.error('[Subscribe] Failed to convert URL to Clash proxy:', e);
    }
    return null;
}

export async function GET(request: Request) {
    try {
        const config = await loadConfig();
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');
        const format = searchParams.get('format') || 'base64'; // 默认 base64，可选 clash

        if (config.subscribeKey && key !== config.subscribeKey) {
            console.log('[Subscribe] Key mismatch:', { expected: config.subscribeKey, received: key });
            return new NextResponse('Forbidden', { status: 403 });
        }

        const result = await loadNodes();
        
        console.log('[Subscribe] Loaded nodes:', {
            totalNodes: result?.totalNodes || 0,
            aliveNodes: result?.aliveNodes || 0,
            nodeCount: result?.nodes?.length || 0,
            format
        });

        if (!result || !result.nodes || result.nodes.length === 0) {
            console.log('[Subscribe] No nodes available, returning empty response');
            return new NextResponse('', { status: 200 });
        }

        // 过滤出存活的节点
        const aliveNodes = result.nodes.filter(node => node.latency && node.latency > 0);

        if (aliveNodes.length === 0) {
            return new NextResponse('', { status: 200 });
        }

        // 根据格式返回不同内容
        if (format === 'clash' || format === 'yaml') {
            // Clash YAML 格式
            const proxies = aliveNodes
                .map(node => urlToClashProxy(node.url, node.label))
                .filter(proxy => proxy !== null);

            // 确保代理名称唯一性
            const nameCounter = new Map<string, number>();
            proxies.forEach((proxy: any) => {
                const baseName = proxy.name;
                const count = nameCounter.get(baseName) || 0;
                nameCounter.set(baseName, count + 1);
                
                if (count > 0) {
                    proxy.name = `${baseName}-${count}`;
                }
            });

            const clashConfig = {
                port: 7890,
                'socks-port': 7891,
                'allow-lan': false,
                mode: 'Rule',
                'log-level': 'info',
                'external-controller': '127.0.0.1:9090',
                proxies: proxies,
                'proxy-groups': [
                    {
                        name: '🚀 节点选择',
                        type: 'select',
                        proxies: ['♻️ 自动选择', '🎯 全球直连', ...proxies.map((p: any) => p.name)]
                    },
                    {
                        name: '♻️ 自动选择',
                        type: 'url-test',
                        proxies: proxies.map((p: any) => p.name),
                        url: 'http://www.gstatic.com/generate_204',
                        interval: 300
                    },
                    {
                        name: '🎯 全球直连',
                        type: 'select',
                        proxies: ['DIRECT']
                    }
                ],
                rules: [
                    'DOMAIN-SUFFIX,local,DIRECT',
                    'IP-CIDR,127.0.0.0/8,DIRECT',
                    'IP-CIDR,172.16.0.0/12,DIRECT',
                    'IP-CIDR,192.168.0.0/16,DIRECT',
                    'IP-CIDR,10.0.0.0/8,DIRECT',
                    'IP-CIDR,17.0.0.0/8,DIRECT',
                    'IP-CIDR,100.64.0.0/10,DIRECT',
                    'GEOIP,CN,DIRECT',
                    'MATCH,🚀 节点选择'
                ]
            };

            const yamlContent = yaml.stringify(clashConfig);

            return new NextResponse(yamlContent, {
                headers: {
                    'Content-Type': 'text/yaml; charset=utf-8',
                    'Content-Disposition': 'inline; filename="clash.yaml"',
                    'Cache-Control': 'no-cache',
                    'Profile-Update-Interval': '24',
                    'Subscription-Userinfo': `upload=0; download=0; total=10737418240; expire=${Math.floor(Date.now() / 1000) + 30 * 24 * 3600}`
                },
            });
        } else {
            // 默认 Base64 格式（原有逻辑）
            const nodeUrls = aliveNodes.map(node => {
                let url = node.url;
                // 移除已有的 hash
                const hashIndex = url.indexOf('#');
                if (hashIndex !== -1) {
                    url = url.substring(0, hashIndex);
                }

                // 添加生成的标签作为 hash
                if (node.label) {
                    url += `#${encodeURIComponent(node.label)}`;
                }

                return url;
            });

            const content = nodeUrls.join('\n');
            const base64Content = Buffer.from(content).toString('base64');

            return new NextResponse(base64Content, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Profile-Update-Interval': '24',
                    'Subscription-Userinfo': `upload=0; download=0; total=10737418240; expire=${Math.floor(Date.now() / 1000) + 30 * 24 * 3600}`
                },
            });
        }
    } catch (error) {
        console.error('[Subscribe] Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
