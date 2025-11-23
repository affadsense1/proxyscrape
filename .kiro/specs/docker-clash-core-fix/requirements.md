# Requirements Document

## Introduction

本文档定义了在 Docker 容器环境中修复 Clash Core 批次测试失败问题的需求。当前系统在 Docker 环境中运行时，所有 Clash Core 批次测试都失败，导致无法进行代理节点的真机验证。

## Glossary

- **System**: 代理池管理系统（Proxy Pool Management System）
- **Clash Core**: Mihomo 代理测试核心程序
- **Docker Container**: 运行系统的 Docker 容器环境
- **Batch Test**: 批次测试，将多个代理节点分批进行 Clash Core 验证
- **Process Cleanup**: 进程清理，确保旧的 Clash Core 进程被完全终止
- **Binary Permissions**: 二进制文件权限，确保 Clash Core 可执行文件有正确的执行权限

## Requirements

### Requirement 1: Clash Core 二进制文件权限验证

**User Story:** 作为系统管理员，我希望系统在启动 Clash Core 前验证二进制文件的权限，确保文件可执行。

#### Acceptance Criteria

1. WHEN THE System attempts to start Clash Core, THE System SHALL verify that the binary file exists at the expected path
2. WHEN THE System verifies the binary file, THE System SHALL check that the file has execute permissions
3. IF THE binary file lacks execute permissions, THEN THE System SHALL attempt to add execute permissions using chmod
4. IF THE permission fix fails, THEN THE System SHALL log a detailed error message with troubleshooting steps
5. WHEN THE binary file is verified, THE System SHALL log the file size and permissions for debugging

### Requirement 2: 进程清理机制增强

**User Story:** 作为系统管理员，我希望系统在启动新的 Clash Core 实例前彻底清理旧进程，避免端口冲突。

#### Acceptance Criteria

1. WHEN THE System starts a new Clash Core instance, THE System SHALL terminate all existing mihomo processes
2. WHEN THE System terminates processes, THE System SHALL wait at least 1 second for processes to fully exit
3. WHEN THE System cleans up processes, THE System SHALL verify that no mihomo processes remain running
4. IF THE process cleanup fails, THEN THE System SHALL log the error and continue with startup
5. WHEN THE cleanup completes, THE System SHALL log the number of processes terminated

### Requirement 3: Clash Core 启动超时优化

**User Story:** 作为系统管理员，我希望系统为 Clash Core 启动提供足够的时间，特别是在处理大批量节点时。

#### Acceptance Criteria

1. WHEN THE System starts Clash Core with more than 50 nodes, THE System SHALL allow up to 60 seconds for startup
2. WHEN THE System waits for Clash Core startup, THE System SHALL check the API endpoint every 500 milliseconds
3. WHEN THE startup check fails, THE System SHALL log progress every 5 seconds to indicate waiting status
4. IF THE Clash Core API responds successfully, THEN THE System SHALL immediately proceed with testing
5. IF THE startup timeout is reached, THEN THE System SHALL log the Clash Core output for debugging

### Requirement 4: Docker 环境特定配置

**User Story:** 作为系统管理员，我希望系统能够检测 Docker 环境并应用特定的配置优化。

#### Acceptance Criteria

1. WHEN THE System starts, THE System SHALL detect if it is running inside a Docker container
2. WHEN THE System is in Docker environment, THE System SHALL use longer timeout values for Clash Core operations
3. WHEN THE System is in Docker environment, THE System SHALL log additional diagnostic information
4. WHEN THE System encounters errors in Docker, THE System SHALL provide Docker-specific troubleshooting guidance
5. WHEN THE System starts Clash Core in Docker, THE System SHALL verify network connectivity before testing nodes

### Requirement 5: 详细的启动失败诊断

**User Story:** 作为系统管理员，我希望在 Clash Core 启动失败时获得详细的诊断信息，以便快速定位问题。

#### Acceptance Criteria

1. WHEN THE Clash Core fails to start, THE System SHALL capture and log all stdout and stderr output
2. WHEN THE startup fails, THE System SHALL log the exact command used to start Clash Core
3. WHEN THE startup fails, THE System SHALL log the working directory and environment variables
4. WHEN THE startup fails, THE System SHALL attempt to execute a test command to verify binary functionality
5. WHEN THE startup fails, THE System SHALL provide a summary of potential causes and solutions
