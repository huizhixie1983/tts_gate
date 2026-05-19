# 多语言 TTS 语音服务平台 PRD

## 1. 文档说明

- 产品方向：对外提供多语言 TTS 模型、语音服务和 API 能力。
- 参考对象：MiniMax 的开发者语音平台形态，ElevenLabs 的声音资产与创作工作台体验。
- 当前能力基础：已有多语言 TTS 模型与服务、API 能力；模型按参数规模分为两大类；具备声音克隆、音色设计等模型能力。
- 文档目标：定义面向外部客户的产品能力、信息架构、API 体系、控制台功能、数据模型、商业化和验收标准。
- 不纳入首期范围：视频生成、图像生成、音乐生成、通用 Agent、完整音频剪辑 Studio。

## 2. 产品定位

本产品是面向开发者、企业和内容创作者的多语言 AI 语音服务平台，提供稳定、可控、可集成的 TTS、流式语音、声音克隆、音色设计和声音资产管理能力。

产品采用“双入口”设计：

1. 开发者平台：提供 API、SDK、文档、密钥、用量、任务、错误码和服务状态，参考 MiniMax。
2. 创作控制台：提供声音试听、TTS Playground、克隆流程、音色设计、生成历史和资产管理，参考 ElevenLabs。

核心价值：

- 让开发者快速把多语言语音生成接入 App、机器人、客服、虚拟角色和内容平台。
- 让内容团队通过网页端快速试音、选声音、生成音频并复用声音资产。
- 让企业客户创建品牌声音，并通过权限、额度、审计和合规机制安全使用。

## 3. 目标用户

| 用户 | 需求 | 核心功能 |
| --- | --- | --- |
| 开发者/产品团队 | 将 TTS 集成到自有产品 | HTTP API、WebSocket、SDK、API Key、错误码、用量 |
| 内容创作者 | 快速生成多语言旁白、角色语音 | Playground、声音库、生成历史、下载 |
| 游戏/互动内容团队 | 批量生成角色对白，控制情绪和风格 | 音色库、批量 TTS、音色设计 |
| 教育/出版团队 | 将课程短文、片段文稿转成音频 | 批量 TTS、声音库、生成历史 |
| 企业客户 | 建立品牌声音并安全分发 | 声音克隆、团队权限、审计、额度、私有音色 |
| 智能客服/语音助手团队 | 实时对话语音输出 | WebSocket 流式 TTS、低延迟模型、音频 chunk |

## 4. 产品目标

### 4.1 首期目标

- 对外发布稳定的 TTS HTTP API。
- 对外发布低延迟 WebSocket 流式 TTS。
- 支持系统声音库、克隆声音和音色设计声音。
- 支持两类参数规模模型的产品化命名、选择和计费。
- 提供开发者控制台、API 文档、Playground 和基础用量统计。

### 4.2 非目标

- 首期不做完整 DAW/Studio 式多轨编辑器。
- 首期不做 Speech to Text、Dubbing、人声分离，除非已有模型能力。
- 首期不开放公开声音 Marketplace。
- 首期不提供用户生成声音的公开分发和收益体系。

## 5. 产品架构

### 5.1 信息架构

| 一级模块 | 二级模块 | 说明 |
| --- | --- | --- |
| Home | 快速开始、用量、最近生成、推荐声音 | 控制台首页 |
| Playground | Text to Speech、Streaming Demo | 网页端试用和调参 |
| Models | VoxLite、VoxPrime、能力对比、版本说明 | 展示两类参数规模模型 |
| Voices | 系统声音、自定义声音、克隆声音、设计声音 | 声音资产中心 |
| Voice Clone | 创建克隆、任务状态、质量检测 | 上传样本创建声音 |
| Voice Design | 文本描述生成音色、候选试听、保存 | 用自然语言设计新声音 |
| API | API Keys、SDK、文档、错误码 | 开发者接入 |
| Usage & Billing | 用量、额度、账单、套餐、限流 | 商业化和配额 |
| Team | 成员、角色、权限、审计日志 | 企业团队管理 |

### 5.2 核心对象

- Model：语音模型，按参数规模和适用场景区分。
- Voice：声音资产，可来自系统声音、克隆声音、音色设计。
- Generation：一次 TTS 生成记录。
- StreamingSession：实时流式会话。
- CloneJob：声音克隆任务。
- VoiceDesignJob：音色设计任务。
- APIKey：开发者密钥。
- Quota：额度和限流配置。

## 6. 模型产品化设计

### 6.1 模型分层

现有模型按参数规模分为两大类。对外命名不直接暴露“大参数/小参数”，而是使用“系列名 + 版本号”的方式，便于用户理解、持续升级和版本管理。

| 模型档位 | 产品命名建议 | 定位 | 适用场景 |
| --- | --- | --- | --- |
| 小参数模型 | VoxLite / `vox-lite-v1` | 成本低、速度快、稳定输出 | 客服播报、常规旁白、批量生成、低成本业务 |
| 大参数模型 | VoxPrime / `vox-prime-v1` | 表现力强、自然度高、情绪和多语言更好 | 内容创作、角色语音、广告、有声书、品牌声音 |

命名原则：

- 对外使用 VoxLite 和 VoxPrime，避免直接使用“小模型”“大模型”等工程术语。
- API 使用小写短横线格式，例如 `vox-lite-v1`、`vox-prime-v1`。
- 稳定版本使用 `v1`、`v2`；小版本使用 `v1.1`、`v1.2`。
- 预览版本使用 `preview` 后缀，例如 `vox-prime-v2-preview`。
- 企业锁版本使用日期快照，例如 `vox-prime-2026-05-18`。
- `latest` 别名仅用于快速试用，例如 `vox-lite-latest`、`vox-prime-latest`，生产环境建议固定到稳定版本。

### 6.2 模型能力说明

| 能力 | VoxLite / `vox-lite-v1` | VoxPrime / `vox-prime-v1` |
| --- | --- | --- |
| 多语言 TTS | 支持 | 支持 |
| 低延迟 | 优先支持 | 支持，但成本和延迟更高 |
| 情绪表达 | 基础 | 增强 |
| 单次输入上限 | 基础上限 | 更高上限 |
| 声音克隆适配 | 支持 | 更优先推荐 |
| 音色设计适配 | 支持 | 更优先推荐 |
| 价格 | 低 | 高 |

### 6.3 模型选择策略

- Playground 默认推荐 `vox-prime-v1`，突出效果。
- API 示例默认使用 `vox-lite-v1`，降低开发者试用成本。
- WebSocket 默认推荐低延迟配置，优先使用 `vox-lite-v1` 或后续专用实时模型。
- 克隆声音和设计声音应显示可用模型范围。

### 6.4 版本管理策略

| 类型 | 命名示例 | 使用建议 |
| --- | --- | --- |
| 稳定主版本 | `vox-lite-v1`、`vox-prime-v1` | 推荐生产环境使用 |
| 稳定小版本 | `vox-lite-v1.1`、`vox-prime-v1.2` | 用于兼容升级和灰度 |
| 预览版本 | `vox-prime-v2-preview` | 用于新能力试用，不保证长期兼容 |
| 日期快照 | `vox-prime-2026-05-18` | 用于企业客户锁版本和回归 |
| 最新别名 | `vox-lite-latest`、`vox-prime-latest` | 用于测试和 Playground，不建议生产强依赖 |

升级规则：

- 同一主版本内的小版本升级应尽量保持音色、参数和输出风格稳定。
- 主版本升级可以引入明显能力提升，但需提供迁移说明。
- 预览版本必须标注不稳定风险、可能废弃时间和替代版本。
- API 响应必须返回实际使用的 `model` 和 `model_version`，即使请求使用的是 `latest` 别名。

## 7. 核心功能需求

### 7.1 Text to Speech HTTP API

开发者通过 HTTP API 输入文本、模型和 voice_id，获取音频结果。

功能需求：

- 支持普通文本转语音。
- 支持指定 `model`、`voice_id`、`language`。
- 支持系统声音、克隆声音、音色设计声音。
- 支持多语言文本输入。
- 支持基础参数：语速、音量、音高、情绪、风格强度。
- 支持高级参数：稳定性、相似度、停顿、发音词典、音素或 SSML。
- 支持输出格式：MP3、WAV、PCM、FLAC。
- 支持音频参数：采样率、码率、声道。
- 支持同步返回音频 URL 或二进制音频。
- 支持结构化错误码和 `request_id`。

验收标准：

- 开发者能在 10 分钟内完成 API Key 创建、复制示例、生成第一条音频。
- 每次请求都返回可追踪的 `request_id`。
- 参数非法、额度不足、文本超限、模型不可用、voice_id 不存在时有明确错误码。
- 生成记录在控制台可查看输入、模型、声音、参数、状态和消耗。

### 7.2 WebSocket Streaming TTS

面向实时对话、虚拟角色、客服和语音助手，提供低延迟流式语音。

功能需求：

- 支持 WebSocket 建立会话。
- 支持会话级配置：模型、voice_id、语言、音频格式、采样率。
- 支持持续发送文本片段。
- 支持边生成边返回音频 chunk。
- 支持 flush、cancel、close 等控制事件。
- 支持文本中断后停止生成。
- 支持断线、超时、鉴权失败、限流等错误事件。
- 支持服务端记录 session_id、首包延迟、总耗时和错误原因。

验收标准：

- 客户端可连续接收音频 chunk 并平滑播放。
- 首包延迟达到实时对话业务 SLA。
- 连接异常不会产生不可追踪的孤立任务。
- 文档提供浏览器端和服务端示例。

### 7.3 Voice Library

声音库用于管理所有可用声音，是平台的核心资产中心。

功能需求：

- 支持系统声音列表。
- 支持克隆声音列表。
- 支持音色设计声音列表。
- 支持按语言、性别、年龄、风格、场景、情绪筛选。
- 支持声音试听。
- 支持收藏、最近使用、团队共享。
- 支持复制 `voice_id`。
- 支持查看声音可用模型、支持语言、创建方式、权限范围。
- 支持禁用、删除、重命名、编辑标签。

验收标准：

- 声音卡片展示名称、voice_id、语言、标签、试听按钮、使用按钮。
- 不兼容当前模型或语言的声音需禁用并说明原因。
- 删除声音前需二次确认；历史生成记录仍可追溯。

### 7.4 Voice Clone

用户上传或录制语音样本，创建可复用的专属声音。

功能需求：

- 支持上传音频文件。
- 支持浏览器录音。
- 支持快速克隆和高质量克隆两种模式。
- 支持样本质量检测：时长、噪声、单说话人、清晰度、音量。
- 支持克隆任务状态查询。
- 支持克隆完成后试听。
- 支持设置声音名称、描述、标签、可见性。
- 支持授权确认、风险提示和滥用防控。
- 支持克隆声音用于 HTTP TTS 和 WebSocket TTS。

验收标准：

- 提交样本前必须确认拥有声音使用权。
- 样本质量不足时给出可执行的改进建议。
- 克隆成功后生成稳定 `voice_id`，并可立即用于 TTS。

### 7.5 Voice Design

用户通过自然语言描述生成新音色，用于没有真实样本或需要角色声音的场景。

功能需求：

- 支持输入音色描述，例如语言、年龄、性别、风格、情绪、场景。
- 支持一次生成多个候选声音。
- 支持候选试听。
- 支持重新生成和微调描述。
- 支持保存候选为正式声音资产。
- 支持生成后分配 `voice_id`。
- 支持标记适用模型和语言。
- 支持在 Playground 直接用设计声音生成文本。

验收标准：

- 用户可从候选音色中选择一个保存。
- 保存后的设计声音与克隆声音一样进入声音库。
- 设计声音可被 API 引用，并能追溯创建提示词。

### 7.6 TTS Playground

网页端试用和调参工具，用于降低开发者和创作者首次使用门槛。

功能需求：

- 支持输入文本。
- 支持选择模型、声音、语言。
- 支持参数调节：语速、音量、音高、情绪、稳定性、相似度、输出格式。
- 支持试听和下载。
- 支持查看等价 API 请求。
- 支持复制 cURL、Python、JavaScript 示例。
- 支持保存到生成历史。

验收标准：

- 用户在网页端完成一次生成后，可一键复制同等参数的 API 示例。
- 生成结果可播放、下载、重命名、删除。
- 参数变更后请求示例同步更新。

### 7.7 API 文档与 SDK

开发者文档是对外服务的核心入口。

功能需求：

- 提供快速开始。
- 提供鉴权说明。
- 提供 HTTP TTS、WebSocket TTS、Voice Clone、Voice Design、Voice Management 文档。
- 提供请求参数、响应字段、错误码、限制说明。
- 提供 cURL、Python、JavaScript 示例。
- 提供 SDK 下载和版本说明。
- 提供模型、声音、价格和限流说明。

验收标准：

- 新开发者可从文档完成一次端到端调用。
- 所有 API 示例可直接运行。
- 错误码能覆盖常见失败场景并给出处理建议。

## 8. API 设计草案

### 8.1 API 列表

| API | 方法 | 路径 | 用途 |
| --- | --- | --- | --- |
| Create TTS | POST | `/v1/audio/speech` | 短文本 TTS |
| Streaming TTS | WS | `/v1/audio/speech/stream` | WebSocket 流式 TTS |
| List Voices | GET | `/v1/voices` | 查询声音列表 |
| Get Voice | GET | `/v1/voices/{voice_id}` | 查询声音详情 |
| Delete Voice | DELETE | `/v1/voices/{voice_id}` | 删除自定义声音 |
| Create Clone | POST | `/v1/voices/clone` | 创建克隆声音 |
| Get Clone Job | GET | `/v1/voices/clone/jobs/{job_id}` | 查询克隆任务 |
| Create Voice Design | POST | `/v1/voices/design` | 生成设计音色候选 |
| Save Voice Design | POST | `/v1/voices/design/{job_id}/save` | 保存候选为 voice |
| List Models | GET | `/v1/models` | 查询模型列表 |
| Usage | GET | `/v1/usage` | 查询用量 |

### 8.2 TTS 请求示例

```json
{
  "model": "vox-prime-v1",
  "voice_id": "voice_abc123",
  "language": "en",
  "input": "Welcome to our product demo.",
  "voice_settings": {
    "speed": 1.0,
    "volume": 1.0,
    "pitch": 0,
    "emotion": "warm",
    "stability": 0.7,
    "similarity": 0.8
  },
  "audio": {
    "format": "mp3",
    "sample_rate": 44100,
    "bitrate": 128000
  }
}
```

### 8.3 TTS 响应示例

```json
{
  "request_id": "req_123",
  "generation_id": "gen_456",
  "status": "succeeded",
  "audio_url": "https://cdn.example.com/audio/gen_456.mp3",
  "duration_ms": 4820,
  "characters_used": 28,
  "model": "vox-prime-v1",
  "voice_id": "voice_abc123"
}
```

### 8.4 错误码建议

| 错误码 | 说明 |
| --- | --- |
| `invalid_api_key` | API Key 无效 |
| `quota_exceeded` | 额度不足 |
| `rate_limited` | 请求频率超限 |
| `invalid_model` | 模型不存在或不可用 |
| `invalid_voice` | voice_id 不存在或无权限 |
| `voice_model_not_supported` | 声音不支持当前模型 |
| `text_too_long` | 文本超出接口限制 |
| `invalid_audio_format` | 输出格式不支持 |
| `clone_sample_invalid` | 克隆样本质量不符合要求 |
| `content_policy_violation` | 输入或声音使用违反安全策略 |
| `internal_error` | 服务内部错误 |

## 9. 权限、额度与商业化

### 9.1 权限模型

| 角色 | 权限 |
| --- | --- |
| Owner | 管理团队、账单、API Key、所有声音和任务 |
| Admin | 管理成员、API Key、声音资产和任务 |
| Developer | 创建 API Key、调用 API、查看用量 |
| Creator | 使用 Playground、创建声音、下载结果 |
| Viewer | 查看声音、任务和用量 |

### 9.2 计费维度

- TTS 字符数或音频时长。
- 模型档位：VoxLite 低价，VoxPrime 高价。
- WebSocket 实时生成时长或字符数。
- 声音克隆次数或克隆声音存储。
- 音色设计生成次数。
- 企业专属并发、SLA、私有部署或专属模型。

### 9.3 限流维度

- 每分钟请求数。
- 每日字符数。
- 并发生成任务数。
- WebSocket 并发连接数。
- 克隆任务并发数。

## 10. 数据与对象模型

| 对象 | 关键字段 |
| --- | --- |
| User | user_id、email、role、team_id、created_at |
| Team | team_id、name、plan、quota、billing_status |
| Model | model_id、name、tier、languages、features、status、version |
| Voice | voice_id、name、type、language、gender、style、owner、visibility、status、available_models、sample_url |
| Generation | generation_id、request_id、input_text、model_id、voice_id、params、audio_format、status、output_url、characters_used、created_at |
| StreamingSession | session_id、model_id、voice_id、format、status、first_audio_latency_ms、duration_ms、started_at、ended_at |
| CloneJob | job_id、voice_id、sample_assets、mode、quality_check、consent_status、status、error_code、created_at |
| VoiceDesignJob | job_id、prompt、candidates、selected_voice_id、status、created_at |
| APIKey | key_id、team_id、name、scopes、status、last_used_at、created_at |
| UsageRecord | usage_id、team_id、resource_type、amount、model_id、created_at |
| AuditLog | log_id、team_id、actor_id、action、resource_type、resource_id、created_at |

## 11. 指标体系

### 11.1 产品转化指标

- 注册到创建 API Key 转化率。
- API Key 创建到首次成功调用转化率。
- Playground 首次生成成功率。
- 声音试听到使用转化率。
- 克隆声音创建到首次用于 TTS 转化率。

### 11.2 服务质量指标

- TTS 生成成功率。
- 平均生成耗时。
- P95/P99 生成耗时。
- WebSocket 首包延迟。
- WebSocket 会话中断率。
- Clone Job 成功率。
- API 5xx 错误率。

### 11.3 商业指标

- 日活跃开发者数。
- 月活跃 API Key 数。
- 付费转化率。
- 字符消耗量。
- VoxPrime 调用占比。
- 超额用量收入。
- 企业客户留存率。

## 12. 安全与合规

- 声音克隆前必须确认授权。
- 克隆样本和生成声音需按团队权限隔离。
- 提供声音删除、禁用和审计能力。
- 对明显违规文本、仿冒、诈骗、未授权名人声音等场景进行策略拦截。
- 企业客户可配置允许的声音、模型、成员和 API Key 权限。
- 所有生成记录保留 request_id、操作者、模型、voice_id、参数和时间。
- API Key 只展示一次，支持轮换、禁用和作用域限制。

## 13. 发布计划

### 13.1 MVP

- HTTP TTS API。
- WebSocket TTS API。
- 两类模型产品化。
- 系统声音库。
- TTS Playground。
- API Key 管理。
- 基础用量统计。
- API 文档和示例。

### 13.2 V1

- Voice Clone。
- Voice Management。
- 团队权限。
- 生成历史。
- 错误码与 request_id 完整追踪。

### 13.3 V2

- Voice Design。
- 批量 TTS。
- 发音词典/SSML。
- 企业审计日志。
- 套餐和账单系统。
- SDK。

### 13.4 V3

- 更完整的创作者控制台。
- 多语言角色语音模板。
- 私有声音库。
- 企业 SLA 与专属并发。
- 可选增加转写、配音、人声清理等语音后处理能力。

## 14. 风险与待确认

- 两类模型的真实性能、成本、延迟和稳定性需压测后确定默认推荐策略。
- 是否支持 SSML、发音词典、音素级控制，取决于现有模型能力。
- WebSocket 首包延迟和并发上限需通过压测确定 SLA。
- 声音克隆和音色设计涉及声纹权益、授权和内容安全，需要法务与安全策略先行。
- 单次文本长度上限需要结合模型上下文、稳定性和成本确定。
- 商业化需要明确按字符、时长、请求数还是模型档位计费。

## 15. 参考原则

- 参考 MiniMax：API 优先、模型分层、WebSocket、voice_id 管理、任务状态和错误码。
- 参考 ElevenLabs：声音资产中心、克隆声音产品化、音色设计、Playground、创作者友好的试听和复用体验。
