import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import os from 'os';
import yaml from 'yaml';
import axios from 'axios';
import { addLog } from './events';

const CORE_NAME = os.platform() === 'win32' ? 'mihomo.exe' : 'mihomo';
const CORE_PATH = path.join(process.cwd(), 'bin', CORE_NAME);
const CONFIG_PATH = path.join(process.cwd(), 'bin', 'config.yaml');

const START_PORT = 15000;
const END_PORT = 25000;

// 检测是否在 Docker 环境中运行
function isDockerEnvironment(): boolean {
    try {
        return existsSync('/.dockerenv') || existsSync('/run/.containerenv');
    } catch {
        return false;
    }
}

function getPorts() {
    // 使用随机端口，减少冲突概率
    const randomOffset = Math.floor(Math.random() * (END_PORT - START_PORT - 10));
    const basePort = START_PORT + randomOffset;
    return {
        port: basePort,
        socksPort: basePort + 1,
        apiPort: basePort + 2,
    };
}

function decodeBase64(str: string) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

// 清理配置对象，移除 undefined、空字符串、空对象等
function cleanConfig(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;

    const cleaned: any = {};
    for (const key in obj) {
        const value = obj[key];

        // 跳过 undefined
        if (value === undefined) continue;

        // 跳过空字符串（但保留数字 0）
        if (value === '' || value === null) continue;

        // 递归清理对象
        if (typeof value === 'object' && !Array.isArray(value)) {
            const cleanedValue = cleanConfig(value);
            // 只添加非空对象
            if (cleanedValue && Object.keys(cleanedValue).length > 0) {
                cleaned[key] = cleanedValue;
            }
            continue;
        }

        // 其他值直接添加
        cleaned[key] = value;
    }

    return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function nodeToProxy(nodeUrl: string, index: number): any {
    try {
        const name = `node_${index}`;

        if (nodeUrl.startsWith('ss://')) {
            let raw = nodeUrl.substring(5);
            const hashIndex = raw.indexOf('#');
            if (hashIndex !== -1) raw = raw.substring(0, hashIndex);

            let userInfo = raw;
            if (!raw.includes('@')) {
                userInfo = decodeBase64(raw);
            }

            const parts = userInfo.match(/^(.*?):(.*?)@(.*):(\d+)$/);
            if (parts) {
                const config = {
                    name,
                    type: 'ss',
                    server: parts[3],
                    port: parseInt(parts[4]),
                    cipher: parts[1],
                    password: parts[2],
                };
                return cleanConfig(config);
            }
        }

        if (nodeUrl.startsWith('vmess://')) {
            const raw = nodeUrl.substring(8);
            const jsonStr = decodeBase64(raw);
            const config = JSON.parse(jsonStr);

            const vmessConfig: any = {
                name,
                type: 'vmess',
                server: config.add,
                port: parseInt(config.port),
                uuid: config.id,
                alterId: parseInt(config.aid || '0'),
                cipher: 'auto',
                tls: config.tls === 'tls',
            };

            // 只在有值时添加可选字段
            if (config.host || config.sni) {
                vmessConfig.servername = config.host || config.sni;
            }
            if (config.net) {
                vmessConfig.network = config.net;
            }
            if (config.net === 'ws' && (config.path || config.host)) {
                vmessConfig['ws-opts'] = {};
                if (config.path) vmessConfig['ws-opts'].path = config.path;
                if (config.host) {
                    vmessConfig['ws-opts'].headers = { Host: config.host };
                }
            }

            return cleanConfig(vmessConfig);
        }

        if (nodeUrl.startsWith('trojan://')) {
            const url = new URL(nodeUrl);
            const trojanConfig: any = {
                name,
                type: 'trojan',
                server: url.hostname,
                port: parseInt(url.port),
                password: url.username,
            };

            const sni = url.searchParams.get('sni') || url.searchParams.get('peer');
            if (sni) trojanConfig.sni = sni;

            const allowInsecure = url.searchParams.get('allowInsecure');
            if (allowInsecure) {
                trojanConfig['skip-cert-verify'] = allowInsecure === '1';
            }

            const networkType = url.searchParams.get('type');
            // 只支持 tcp/ws，过滤掉 httpupgrade 等不支持的类型
            if (networkType && (networkType === 'tcp' || networkType === 'ws')) {
                trojanConfig.network = networkType;
            }

            if (networkType === 'ws') {
                const path = url.searchParams.get('path');
                const host = url.searchParams.get('host');
                if (path || host) {
                    trojanConfig['ws-opts'] = {};
                    if (path) trojanConfig['ws-opts'].path = path;
                    if (host) {
                        trojanConfig['ws-opts'].headers = { Host: host };
                    }
                }
            }

            return cleanConfig(trojanConfig);
        }

        if (nodeUrl.startsWith('vless://')) {
            const url = new URL(nodeUrl);
            const vlessConfig: any = {
                name,
                type: 'vless',
                server: url.hostname,
                port: parseInt(url.port),
                uuid: url.username,
            };

            const security = url.searchParams.get('security');
            if (security === 'tls') {
                vlessConfig.tls = true;
            }

            const sni = url.searchParams.get('sni') || url.searchParams.get('peer');
            if (sni) vlessConfig.servername = sni;

            const allowInsecure = url.searchParams.get('allowInsecure');
            if (allowInsecure) {
                vlessConfig['skip-cert-verify'] = allowInsecure === '1';
            }

            const networkType = url.searchParams.get('type');
            if (networkType && (networkType === 'tcp' || networkType === 'ws')) {
                vlessConfig.network = networkType;
            }

            if (networkType === 'ws') {
                const path = url.searchParams.get('path');
                const host = url.searchParams.get('host');
                if (path || host) {
                    vlessConfig['ws-opts'] = {};
                    if (path) vlessConfig['ws-opts'].path = path;
                    if (host) {
                        vlessConfig['ws-opts'].headers = { Host: host };
                    }
                }
            }

            const fingerprint = url.searchParams.get('fp') || url.searchParams.get('fingerprint');
            if (fingerprint) {
                vlessConfig['client-fingerprint'] = fingerprint;
            }

            return cleanConfig(vlessConfig);
        }

    } catch (e) {
        // Ignore
    }
    return null;
}

export class ClashTester {
    private process: ChildProcess | null = null;
    private apiPort: number = 0;
    private apiSecret: string = 'clash-secret';
    private testUrl: string = 'https://www.cloudflare.com/cdn-cgi/trace';

    constructor(testUrl?: string) {
        if (testUrl) {
            this.testUrl = testUrl;
        }
    }

    async start(nodes: string[]): Promise<boolean> {
        const isDocker = isDockerEnvironment();
        if (isDocker) {
            addLog('[Docker] 检测到 Docker 环境');
        }

        // 先停止可能存在的旧进程
        this.stop();
        
        // 清理可能残留的 mihomo 进程
        try {
            if (os.platform() === 'win32') {
                // Windows: 使用 taskkill
                execSync('taskkill /IM mihomo.exe /F', { 
                    stdio: 'ignore',
                    windowsHide: true 
                });
            } else {
                // Linux/macOS: 使用 pkill
                const result = execSync('pkill -9 mihomo || true', { 
                    stdio: 'pipe',
                    encoding: 'utf-8'
                });
                if (result) {
                    addLog(`[进程清理] ${result.trim()}`);
                }
            }
            
            // Docker 环境需要更长的等待时间
            const waitTime = isDocker ? 2000 : 1000;
            await new Promise(r => setTimeout(r, waitTime));
            
            // 验证进程已清理
            if (os.platform() !== 'win32') {
                try {
                    const check = execSync('pgrep mihomo || true', { 
                        stdio: 'pipe',
                        encoding: 'utf-8'
                    });
                    if (check.trim()) {
                        addLog(`⚠️ 仍有 mihomo 进程运行: ${check.trim()}`);
                    }
                } catch (e) {
                    // 没有进程，正常
                }
            }
        } catch (e: any) {
            addLog(`[进程清理] ${e.message}`);
        }
        
        // 验证二进制文件存在
        if (!existsSync(CORE_PATH)) {
            addLog(`❌ Clash Core 未找到: ${CORE_PATH}`);
            if (isDocker) {
                addLog('Docker 环境：请确保镜像构建时正确下载了 mihomo');
            } else {
                addLog('请运行: powershell -ExecutionPolicy Bypass -File download-clash.ps1');
            }
            return false;
        }

        // 验证文件权限和大小
        try {
            const stats = statSync(CORE_PATH);
            addLog(`[文件验证] 大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            
            if (os.platform() !== 'win32') {
                // 检查执行权限
                const mode = stats.mode;
                const hasExecute = (mode & 0o111) !== 0;
                
                if (!hasExecute) {
                    addLog('⚠️ 文件缺少执行权限，尝试修复...');
                    try {
                        execSync(`chmod +x "${CORE_PATH}"`, { stdio: 'pipe' });
                        addLog('✅ 已添加执行权限');
                    } catch (e: any) {
                        addLog(`❌ 无法添加执行权限: ${e.message}`);
                        if (isDocker) {
                            addLog('Docker 环境：请在 Dockerfile 中添加 chmod +x 命令');
                        }
                        return false;
                    }
                } else {
                    addLog('[文件验证] 权限正常');
                }
                
                // 测试二进制文件是否可执行
                try {
                    const testOutput = execSync(`"${CORE_PATH}" -v`, { 
                        stdio: 'pipe',
                        encoding: 'utf-8',
                        timeout: 5000
                    });
                    addLog(`[版本检测] ${testOutput.trim()}`);
                } catch (e: any) {
                    addLog(`⚠️ 二进制文件测试失败: ${e.message}`);
                    if (isDocker) {
                        addLog('可能的原因：架构不匹配或依赖缺失');
                    }
                }
            }
        } catch (e: any) {
            addLog(`⚠️ 文件验证失败: ${e.message}`);
        }

        const proxies = nodes.map((url, i) => nodeToProxy(url, i)).filter(Boolean);

        if (proxies.length === 0) {
            addLog('没有可测试的节点');
            return false;
        }

        addLog(`准备测试 ${proxies.length} 个节点...`);

        const ports = getPorts();
        this.apiPort = ports.apiPort;

        const config = {
            port: ports.port,
            'socks-port': ports.socksPort,
            'external-controller': `127.0.0.1:${this.apiPort}`,
            secret: this.apiSecret,
            mode: 'global',
            'log-level': 'warning',
            proxies,
        };

        await fs.writeFile(CONFIG_PATH, yaml.stringify(config));
        addLog(`配置文件已生成 (${proxies.length} 个代理)`);

        const binDir = path.join(process.cwd(), 'bin');
        addLog(`启动 Clash Core (API Port: ${this.apiPort}, 工作目录: ${binDir})...`);

        // 记录启动命令
        const startCommand = `${CORE_PATH} -f config.yaml`;
        addLog(`[启动命令] ${startCommand}`);

        this.process = spawn(CORE_PATH, ['-f', 'config.yaml'], {
            cwd: binDir,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
            env: { ...process.env }
        });

        let output = '';
        let errorOutput = '';
        
        if (this.process.stdout) {
            this.process.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                // 实时输出重要信息
                if (text.includes('Start initial') || text.includes('RESTful API')) {
                    addLog(`[Clash] ${text.trim()}`);
                }
            });
        }

        if (this.process.stderr) {
            this.process.stderr.on('data', (data) => {
                const err = data.toString();
                errorOutput += err;
                if (err.includes('error') || err.includes('Error') || err.includes('fatal')) {
                    addLog(`[Clash Error] ${err.trim().substring(0, 150)}`);
                }
            });
        }

        this.process.on('error', (err) => {
            addLog(`❌ 进程启动错误: ${err.message}`);
            if (isDocker) {
                addLog('Docker 环境可能的问题：');
                addLog('1. 二进制文件架构不匹配');
                addLog('2. 缺少必要的系统库');
                addLog('3. 权限不足');
            }
        });

        this.process.on('exit', (code, signal) => {
            if (code !== 0 && code !== null) {
                addLog(`❌ Clash 异常退出，代码: ${code}, 信号: ${signal}`);
                if (errorOutput) {
                    addLog(`错误输出: ${errorOutput.substring(0, 200)}`);
                }
            }
        });

        // Docker 环境需要更长的启动时间
        const maxAttempts = isDocker ? 80 : 60; // Docker: 40秒, 本地: 30秒
        const checkInterval = 500;
        
        addLog(`等待 Clash Core 启动 (最多 ${maxAttempts * checkInterval / 1000}s)...`);
        
        for (let i = 0; i < maxAttempts; i++) {
            // 检查进程是否还在运行
            if (this.process && this.process.exitCode !== null) {
                addLog(`❌ Clash 进程已退出，退出码: ${this.process.exitCode}`);
                break;
            }

            try {
                const response = await axios.get(`http://127.0.0.1:${this.apiPort}/version`, {
                    headers: { Authorization: `Bearer ${this.apiSecret}` },
                    timeout: 2000
                });
                
                addLog(`✅ Clash Core 启动成功 (版本: ${response.data?.version || 'unknown'})`);
                addLog(`API 端点: http://127.0.0.1:${this.apiPort}`);
                return true;
            } catch (e: any) {
                // 每5秒输出一次等待状态
                if (i > 0 && i % 10 === 0) {
                    const elapsed = (i * checkInterval) / 1000;
                    addLog(`⏳ 等待 Clash 启动... (${elapsed}s / ${maxAttempts * checkInterval / 1000}s)`);
                    
                    // 输出部分输出用于调试
                    if (output && i === 10) {
                        const lines = output.split('\n').filter(l => l.trim()).slice(0, 3);
                        if (lines.length > 0) {
                            addLog(`[Clash 输出] ${lines.join(' | ')}`);
                        }
                    }
                }
                await new Promise(r => setTimeout(r, checkInterval));
            }
        }

        // 启动超时，输出详细诊断信息
        addLog('❌ Clash Core 启动超时');
        addLog('=== 诊断信息 ===');
        addLog(`工作目录: ${binDir}`);
        addLog(`API 端口: ${this.apiPort}`);
        addLog(`进程状态: ${this.process ? (this.process.exitCode !== null ? '已退出' : '运行中') : '未启动'}`);
        
        if (output) {
            const lines = output.split('\n').filter(l => l.trim()).slice(0, 10);
            addLog(`标准输出 (前10行):`);
            lines.forEach(line => addLog(`  ${line}`));
        } else {
            addLog('标准输出: (无)');
        }
        
        if (errorOutput) {
            const lines = errorOutput.split('\n').filter(l => l.trim()).slice(0, 10);
            addLog(`错误输出 (前10行):`);
            lines.forEach(line => addLog(`  ${line}`));
        } else {
            addLog('错误输出: (无)');
        }
        
        if (isDocker) {
            addLog('=== Docker 环境排查建议 ===');
            addLog('1. 检查容器日志: docker logs <container_id>');
            addLog('2. 进入容器检查: docker exec -it <container_id> sh');
            addLog('3. 手动测试: /app/bin/mihomo -v');
            addLog('4. 检查权限: ls -la /app/bin/mihomo');
        }
        
        this.stop();
        return false;
    }

    async testLatency(nodeIndex: number): Promise<number> {
        if (!this.process) {
            console.error('[Clash] Process not running');
            return -1;
        }

        const name = `node_${nodeIndex}`;
        const url = `http://127.0.0.1:${this.apiPort}/proxies/${encodeURIComponent(name)}/delay?timeout=8000&url=${encodeURIComponent(this.testUrl)}`;

        try {
            // 添加额外的超时保护，确保不会永久卡住
            const timeoutPromise = new Promise<number>((resolve) => {
                setTimeout(() => {
                    if (process.env.NODE_ENV === 'development') {
                        console.error(`[Clash] Test timeout for ${name}`);
                    }
                    resolve(-1);
                }, 10000); // 10秒超时（给节点更多时间响应）
            });

            const testPromise = axios.get(url, {
                headers: { Authorization: `Bearer ${this.apiSecret}` },
                timeout: 8000 // 8秒 axios 超时
            }).then(res => {
                if (res.data && typeof res.data.delay === 'number') {
                    return res.data.delay;
                }
                console.error(`[Clash] Invalid response for ${name}:`, res.data);
                return -1;
            });

            const delay = await Promise.race([testPromise, timeoutPromise]);
            return delay;
            
        } catch (e: any) {
            // 只在开发环境记录详细错误，且仅记录前几个节点
            if (process.env.NODE_ENV === 'development' && nodeIndex < 3) {
                console.error(`[Clash] Test failed for ${name}:`, e.message);
                if (e.response) {
                    console.error(`[Clash] Response status: ${e.response.status}`);
                    console.error(`[Clash] Response data:`, e.response.data);
                }
            }
            return -1;
        }
    }

    stop() {
        if (this.process) {
            try {
                if (os.platform() === 'win32' && this.process.pid) {
                    // Windows: 使用 taskkill 强制终止进程树
                    const { execSync } = require('child_process');
                    try {
                        execSync(`taskkill /pid ${this.process.pid} /T /F`, { 
                            stdio: 'ignore',
                            windowsHide: true 
                        });
                        addLog(`Clash Core 进程已强制终止 (PID: ${this.process.pid})`);
                    } catch (e) {
                        // 进程可能已经退出
                        addLog('Clash Core 进程终止命令执行完成');
                    }
                } else if (this.process.pid) {
                    // Linux/macOS: 使用 SIGKILL 信号
                    try {
                        process.kill(this.process.pid, 'SIGKILL');
                        addLog(`Clash Core 进程已终止 (PID: ${this.process.pid})`);
                    } catch (e) {
                        // 进程可能已经退出
                        addLog('Clash Core 进程终止完成');
                    }
                } else {
                    // 降级方案
                    this.process.kill('SIGKILL');
                    addLog('Clash Core 已停止');
                }
            } catch (e: any) {
                console.error('停止 Clash Core 时出错:', e.message);
            }
            
            this.process = null;
        }
    }
}
