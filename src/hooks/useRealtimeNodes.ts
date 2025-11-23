import { useState, useEffect, useCallback, useRef } from 'react';

interface NodeInfo {
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

interface DataChangeEvent {
    type: 'nodes_updated' | 'nodes_cleared' | 'config_updated' | 'connected';
    timestamp: string;
    data?: {
        totalNodes?: number;
        aliveNodes?: number;
        operation?: string;
    };
}

export function useRealtimeNodes() {
    const [nodes, setNodes] = useState<NodeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    const loadNodes = useCallback(async () => {
        try {
            const response = await fetch('/api/nodes');
            const data = await response.json();
            setNodes(data.nodes || []);
        } catch (error) {
            console.error('Failed to load nodes:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const connectSSE = useCallback(() => {
        // 关闭现有连接
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        console.log('[SSE] Connecting to data change events...');
        const eventSource = new EventSource('/api/events');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('[SSE] Connected to data change events');
            reconnectAttemptsRef.current = 0; // 重置重连计数
        };

        eventSource.onmessage = (event) => {
            try {
                const data: DataChangeEvent = JSON.parse(event.data);
                console.log('[SSE] Received event:', data.type);

                if (data.type === 'nodes_updated' || data.type === 'nodes_cleared') {
                    // 数据变更，重新加载节点
                    loadNodes();
                }
            } catch (e) {
                console.error('[SSE] Parse error:', e);
            }
        };

        eventSource.onerror = (error) => {
            console.error('[SSE] Connection error:', error);
            eventSource.close();

            // 自动重连
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
                
                setTimeout(() => {
                    connectSSE();
                }, delay);
            } else {
                console.error('[SSE] Max reconnection attempts reached');
            }
        };
    }, [loadNodes]);

    const refresh = useCallback(async () => {
        setLoading(true);
        await loadNodes();
    }, [loadNodes]);

    useEffect(() => {
        // 初始加载
        loadNodes();

        // 建立 SSE 连接
        connectSSE();

        // 清理函数
        return () => {
            if (eventSourceRef.current) {
                console.log('[SSE] Disconnecting...');
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [loadNodes, connectSSE]);

    return {
        nodes,
        loading,
        refresh
    };
}
