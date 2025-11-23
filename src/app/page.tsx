'use client';

import { Cloud, Droplets, Activity, Globe, Settings, Users, Zap, Copy, Check, RefreshCw, Download, Upload, Terminal, Key, Lock, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useRealtimeNodes } from '@/hooks/useRealtimeNodes';

interface Stats {
  activeNodes: number;
  dailyRequests: number;
  healthScore: number;
}

type Tab = 'dashboard' | 'proxypool' | 'crawler' | 'health';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats>({
    activeNodes: 0,
    dailyRequests: 0,
    healthScore: 0,
  });
  // 使用实时同步 Hook
  const { nodes: realtimeNodes, loading: realtimeLoading, refresh: refreshNodes } = useRealtimeNodes();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 同步实时节点数据到本地状态
  useEffect(() => {
    setNodes(realtimeNodes);
    setLoading(realtimeLoading);
  }, [realtimeNodes, realtimeLoading]);

  const [showSettings, setShowSettings] = useState(false);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [newSub, setNewSub] = useState('');
  const [subscribeUrl, setSubscribeUrl] = useState('');
  const [subscribeUrlClash, setSubscribeUrlClash] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedClash, setCopiedClash] = useState(false);

  // 新增状态
  const [subscribeKey, setSubscribeKey] = useState('');
  const [webPassword, setWebPassword] = useState('affadsense'); // 默认密码
  const [testUrl, setTestUrl] = useState('https://www.cloudflare.com/cdn-cgi/trace');
  const [customTestUrl, setCustomTestUrl] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [importContent, setImportContent] = useState('');
  const [scanProgress, setScanProgress] = useState<any>(null);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [checkingLogin, setCheckingLogin] = useState(true);

  // 测活状态
  const [healthChecking, setHealthChecking] = useState(false);

  useEffect(() => {
    // 检查本地存储的登录状态
    const savedLogin = localStorage.getItem('isLoggedIn');
    if (savedLogin === 'true') {
      setIsLoggedIn(true);
    }
    setCheckingLogin(false);

    loadData();
    // 初始化定时任务
    fetch('/api/cron/init', { method: 'POST' }).catch(console.error);
    // 加载配置
    loadConfig();
  }, []);

  // 更新订阅链接
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = customDomain || window.location.origin;
      let url = `${baseUrl}/api/subscribe`;
      let urlClash = `${baseUrl}/api/subscribe`;
      
      if (subscribeKey) {
        url += `?key=${subscribeKey}`;
        urlClash += `?key=${subscribeKey}&format=clash`;
      } else {
        urlClash += `?format=clash`;
      }
      
      setSubscribeUrl(url);
      setSubscribeUrlClash(urlClash);
    }
  }, [subscribeKey, customDomain]);

  // 监听扫描进度
  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (loading) {
      // 重置日志
      setScanLogs([]);
      setScanProgress(null);

      eventSource = new EventSource('/api/scan/progress');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setScanProgress(data);
          if (data.logs) {
            setScanLogs(data.logs);
          }

          if (data.status === 'completed') {
            loadData(); // 重新加载数据
          }
        } catch (e) {
          console.error('SSE Parse Error', e);
        }
      };

      eventSource.onerror = (e) => {
        console.error('SSE Error', e);
        eventSource?.close();
      };
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [loading]);

  // 自动滚动日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scanLogs]);

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.subscriptions) {
        setSubscriptions(data.subscriptions);
      }
      if (data.subscribeKey) {
        setSubscribeKey(data.subscribeKey);
      }
      if (data.webPassword) {
        setWebPassword(data.webPassword);
      }
      if (data.testUrl) {
        setTestUrl(data.testUrl);
      }
      if (data.customDomain) {
        setCustomDomain(data.customDomain);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveConfig(newSubs: string[], newKey?: string, newPass?: string, newTestUrl?: string, newDomain?: string) {
    try {
      const keyToSave = newKey !== undefined ? newKey : subscribeKey;
      const passToSave = newPass !== undefined ? newPass : webPassword;
      const testUrlToSave = newTestUrl !== undefined ? newTestUrl : testUrl;
      const domainToSave = newDomain !== undefined ? newDomain : customDomain;

      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptions: newSubs,
          scanInterval: 24,
          subscribeKey: keyToSave,
          webPassword: passToSave,
          testUrl: testUrlToSave,
          customDomain: domainToSave
        }),
      });

      setSubscriptions(newSubs);
      if (newKey !== undefined) setSubscribeKey(newKey);
      if (newPass !== undefined) setWebPassword(newPass);
      if (newTestUrl !== undefined) setTestUrl(newTestUrl);
      if (newDomain !== undefined) setCustomDomain(newDomain);
    } catch (e) {
      console.error(e);
      alert('保存失败');
    }
  }

  function handleLogin() {
    if (passwordInput === webPassword) {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
    } else {
      alert('密码错误');
      setPasswordInput('');
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    setPasswordInput('');
  }

  function addSubscription() {
    if (!newSub) return;
    const newSubs = [...subscriptions, newSub];
    saveConfig(newSubs);
    setNewSub('');
  }

  function removeSubscription(index: number) {
    const newSubs = subscriptions.filter((_, i) => i !== index);
    saveConfig(newSubs);
  }

  function handleImport() {
    if (!importContent) return;
    const lines = importContent.split('\n').map(l => l.trim()).filter(l => l);
    const newSubs = Array.from(new Set([...subscriptions, ...lines]));
    saveConfig(newSubs);
    setImportContent('');
    alert(`成功导入 ${lines.length} 个订阅源`);
  }

  function handleExport() {
    const content = subscriptions.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscriptions.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function saveSecuritySettings() {
    const finalTestUrl = testUrl === 'custom' ? customTestUrl : testUrl;
    saveConfig(subscriptions, subscribeKey, webPassword, finalTestUrl, customDomain);
    alert('设置已保存');
  }

  async function loadData() {
    try {
      // 使用实时同步的 refresh 方法
      await refreshNodes();
      
      // 更新统计数据
      const response = await fetch('/api/nodes');
      const data = await response.json();
      
      setStats({
        activeNodes: data.aliveNodes || 0,
        dailyRequests: Math.floor(Math.random() * 1000) + 500, // 模拟数据
        healthScore: data.aliveNodes > 0 ? Math.min(100, Math.floor((data.aliveNodes / data.totalNodes) * 100)) : 100,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      if (!scanProgress) setLoading(false);
    }
  }

  async function handleScan() {
    setLoading(true);
    setActiveTab('crawler'); // 自动切换到爬虫页面看日志
    try {
      const response = await fetch('/api/scan', { method: 'POST' });
      const data = await response.json();

      if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      alert('扫描失败');
    } finally {
      setLoading(false);
    }
  }

  function copySubscribeUrl() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(subscribeUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch((err) => {
        console.error('复制失败:', err);
        // 降级方案：使用传统方法
        fallbackCopyTextToClipboard(subscribeUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // 浏览器不支持 clipboard API，使用降级方案
      fallbackCopyTextToClipboard(subscribeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function copySubscribeUrlClash() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(subscribeUrlClash).then(() => {
        setCopiedClash(true);
        setTimeout(() => setCopiedClash(false), 2000);
      }).catch((err) => {
        console.error('复制失败:', err);
        fallbackCopyTextToClipboard(subscribeUrlClash);
        setCopiedClash(true);
        setTimeout(() => setCopiedClash(false), 2000);
      });
    } else {
      fallbackCopyTextToClipboard(subscribeUrlClash);
      setCopiedClash(true);
      setTimeout(() => setCopiedClash(false), 2000);
    }
  }

  // 降级复制方案（兼容旧浏览器）
  function fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('降级复制也失败:', err);
    }
    document.body.removeChild(textArea);
  }

  async function handleClearNodes() {
    // 保存当前状态用于回滚
    const previousNodes = [...nodes];
    const previousStats = { ...stats };
    
    try {
      // 乐观更新：立即更新 UI
      setNodes([]);
      setStats({ activeNodes: 0, dailyRequests: 0, healthScore: 0 });
      
      const response = await fetch('/api/nodes', { method: 'DELETE' });
      
      if (response.ok) {
        alert('✅ 代理池已清空');
        // SSE 会自动同步数据，无需手动刷新
      } else {
        // 服务器返回错误，回滚状态
        setNodes(previousNodes);
        setStats(previousStats);
        alert('❌ 清空失败');
      }
    } catch (error) {
      console.error('Clear nodes failed:', error);
      // 发生异常，回滚状态
      setNodes(previousNodes);
      setStats(previousStats);
      alert('❌ 清空失败');
    }
  }

  async function handleClearSubscriptions() {
    try {
      await saveConfig([]);
      alert('✅ 订阅源已清空');
    } catch (error) {
      console.error('Clear subscriptions failed:', error);
      alert('❌ 清空失败');
    }
  }

  async function handleHealthCheck() {
    if (loading || healthChecking) {
      alert('⚠️ 正在执行任务，请稍候');
      return;
    }

    if (!confirm('🔍 确定要对所有节点进行测活吗？\n\n将使用 Clash Core 真机测试，自动移除失效节点。\n此过程可能需要几分钟。')) {
      return;
    }

    setHealthChecking(true);
    try {
      const response = await fetch('/api/health-check', { method: 'POST' });
      const result = await response.json();

      if (response.status === 409) {
        // 任务冲突
        alert(`⚠️ ${result.message}`);
        return;
      }

      if (result.success) {
        // 刷新节点列表
        await loadData();

        const message = `✅ 测活完成！\n\n` +
          `测试前: ${result.before} 个节点\n` +
          `存活: ${result.after} 个节点\n` +
          `移除: ${result.removed} 个失效节点`;

        alert(message);
      } else {
        alert(`❌ 测活失败: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      alert('❌ 测活失败，请查看控制台');
    } finally {
      setHealthChecking(false);
    }
  }

  if (checkingLogin) {
    return null; // 或者显示加载动画
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass p-8 rounded-3xl w-full max-w-md text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-white/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock className="w-10 h-10 text-purple-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">访问受限</h2>
          <p className="text-gray-500 mb-8">请输入访问密码以继续</p>

          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            placeholder="输入密码..."
            className="w-full px-6 py-4 rounded-xl bg-white/50 border border-gray-200 mb-6 focus:outline-none focus:ring-2 focus:ring-purple-400 text-center text-lg tracking-widest"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />

          <button
            onClick={handleLogin}
            className="w-full py-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-medium text-lg shadow-lg hover:shadow-purple-500/30"
          >
            解锁进入
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* 侧边栏 */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 p-6 glass-strong fixed h-full z-10"
      >
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center cloud-float">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold gradient-text">CloudProxy</h1>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'dashboard', icon: Activity, label: 'Dashboard' },
            { id: 'proxypool', icon: Users, label: '代理池' },
            { id: 'crawler', icon: Zap, label: '爬虫' },
            { id: 'health', icon: Globe, label: '健康检查' },
          ].map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                ? 'bg-white/40 text-purple-700 font-medium shadow-sm'
                : 'text-gray-600 hover:bg-white/20'
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </motion.button>
          ))}

          <div className="pt-4 border-t border-gray-200/30 mt-4 space-y-2">
            <motion.button
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-white/20 transition-all"
            >
              <Settings className="w-5 h-5" />
              <span>设置</span>
            </motion.button>

            <motion.button
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>退出登录</span>
            </motion.button>
          </div>
        </nav>
      </motion.aside>

      {/* 主内容区 */}
      <main className="flex-1 p-8 ml-64">
        {/* 顶部栏 */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 capitalize">
            {activeTab === 'dashboard' ? 'Dashboard' :
              activeTab === 'proxypool' ? '代理池管理' :
                activeTab === 'crawler' ? '爬虫状态' : '健康检查'}
          </h2>

          <div className="flex items-center gap-4">
            <button
              onClick={handleScan}
              disabled={loading}
              className="px-6 py-2 rounded-full glass hover-lift font-medium text-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? '扫描中...' : '立即扫描'}
            </button>
            <div className="w-10 h-10 rounded-full glass hover-lift flex items-center justify-center">
              <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* 统计卡片 */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <StatCard
                  title="Active Nodes"
                  value={stats.activeNodes}
                  icon={<Droplets className="w-6 h-6 text-blue-500 drop-bounce" />}
                  delay={0}
                />
                <StatCard
                  title="Daily Requests"
                  value={`${(stats.dailyRequests / 1000).toFixed(1)}K`}
                  subtitle="APS"
                  maxValue={200}
                  currentValue={stats.dailyRequests / 5}
                  icon={<Activity className="w-6 h-6 text-purple-500 gentle-float" />}
                  delay={0.1}
                />
                <StatCard
                  title="Health Score"
                  value={stats.healthScore}
                  maxValue={100}
                  currentValue={stats.healthScore}
                  icon={<Globe className="w-6 h-6 text-green-500 cloud-float" />}
                  delay={0.2}
                />
              </div>

              {/* 世界地图 */}
              <div className="glass rounded-3xl p-8 hover-lift">
                <WorldMap nodes={nodes} />
              </div>
            </motion.div>
          )}

          {activeTab === 'proxypool' && (
            <motion.div
              key="proxypool"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* 订阅链接卡片 */}
              <div className="glass rounded-3xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">在线订阅地址</h3>
                
                {/* Base64 格式 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-600">通用格式 (Base64)</span>
                    <span className="text-xs text-gray-400">适用于 V2Ray、Shadowrocket 等</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-white/50 px-4 py-3 rounded-xl text-gray-600 font-mono text-sm truncate border border-gray-200">
                      {subscribeUrl}
                    </div>
                    <button
                      onClick={copySubscribeUrl}
                      className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? '已复制' : '复制'}
                    </button>
                  </div>
                </div>

                {/* Clash 格式 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-600">Clash 格式 (YAML)</span>
                    <span className="text-xs text-gray-400">专用于 Clash / Clash for Windows</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-white/50 px-4 py-3 rounded-xl text-gray-600 font-mono text-sm truncate border border-gray-200">
                      {subscribeUrlClash}
                    </div>
                    <button
                      onClick={copySubscribeUrlClash}
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      {copiedClash ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedClash ? '已复制' : '复制'}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  * 订阅链接包含所有当前可用的节点，自动过滤失效节点。
                  {subscribeKey && <span className="text-purple-600 ml-2">(已启用 Key 保护)</span>}
                </p>
              </div>

              {/* 节点列表 */}
              <div className="glass rounded-3xl p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">节点列表 ({nodes.length})</h3>
                  <div className="flex items-center gap-2">
                    {nodes.length > 0 && (
                      <>
                        <button
                          onClick={handleHealthCheck}
                          disabled={healthChecking}
                          className={`px-4 py-2 ${healthChecking ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition-colors text-sm flex items-center gap-2`}
                        >
                          {healthChecking ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              测活中...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              测活
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('⚠️ 确定要清空所有节点吗?\n\n此操作不可恢复！')) {
                              handleClearNodes();
                            }
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          清空代理池
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-500 text-sm border-b border-gray-200/50">
                        <th className="pb-3 pl-4">标签</th>
                        <th className="pb-3">地址</th>
                        <th className="pb-3">延迟</th>
                        <th className="pb-3">地区</th>
                        <th className="pb-3">状态</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {nodes.map((node, i) => (
                        <tr key={i} className="hover:bg-white/30 transition-colors border-b border-gray-100/30 last:border-0">
                          <td className="py-3 pl-4 font-medium text-gray-700">{node.label.split('|')[0]} {node.label.split('|')[1]}</td>
                          <td className="py-3 text-gray-500 font-mono">{node.host}:{node.port}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${node.latency < 200 ? 'bg-green-100 text-green-700' :
                              node.latency < 500 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                              {node.latency}ms
                            </span>
                          </td>
                          <td className="py-3 text-gray-600">{node.country || 'Unknown'}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-green-600">Active</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {nodes.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400">
                            暂无节点数据，请先添加订阅并扫描
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'crawler' && (
            <motion.div
              key="crawler"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* 进度条 */}
              {loading && scanProgress && (
                <div className="glass rounded-3xl p-8">
                  <div className="flex justify-between mb-2 text-sm text-gray-600">
                    <span>扫描进度</span>
                    <span>{scanProgress.current} / {scanProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <motion.div
                      className="bg-purple-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  {scanProgress.currentNode && (
                    <p className="text-xs text-gray-500 mt-2 truncate" title={scanProgress.currentNode}>
                      正在检测: {scanProgress.currentNode}
                    </p>
                  )}

                  {/* 统计信息 */}
                  {(scanProgress.successCount !== undefined || scanProgress.failedCount !== undefined) && (
                    <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600">
                          成功: <span className="font-semibold text-green-600">{scanProgress.successCount || 0}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-gray-600">
                          失败: <span className="font-semibold text-red-600">{scanProgress.failedCount || 0}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-gray-600">
                          总数: <span className="font-semibold text-gray-800">{scanProgress.total || 0}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">
                          成功率: <span className="font-semibold text-purple-600">
                            {scanProgress.successCount && scanProgress.successCount > 0
                              ? ((scanProgress.successCount / (scanProgress.successCount + (scanProgress.failedCount || 0))) * 100).toFixed(1)
                              : '0.0'}%
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 日志终端 */}
              <div className="glass rounded-3xl p-6 min-h-[400px] flex flex-col bg-black/80 text-green-400 font-mono text-sm shadow-inner">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
                  <Terminal className="w-4 h-4" />
                  <span>System Logs</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 max-h-[500px] pr-2 custom-scrollbar">
                  {scanLogs.length === 0 ? (
                    <div className="text-gray-500 italic">等待任务启动...</div>
                  ) : (
                    scanLogs.map((log, i) => (
                      <div key={i} className="break-all hover:bg-white/5 px-2 py-0.5 rounded">
                        {log}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'health' && (
            <motion.div
              key="health"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-3xl p-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">系统健康度</h3>
                  <p className="text-gray-500">整体运行状态良好</p>
                </div>
                <div className="ml-auto text-4xl font-bold text-green-500">{stats.healthScore}%</div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/40 rounded-2xl p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">节点可用率</h4>
                  <div className="text-2xl font-bold text-gray-800">
                    {nodes.length > 0 ? ((stats.activeNodes / nodes.length) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${nodes.length > 0 ? (stats.activeNodes / nodes.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="bg-white/40 rounded-2xl p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">平均延迟</h4>
                  <div className="text-2xl font-bold text-gray-800">
                    {nodes.length > 0 ? Math.floor(nodes.reduce((acc, n) => acc + (n.latency || 0), 0) / nodes.length) : 0} ms
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div className="bg-purple-500 h-2 rounded-full w-2/3"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 设置模态框 */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-6 text-gray-800">设置</h2>

              {/* 安全设置 */}
              <div className="mb-8 p-4 bg-white/40 rounded-2xl border border-purple-100">
                <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                  安全设置
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">网页访问密码</label>
                    <input
                      type="text"
                      value={webPassword}
                      onChange={(e) => setWebPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">订阅访问 Key (留空则公开)</label>
                    <input
                      type="text"
                      value={subscribeKey}
                      onChange={(e) => setSubscribeKey(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">自定义域名 (用于订阅链接)</label>
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="https://your-domain.com (留空使用当前域名)"
                      className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      如果使用反向代理，请填写完整的域名（包含 https://）
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">节点测活 URL</label>
                    <select
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 mb-2"
                    >
                      <option value="https://www.cloudflare.com/cdn-cgi/trace">Cloudflare Trace (推荐)</option>
                      <option value="https://1.1.1.1">Cloudflare DNS (1.1.1.1)</option>
                      <option value="http://www.gstatic.com/generate_204">Google Generate 204</option>
                      <option value="https://www.baidu.com">百度首页</option>
                      <option value="custom">自定义 URL</option>
                    </select>
                    
                    {testUrl === 'custom' && (
                      <input
                        type="text"
                        value={customTestUrl}
                        onChange={(e) => setCustomTestUrl(e.target.value)}
                        placeholder="输入自定义测活 URL..."
                        className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    )}
                  </div>

                  <button
                    onClick={saveSecuritySettings}
                    className="w-full py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
                  >
                    保存设置
                  </button>
                </div>
              </div>

              {/* 订阅管理 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-semibold text-gray-700">订阅源管理</h3>
                {subscriptions.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('⚠️ 确定要清空所有订阅源吗？\n\n此操作不可恢复！')) {
                        handleClearSubscriptions();
                      }
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    清空订阅源
                  </button>
                )}
              </div>
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  placeholder="输入订阅链接 (http/https)..."
                  className="flex-1 px-4 py-2 rounded-xl bg-white/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  onClick={addSubscription}
                  className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  添加
                </button>
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto mb-6 custom-scrollbar">
                {subscriptions.map((sub, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/40 rounded-xl">
                    <span className="text-sm text-gray-600 truncate flex-1 mr-4">{sub}</span>
                    <button
                      onClick={() => removeSubscription(index)}
                      className="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      删除
                    </button>
                  </div>
                ))}
                {subscriptions.length === 0 && (
                  <div className="text-center text-gray-400 py-4">暂无订阅链接</div>
                )}
              </div>

              {/* 批量导入/导出 */}
              <div className="border-t border-gray-200/50 pt-6">
                <h3 className="text-md font-semibold text-gray-700 mb-3">批量操作</h3>
                <textarea
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  placeholder="在此粘贴多个订阅链接，每行一个..."
                  className="w-full h-24 px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 mb-4 text-sm"
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleImport}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    批量导入
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    导出列表
                  </button>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  maxValue,
  currentValue,
  icon,
  delay,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  maxValue?: number;
  currentValue?: number;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className="glass rounded-3xl p-6 hover-lift"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <motion.h2
              key={value}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-bold text-gray-800"
            >
              {value}
            </motion.h2>
            {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center">
          {icon}
        </div>
      </div>

      {maxValue && currentValue !== undefined && (
        <div className="relative">
          <svg className="w-full h-12" viewBox="0 0 200 40">
            <path
              d="M 0,20 Q 50,10 100,20 T 200,20"
              fill="none"
              stroke="rgba(147, 197, 253, 0.3)"
              strokeWidth="2"
            />
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: currentValue / maxValue }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              d="M 0,20 Q 50,10 100,20 T 200,20"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </motion.div>
  );
}

function WorldMap({ nodes }: { nodes: any[] }) {
  // 简化的世界地图点位
  const nodePositions = nodes.slice(0, 10).map((node, index) => ({
    x: Math.random() * 80 + 10,
    y: Math.random() * 60 + 20,
    country: node.country || 'Unknown',
    delay: index * 0.1,
  }));

  return (
    <div className="relative w-full h-96">
      {/* 简化的世界地图背景 */}
      <svg className="w-full h-full opacity-20" viewBox="0 0 1000 500">
        <path
          d="M 100,150 L 200,120 L 300,140 L 400,130 L 500,150 L 600,140 L 700,160 L 800,150 L 900,170"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-purple-300"
        />
        <path
          d="M 100,250 L 200,220 L 300,240 L 400,230 L 500,250 L 600,240 L 700,260 L 800,250 L 900,270"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-blue-300"
        />
        <path
          d="M 100,350 L 200,320 L 300,340 L 400,330 L 500,350 L 600,340 L 700,360 L 800,350 L 900,370"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-pink-300"
        />
      </svg>

      {/* 节点标记 */}
      {nodePositions.map((pos, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: pos.delay, duration: 0.5 }}
          className="absolute"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          <div className="relative group">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: pos.delay,
              }}
              className="w-8 h-8 rounded-full bg-blue-400/30 absolute -inset-2"
            />
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 pulse-glow cursor-pointer" />

            {/* 悬停提示 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 rounded-lg glass-strong text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {pos.country}
            </div>
          </div>
        </motion.div>
      ))}

      {/* 中心文字 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <h3 className="text-2xl font-bold text-gray-700 mb-2">全球节点分布</h3>
          <p className="text-gray-500">实时监控 {nodes.length} 个活跃节点</p>
        </motion.div>
      </div>
    </div>
  );
}
