# MiniMax Voice & Speech PRD

## 1. 文档说明

- 目标网站：`https://www.minimax.io/`
- 输出目标：仅整理 MiniMax 中与 voice、speech 直接相关的页面展示与功能实现需求。
- 调研日期：2026-05-18
- 范围说明：本文只保留语音生成、声音克隆、语音模型、长文本转语音、实时语音流式生成、音频 API、声音管理相关内容；不包含视频生成、图像生成、音乐生成、通用 Agent、文本大模型和非语音创作功能。
- 资料依据：MiniMax 官网产品页、MiniMax Audio 页面、MiniMax Speech 2.8 发布页、MiniMax Platform 文档中的 T2A、异步长文本 TTS、Voice Clone、模型说明和 API 文档。

## 2. 产品定位

MiniMax 的 Voice & Speech 能力是面向内容创作、应用开发和企业场景的 AI 语音生成平台。它提供从文本到语音、声音克隆、长文本音频生成、实时流式语音输出到 API 集成的一体化能力。

核心价值：

1. 用文本快速生成自然、可控、多语言的语音。
2. 支持海量音色、情绪表达和自定义声音克隆。
3. 支持短文本实时生成与长文本异步生成两类生产方式。
4. 面向开发者提供稳定的 HTTP、WebSocket 和文件查询 API。
5. 支持内容创作、智能客服、互动角色、有声书、教育、游戏和本地化场景。

## 3. 目标用户

- 内容创作者：需要短视频旁白、播客片段、有声书、广告口播和角色配音。
- 开发者/产品团队：需要将 TTS、流式语音、声音克隆接入应用、机器人或工作流。
- 游戏和互动内容团队：需要批量生成角色语音、情绪化对白和多语言台词。
- 教育和出版团队：需要长文本朗读、课程音频、电子书转语音。
- 企业团队：需要客服语音、品牌声音、可控音色资产和 API 级集成。

## 4. 页面信息架构

### 4.1 与 Voice/Speech 相关的入口

| 区域 | 页面/入口 | 说明 |
| --- | --- | --- |
| MiniMax Audio | Audio / Text to Speech | 面向创作者的语音生成产品入口 |
| MiniMax Speech | Speech 2.8 / 2.6 / 2.5 | 语音生成模型能力说明 |
| Platform Docs | T2A v2 | 文本转语音 API |
| Platform Docs | T2A WebSocket | 流式文本转语音 API |
| Platform Docs | Async Long TTS | 长文本异步语音生成 |
| Platform Docs | Voice Clone | 声音克隆 API |
| Platform Docs | System Voice | 系统内置声音库 |
| Platform Docs | Voice Management | 查询、试听、管理已创建或可用声音 |

### 4.2 首页/产品页建议模块

| 模块 | 功能 | 优先级 |
| --- | --- | --- |
| 快速文本转语音 | 输入文本、选择模型和声音、生成音频 | P0 |
| 声音选择 | 展示系统音色、推荐音色、自定义克隆音色 | P0 |
| 情绪与表达控制 | 设置情绪、语速、音量、音高、风格和语言 | P0 |
| 声音克隆 | 上传音频样本，创建可复用 voice_id | P0 |
| 长文本生成 | 支持长文稿异步生成并查询任务状态 | P0 |
| 实时流式语音 | 通过 WebSocket 边输入边输出音频流 | P0 |
| API 接入 | 提供模型、参数、输出格式和错误码说明 | P0 |
| 生成历史 | 查看、试听、下载、复用最近生成结果 | P1 |

## 5. 核心功能需求

### 5.1 Text to Speech

用户可输入文本，选择声音、模型和参数，生成自然语音。

功能需求：

- 支持普通文本转语音。
- 支持选择 MiniMax Speech 系列模型。
- 支持选择系统声音或自定义克隆声音。
- 支持多语言和多口音语音生成。
- 支持调节语速、音量、音高等基础参数。
- 支持输出 MP3、PCM、FLAC 等音频格式。
- 支持设置采样率、码率、声道等音频参数。
- 支持返回音频文件或音频数据，便于网页端播放和服务端存储。
- 支持生成失败时返回结构化错误信息。

验收标准：

- 用户 3 步内完成“输入文本 -> 选声音/模型 -> 生成音频”。
- 生成结果可试听、下载、复制、重命名和再次生成。
- 每条生成记录保留输入文本、模型、voice_id、参数、输出格式和生成时间。
- 参数非法、额度不足、文本超限或模型不可用时，需给出明确错误提示。

### 5.2 MiniMax Speech Models

MiniMax Speech 模型为语音生成提供核心能力。

功能需求：

- 支持 MiniMax Speech 2.8、2.6、2.5 等模型版本。
- 支持根据场景选择模型，例如高表现力、低延迟、长文本或多语言场景。
- 支持情绪化语音表达。
- 支持自然停顿、节奏、语调和语义相关的韵律控制。
- 支持跨语言语音生成。
- 支持模型升级后兼容旧任务或提示用户迁移。

验收标准：

- 模型选择区展示模型名称、适用场景、能力差异和限制。
- 切换模型后，界面应同步展示可用参数和不可用参数。
- API 返回中应能追踪本次生成使用的模型版本。

### 5.3 Voice Selection / System Voice

用户可从 MiniMax 提供的系统声音库中选择音色。

功能需求：

- 支持系统声音列表展示。
- 支持按语言、性别、年龄、风格、场景筛选声音。
- 支持声音试听。
- 支持复制或引用 voice_id。
- 支持收藏、最近使用和推荐音色。
- 支持在 API 文档中展示 voice_id 与可用模型的关系。

验收标准：

- 声音卡片展示名称、voice_id、语言/风格标签、试听按钮和使用按钮。
- 选择声音后，TTS 输入区立即使用该声音作为生成参数。
- 不兼容当前模型或语言的声音需禁用并说明原因。

### 5.4 Voice Clone

用户可上传语音样本，生成专属可复用声音。

功能需求：

- 支持上传音频样本创建克隆声音。
- 支持为克隆声音设置 voice_id、名称和描述。
- 支持音频样本质量校验：清晰度、噪声、时长、单说话人。
- 支持克隆任务状态查询。
- 支持克隆成功后在 TTS 和 WebSocket TTS 中使用该 voice_id。
- 支持克隆声音试听。
- 支持删除或管理已创建声音。
- 支持授权确认和风险提示。

验收标准：

- 用户提交样本前必须确认拥有声音使用权。
- 样本质量不符合要求时，系统返回可执行的修正建议。
- 克隆完成后，voice_id 可立即用于语音生成 API。
- 克隆声音应展示创建时间、所有者、状态和可用范围。

### 5.5 Async Long Text to Speech

用户可提交长文本任务，系统异步生成完整音频。

功能需求：

- 支持长文本或长文稿输入。
- 支持提交异步生成任务。
- 支持返回 task_id。
- 支持查询任务状态：排队中、处理中、完成、失败。
- 支持任务完成后获取音频文件下载地址。
- 支持长文本拆分、合成和章节级管理。
- 支持失败重试和局部重新生成。

验收标准：

- 长文本任务提交后，用户无需保持页面打开也能查询结果。
- 任务列表展示标题、文本长度、模型、声音、状态、创建时间和完成时间。
- 失败任务需展示失败原因，并允许用户复用原输入重试。

### 5.6 Streaming TTS / WebSocket

开发者可通过 WebSocket 接入低延迟语音生成，适用于实时对话、虚拟角色、客服和语音助手。

功能需求：

- 支持通过 WebSocket 建立语音生成会话。
- 支持流式输入文本。
- 支持边生成边返回音频片段。
- 支持会话级模型、voice_id、语言和音频格式配置。
- 支持中断、续写、结束会话。
- 支持低延迟播放和前端实时音频缓冲。
- 支持错误事件、超时处理和重连策略。

验收标准：

- 首包音频延迟满足实时对话场景要求。
- 客户端可连续接收音频 chunk 并平滑播放。
- 连接异常时返回明确错误码，且不会生成不可追踪的孤立任务。

### 5.7 Voice Management

用户或开发者可查询和管理系统声音、自定义声音和声音克隆任务。

功能需求：

- 支持查询系统声音。
- 支持查询自定义克隆声音。
- 支持查询单个 voice_id 的详情。
- 支持试听声音样例。
- 支持删除、禁用或更新自定义声音。
- 支持查看声音可用模型、语言和权限。

验收标准：

- 声音管理接口返回稳定字段：voice_id、name、type、status、created_at、available_models。
- 删除或禁用声音前需二次确认。
- 已被项目或历史任务引用的声音删除后，历史生成记录仍可追溯。

### 5.8 Developer API

MiniMax Voice & Speech 功能需通过 API 支持开发者集成。

功能需求：

- 支持 HTTP TTS API。
- 支持 WebSocket TTS API。
- 支持异步长文本 TTS API。
- 支持 Voice Clone API。
- 支持文件获取、任务查询和声音管理 API。
- 支持 API Key 鉴权。
- 支持结构化错误码、请求示例和响应示例。
- 支持不同输出格式和音频参数配置。

验收标准：

- 每个 API 文档包含请求地址、鉴权方式、请求参数、响应字段、示例和错误码。
- API 调用失败时，返回可用于排查的 request_id 或 trace_id。
- API 生成结果可被网页端和服务端一致播放或下载。

## 6. 关键用户流程

### 6.1 快速生成语音

1. 用户进入 MiniMax Audio 或 TTS 页面。
2. 输入文本。
3. 选择模型和声音。
4. 调整语速、音量、音高等参数。
5. 点击生成。
6. 试听、下载或复用生成结果。

### 6.2 创建克隆声音并用于 TTS

1. 用户进入 Voice Clone。
2. 上传清晰、单说话人的音频样本。
3. 确认拥有声音使用授权。
4. 系统校验音频质量并创建克隆任务。
5. 克隆完成后生成 voice_id。
6. 用户在 TTS 或 WebSocket TTS 中选择该 voice_id。
7. 生成并试听克隆声音输出。

### 6.3 长文本生成有声内容

1. 用户进入 Async Long TTS。
2. 粘贴或上传长文稿。
3. 选择声音、模型和输出格式。
4. 提交异步任务。
5. 在任务列表中查看处理状态。
6. 任务完成后试听并下载完整音频。

### 6.4 实时对话语音输出

1. 开发者通过 WebSocket 建立连接。
2. 设置模型、voice_id 和音频格式。
3. 持续发送文本片段。
4. 服务端持续返回音频 chunk。
5. 客户端缓冲并实时播放。
6. 会话结束后关闭连接并记录生成日志。

## 7. 非功能需求

- 性能：短文本 TTS 页面核心入口在 2 秒内可交互；WebSocket 首包延迟需满足实时语音对话。
- 稳定性：TTS、长文本生成、声音克隆任务失败后可重试，不能丢失用户输入。
- 可用性：语音生成结果应支持试听、下载、重命名、删除和复用。
- 开发者体验：API 文档必须提供可运行示例、参数解释、错误码和推荐配置。
- 国际化：界面和模型能力需清晰展示支持语言、口音和模型限制。
- 合规：声音克隆和商用声音使用必须展示权限、授权和安全提示。
- 安全：声音样本、voice_id、生成记录和 API Key 应按用户/团队权限隔离。
- 可追溯：AI 生成语音需保留来源文本、模型、声音、参数、时间和操作者。

## 8. 数据与对象模型

| 对象 | 关键字段 |
| --- | --- |
| User | user_id、plan、quota、team_id、permissions |
| Voice | voice_id、name、type、language、gender、style、owner、status、available_models、sample_url |
| VoiceCloneJob | job_id、voice_id、sample_assets、quality_check、consent_status、status、created_at |
| TTSGeneration | generation_id、input_text、model、voice_id、params、audio_format、status、output_url、created_at |
| LongTTSJob | task_id、title、input_text_length、model、voice_id、status、output_url、created_at、finished_at |
| StreamingSession | session_id、model、voice_id、audio_format、status、started_at、ended_at、latency_metrics |
| ApiRequest | request_id、endpoint、user_id、model、status、error_code、created_at |

## 9. 指标

- TTS 页面访问到成功生成转化率。
- TTS 生成成功率、平均生成耗时、失败率。
- WebSocket 首包延迟、播放中断率、会话完成率。
- Voice Clone 提交成功率、音频质量驳回率、克隆完成率。
- 克隆声音首次用于 TTS 的转化率。
- 长文本任务完成率、平均处理时长、失败重试率。
- 系统声音试听到使用转化率。
- API 错误率、鉴权失败率、限流触发率。
- 额度不足触发升级页点击率。

## 10. 风险与待确认

- MiniMax 官网首页会随产品发布变化，正式 PRD 上线前需用最新页面截图或产品后台配置复核。
- 模型名称、可用参数、支持语言、输出格式和价格会动态变化，需以 MiniMax Platform 当前文档为准。
- 声音克隆涉及授权、肖像声纹权益和滥用风险，需法务确认完整交互文案。
- WebSocket 低延迟体验依赖网络、客户端缓冲策略和服务端并发能力，需通过压测确定 SLA。
- 未在公开资料中确认 MiniMax 是否提供独立 Speech to Text/ASR 产品页，因此本文不把语音识别作为已确认核心功能。

## 11. 参考来源

- MiniMax 官网：`https://www.minimax.io/`
- MiniMax Audio / AI Voice Generator：`https://www.minimax.io/audio/text-to-speech/ai-voice-generator`
- MiniMax Speech 2.8：`https://www.minimax.io/news/minimax-speech-28`
- MiniMax Platform Models Intro：`https://platform.minimax.io/docs/guides/models-intro`
- Text to Speech API：`https://platform.minimax.io/docs/guides/speech-t2a`
- Text to Speech WebSocket API：`https://platform.minimax.io/docs/guides/speech-t2a-websocket`
- Async Long Text to Speech：`https://platform.minimax.io/docs/guides/speech-async-long-text-to-speech`
- Voice Clone：`https://platform.minimax.io/docs/guides/speech-voice-clone`
- System Voice：`https://platform.minimax.io/docs/guides/speech-system-voice`
