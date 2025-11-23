# Implementation Plan

- [ ] 1. 修复并发扫描冲突问题（紧急）
  - 在 `src/cron.ts` 的 `runScheduledScan` 函数中添加任务锁检查
  - 如果任务锁已被占用，跳过本次扫描并记录日志
  - 确保 cron 扫描和手动扫描不会同时运行
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 2. 增强事件系统和数据广播机制
  - 在 `src/lib/events.ts` 中添加 `DataChangeEvent` 接口和 `broadcastDataChange` 函数
  - 实现事件节流机制，限制广播频率为每秒最多 2 次
  - _Requirements: 3.2, 3.4_

- [ ] 3. 创建 SSE 数据变更端点
  - 创建 `src/app/api/events/route.ts` 文件
  - 实现 GET 方法，建立 SSE 连接并监听 `dataChange` 事件
  - 处理客户端断开连接时的清理逻辑
  - _Requirements: 3.2, 3.4, 3.5_

- [ ] 4. 改进增量保存机制
  - 在 `src/lib/scanner.ts` 的 `saveNodesIncremental` 函数中添加错误重试逻辑（最多 3 次）
  - 保存成功后调用 `broadcastDataChange` 触发数据变更事件
  - 添加详细的保存操作日志
  - _Requirements: 2.4, 2.5_

- [ ] 5. 实现 Clash Core 批次测试容错机制
- [ ] 5.1 创建批次测试封装函数
  - 在 `src/lib/scanner.ts` 中创建 `BatchTestResult` 接口
  - 实现 `testBatchWithClash` 函数，封装单批次的 Clash Core 测试逻辑
  - 添加批次级别的错误捕获和日志记录
  - _Requirements: 4.1, 4.2_

- [ ] 5.2 重构扫描流程以支持批次容错
  - 修改 `scanSubscriptions` 函数中的批次循环逻辑
  - 当批次失败时跳过并继续下一批，而不是中断整个流程
  - 对于失败的批次，保留 TCP 初筛结果作为降级方案
  - 在扫描日志中记录跳过的批次信息
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 5.3 添加扫描摘要统计
  - 在扫描完成后统计成功批次、失败批次和跳过批次的数量
  - 在扫描日志中输出详细的摘要信息
  - 如果所有批次都失败，确保降级到 TCP 验证结果
  - _Requirements: 4.4, 4.5_

- [ ] 6. 增强清空代理池 API
  - 修改 `src/app/api/nodes/route.ts` 的 DELETE 方法
  - 在清空成功后调用 `broadcastDataChange` 触发 `nodes_cleared` 事件
  - 添加操作日志记录
  - _Requirements: 1.2, 1.3, 1.4_

- [ ] 7. 创建前端实时数据同步 Hook
  - 创建 `src/hooks/useRealtimeNodes.ts` 文件
  - 实现 `useRealtimeNodes` Hook，监听 SSE 数据变更事件
  - 实现自动刷新节点数据的逻辑
  - 添加 SSE 连接断开后的自动重连机制（最多 5 次）
  - _Requirements: 3.1, 3.3, 3.5_

- [ ] 8. 集成前端实时同步功能
  - 在 `src/app/page.tsx` 中引入 `useRealtimeNodes` Hook
  - 替换现有的手动数据加载逻辑为实时同步逻辑
  - 确保在组件卸载时正确关闭 SSE 连接
  - 添加连接状态指示器（可选）
  - _Requirements: 3.1, 3.3_

- [ ] 9. 优化清空代理池前端交互
  - 确认 `handleClearNodes` 函数在清空后能接收到 SSE 更新
  - 实现乐观更新：清空操作后立即更新 UI，同时等待服务器确认
  - 如果服务器返回错误，回滚 UI 状态
  - _Requirements: 1.3, 1.4, 1.5_

- [ ]* 10. 添加集成测试
  - 编写测试用例：扫描中断后数据恢复
  - 编写测试用例：多窗口数据同步
  - 编写测试用例：清空操作的多窗口同步
  - 编写测试用例：Clash Core 批次失败后继续扫描
  - _Requirements: 2.3, 3.1, 4.1_

- [ ]* 11. 性能优化和文档更新
  - 实现前端节点列表的虚拟滚动（如果节点数量超过 100）
  - 优化 SSE 推送频率，避免过于频繁的更新
  - 更新 README 文档，说明新增的功能
  - _Requirements: All_
