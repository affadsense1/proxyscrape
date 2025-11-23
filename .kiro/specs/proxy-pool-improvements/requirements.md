# Requirements Document

## Introduction

本文档定义了代理池管理系统的三个关键改进需求，旨在提升用户体验和数据可靠性。这些改进包括：一键清空功能、扫描中断时的增量保存机制，以及多窗口实时数据同步。

## Glossary

- **System**: 代理池管理系统（Proxy Pool Management System）
- **User**: 使用代理池管理系统的操作人员
- **Proxy Node**: 代理节点，包含代理服务器的连接信息
- **Scan Process**: 扫描进程，用于检测和验证代理节点可用性的后台任务
- **Browser Window**: 浏览器窗口，用户访问系统的客户端界面
- **Data Store**: 数据存储，保存代理节点和配置信息的持久化层
- **SSE (Server-Sent Events)**: 服务器推送事件，用于实时更新客户端数据的通信机制

## Requirements

### Requirement 1: 一键清空代理池

**User Story:** 作为系统管理员，我希望能够快速清空代理池中的所有节点，以便在需要时重新开始扫描和收集代理。

#### Acceptance Criteria

1. WHEN THE User clicks the clear proxy pool button, THE System SHALL display a confirmation dialog
2. WHEN THE User confirms the clear action, THE System SHALL delete all proxy nodes from the Data Store
3. WHEN THE clear operation completes successfully, THE System SHALL update the user interface to show zero nodes
4. WHEN THE clear operation completes successfully, THE System SHALL display a success notification to the User
5. IF THE clear operation fails, THEN THE System SHALL display an error notification to the User

### Requirement 2: 扫描中断时增量保存有效代理

**User Story:** 作为系统管理员，我希望在扫描过程中即使中断操作，已经验证成功的代理节点也能被保存，避免数据丢失。

#### Acceptance Criteria

1. WHILE THE Scan Process is running, THE System SHALL save validated proxy nodes incrementally to the Data Store
2. WHEN THE User interrupts the Scan Process, THE System SHALL retain all previously saved proxy nodes in the Data Store
3. WHEN THE User reopens the application after interruption, THE System SHALL display all saved proxy nodes from the Data Store
4. WHEN THE Scan Process validates a batch of nodes, THE System SHALL persist the batch to the Data Store within 5 seconds
5. IF THE Scan Process encounters an error during batch save, THEN THE System SHALL log the error and continue scanning

### Requirement 3: 多窗口实时数据同步

**User Story:** 作为系统管理员，我希望在多个浏览器窗口中同时查看系统时，所有窗口都能实时显示相同的数据和扫描进度。

#### Acceptance Criteria

1. WHEN THE User opens multiple Browser Windows, THE System SHALL synchronize proxy node data across all windows
2. WHEN THE Scan Process updates progress, THE System SHALL broadcast the progress to all connected Browser Windows via SSE
3. WHEN THE User performs an action in one Browser Window, THE System SHALL reflect the changes in all other Browser Windows within 2 seconds
4. WHEN THE Data Store is updated, THE System SHALL notify all connected Browser Windows to refresh their data
5. WHEN A Browser Window connects to the System, THE System SHALL send the current state of proxy nodes and scan progress to that window

### Requirement 4: Clash Core 批次测试容错

**User Story:** 作为系统管理员，我希望在扫描过程中即使某一批节点的 Clash Core 测试失败，系统也能继续处理其他批次，避免整个扫描流程中断。

#### Acceptance Criteria

1. WHEN THE Clash Core fails to start for a batch, THE System SHALL log the error and skip to the next batch
2. WHEN A batch test encounters an error, THE System SHALL save any successfully validated nodes from that batch
3. WHEN A batch is skipped due to Clash Core failure, THE System SHALL retain the TCP validation results for those nodes
4. WHEN THE Scan Process completes, THE System SHALL display a summary including the number of skipped batches
5. IF ALL batches fail Clash Core testing, THEN THE System SHALL fall back to TCP validation results for all nodes

### Requirement 5: 防止并发扫描冲突

**User Story:** 作为系统管理员，我希望系统能够防止多个扫描任务同时运行，避免资源冲突和数据不一致。

#### Acceptance Criteria

1. WHEN A Scan Process is running, THE System SHALL prevent other scan requests from starting
2. WHEN THE cron job attempts to start a scan, THE System SHALL check if a scan is already running
3. IF A scan is already running, THEN THE System SHALL skip the cron-triggered scan and log the event
4. WHEN A manual scan is requested while cron scan is running, THE System SHALL return a 409 Conflict status
5. WHEN A Scan Process completes or fails, THE System SHALL release the task lock within 1 second
