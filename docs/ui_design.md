# 多语言 TTS 语音服务平台 UI 设计文档

## 1. 文档说明

- 关联 PRD：`docs/voice_service_prd.md`
- 设计目标：为多语言 TTS 语音服务平台定义对外官网、开发者控制台、Playground、声音资产和 API 文档的 UI 结构与交互规范。
- 参考方向：
  - ElevenLabs：学习其创作体验、声音资产中心、试听 Demo、场景化表达和商业信任建设。
  - MiniMax：学习其模型矩阵、开发者入口、API 平台、版本体系和能力服务化表达。
- 首期功能范围：TTS HTTP API、WebSocket 流式 TTS、Auralith One / Auralith Ultra 模型、声音库、声音克隆、音色设计、Playground、API Key、用量统计、团队权限。
- 非首期范围：完整音频编辑器、Speech to Text、Dubbing、人声分离、公开声音 Marketplace。

## 2. UI 设计原则

### 2.1 信息结构原则

- 首屏只强调 3 个核心动作：`Try Playground`、`View API Docs`、`Explore Voices`。
- 官网按“价值 -> Demo -> 模型 -> 声音 -> API -> 信任”的顺序组织，避免把所有功能一次性堆给用户。
- 控制台按任务组织，而不是按模型组织：生成语音、管理声音、接入 API、查看用量。
- 模型信息参考 MiniMax，使用清晰的版本和能力矩阵。
- 声音资产体验参考 ElevenLabs，突出试听、筛选、收藏、克隆和复用。

### 2.2 视觉风格原则

- 整体风格：高科技但可信赖，专业、克制、开发者友好，同时保留语音创作的温度。
- 避免泛 AI 化的大面积蓝紫渐变、抽象光球和纯装饰图形；以真实产品 UI、声音波形、频谱、代码片段、声音卡片作为核心视觉。
- 使用高对比但不刺眼的色彩体系，适合长时间使用。
- 按钮、输入框、卡片和表格保持紧凑，控制台优先保证效率。
- 音频播放、复制 API、下载、收藏、删除等操作优先使用图标按钮，并配 tooltip。

### 2.3 交互原则

- 所有可试听内容都应一键播放，并显示播放状态。
- 所有 API 相关参数都应能复制，尤其是 `model`、`voice_id`、API 示例和错误码。
- Playground 中任何参数变化，都应同步更新右侧等价 API 请求。
- 所有生成结果必须可追溯：文本、模型、声音、参数、生成时间、消耗、request_id。
- 声音克隆和音色设计必须在关键步骤展示授权与安全提示。

## 3. 视觉语言与品牌风格

### 3.1 品牌气质

建议品牌气质定义为：

> Engineering-grade voice intelligence for multilingual products.

对应 UI 表达：

- Engineering-grade：用模型 ID、API 示例、延迟指标、错误码、用量和稳定状态体现工程可信度。
- Voice intelligence：用波形、频谱、音频 chunk、声音卡片和可试听 Demo 体现语音智能。
- Multilingual products：用语言标签、跨语言声音、国际化示例和开发者接入流程体现多语言产品能力。

整体关键词：

- `precise`
- `luminous`
- `technical`
- `calm`
- `expressive`

### 3.2 色调策略

官网建议使用“深色科技底 + 青绿/电蓝强调色 + 少量暖色情绪点缀”。控制台和文档建议默认浅色或支持浅深切换，保证长时间操作和阅读舒适。

深色官网色板：

| 用途 | 颜色 | 说明 |
| --- | --- | --- |
| 主背景 | `#070A0F` | 深色但不使用纯黑 |
| 次背景 | `#0B1018` | 用于分区和卡片底 |
| 主文本 | `#F4F7FB` | 保证高可读性 |
| 次文本 | `#9AA7B5` | 控制信息层级 |
| 主强调色 | `#2EE6A6` | 表示实时、智能、语音流 |
| API 强调色 | `#4FA3FF` | 表示开发者、连接、工程能力 |
| 情绪点缀色 | `#FFB86B` | 用于 warm voice、生成状态、情绪标签 |
| 错误色 | `#FF5C7A` | 用于错误、拒绝、风险提示 |
| 卡片边框 | `rgba(255,255,255,0.08)` | 保持克制和精密感 |

浅色控制台/文档色板：

| 用途 | 颜色 | 说明 |
| --- | --- | --- |
| 页面背景 | `#F7F9FC` | 文档和控制台主背景 |
| 面板背景 | `#FFFFFF` | 卡片、表格、输入区 |
| 主文本 | `#111827` | 长时间阅读友好 |
| 次文本 | `#667085` | 辅助说明 |
| 主强调色 | `#0E9F7E` | 与深色主强调保持一致 |
| API 强调色 | `#2563EB` | 代码、链接、开发者入口 |
| 边框 | `#E5E7EB` | 表格和卡片边界 |
| 弱背景 | `#F2F4F7` | 代码块、筛选栏、空状态 |

使用规则：

- 官网首屏、模型展示和能力展示可以使用深色，强化新兴 AI 高科技感。
- 控制台、Docs、Usage、Logs 默认使用浅色，优先保证效率。
- Playground 可支持深浅切换；默认根据入口决定，官网内嵌 Demo 用深色，控制台内 Playground 用浅色。
- 青绿用于语音生成、成功、实时流；电蓝用于 API、链接、复制、文档。
- 暖色只用于情绪、生成中、重点提示，不作为大面积主色。

### 3.3 核心视觉元素

优先使用与产品能力直接相关的视觉元素：

- 声波：用于音频播放、声音卡片、生成结果。
- 频谱：用于 Voice Clone、Voice Design、声音质量分析。
- Audio chunk：用于 WebSocket Streaming Demo，表达低延迟流式返回。
- Token-to-audio pipeline：用于官网解释文本到语音的生成过程。
- 代码片段：用于 API 能力展示。
- 模型指标：用于 Auralith One / Auralith Ultra 的技术可信度。

避免使用：

- 抽象发光球。
- 大面积紫蓝渐变。
- 与语音无关的科幻装饰。
- 无法交互的静态插画占据首屏主体。
- 纯营销式 hero 图而没有真实产品 UI。

### 3.4 页面风格分配

| 页面/区域 | 推荐风格 | 说明 |
| --- | --- | --- |
| 官网首页 | 深色科技感 | 用可交互 Demo、波形和代码片段建立第一印象 |
| Models | 深色或浅色均可 | 强调模型卡、版本、延迟、价格和能力矩阵 |
| Voices | 浅色优先 | 声音卡片多，浅色更利于浏览和筛选 |
| Playground | 控制台浅色，官网 Demo 深色 | 兼顾转化与效率 |
| Docs | 浅色优先 | 长时间阅读和复制代码更舒适 |
| API Logs / Usage | 浅色优先 | 表格、图表和排查任务优先 |
| Voice Clone / Voice Design | 浅色主界面 + 局部频谱视觉 | 强调步骤、质量检测和试听 |

### 3.5 字体建议

英文和界面字体：

- Inter
- Geist
- SF Pro
- IBM Plex Sans

中文字体：

- 思源黑体
- 阿里巴巴普惠体
- HarmonyOS Sans

代码字体：

- JetBrains Mono
- IBM Plex Mono
- SF Mono

排版规则：

- 官网标题可以更有张力，但不使用过大的炫技字重。
- 控制台、表格、筛选器、参数面板使用紧凑字号。
- 代码块字体必须清晰，行高略大于正文，方便复制和排查。
- 不使用负 letter-spacing。

### 3.6 动效规范

动效目标是体现语音智能和实时性，不是装饰。

推荐动效：

- 音频播放时波形轻微流动。
- Streaming TTS 中音频 chunk 逐段点亮。
- 生成中使用频谱扫描或短脉冲。
- 模型切换时参数面板轻微过渡。
- 卡片 hover 时边框轻微发光。
- 复制成功时用短暂状态反馈。

避免动效：

- 大面积粒子背景。
- 长时间循环的复杂动画。
- 影响阅读的背景波动。
- 卡片大幅位移或缩放。
- 让控制台表格和参数区产生布局跳动的动效。

### 3.7 新兴 AI 高科技感的落点

高科技感应通过“可操作的能力证据”体现，而不是靠装饰：

- Hero 里直接展示可交互 TTS Demo。
- Models 页面展示 `auralith-one-1.0`、`auralith-ultra-1.0`、版本状态和延迟指标。
- Streaming Demo 展示首包延迟、chunk 数、会话状态。
- Voice Clone 展示样本质量检测 checklist 和声纹波形。
- Voice Design 展示 prompt 到多个候选声音的生成过程。
- API Docs 展示可运行代码、request_id、错误码和用量追踪。

## 4. 产品整体信息架构

### 4.1 对外官网

| 页面 | 目标 | 核心内容 |
| --- | --- | --- |
| Home | 建立价值认知并引导试用 | Hero、TTS Demo、Auralith One / Auralith Ultra、声音库、API、客户场景 |
| Models | 解释模型体系 | Auralith One、Auralith Ultra、版本、能力、延迟、价格定位 |
| Voices | 展示声音能力 | 系统声音、克隆声音、音色设计、筛选试听 |
| Developers | 引导 API 集成 | 快速开始、HTTP TTS、WebSocket、SDK、错误码 |
| Pricing | 展示商业化 | 免费额度、模型价格、并发、团队能力 |
| Safety | 建立信任 | 声音授权、滥用防控、审计、企业安全 |

### 4.2 登录后控制台

| 模块 | 子页面 | 核心任务 |
| --- | --- | --- |
| Home | Overview | 快速开始、最近生成、用量、推荐声音 |
| Playground | TTS、Streaming Demo | 网页端试音、调参、复制 API |
| Models | Auralith One、Auralith Ultra | 查看模型能力、版本、限制 |
| Voices | Library、Clone、Design | 搜索声音、创建声音、管理声音 |
| API | Keys、Docs、Logs、Errors | 创建密钥、看文档、排查请求 |
| Usage & Billing | Usage、Plans、Invoices | 查看消耗、升级套餐、账单 |
| Team | Members、Roles、Audit Logs | 团队权限和审计 |

## 5. 官网 UI 设计

### 5.1 首页 Hero

目标：让用户在 5 秒内理解这是“可通过 API 和网页端使用的多语言 TTS 平台”。

布局：

- 顶部导航：Models、Voices、Developers、Pricing、Safety、Docs、Console。
- 主标题：突出品牌和 TTS 服务，不使用抽象口号。
- 副文案：说明支持多语言、低延迟流式语音、声音克隆、音色设计和 API 集成。
- 主按钮：`Try Playground`。
- 次按钮：`View API Docs`。
- 第三入口：`Explore Voices`。
- 首屏右侧或下方放一个可交互 TTS Demo，而不是纯插图。

Hero Demo 组件：

- 文本输入框。
- 声音选择下拉。
- 模型切换：Auralith One / Auralith Ultra segmented control。
- 生成按钮。
- 播放条和下载按钮。
- 小字展示：`model: auralith-ultra-1.0`、`voice_id: ...`、`format: mp3`。

### 5.2 能力模块

首页只展示 4 个核心能力卡片：

| 能力 | 展示方式 | CTA |
| --- | --- | --- |
| Text to Speech API | 代码片段 + 音频播放 | View API |
| Streaming TTS | 音频 chunk / 低延迟指标 | Try Streaming |
| Voice Clone | 上传样本 -> voice_id 流程 | Create Voice |
| Voice Design | prompt -> 候选声音卡片 | Design Voice |

卡片设计要求：

- 每张卡片只放一个核心任务。
- 不使用大段说明文字。
- 每张卡片都应有可点击 CTA。
- 代码和音频 Demo 优先于抽象图形。

### 5.3 模型展示模块

参考 MiniMax 的模型矩阵，但只保留两个清晰系列。

| 模型 | 定位 | UI 展示 |
| --- | --- | --- |
| Auralith One | 低延迟、低成本、高并发 | 速度、价格、适合客服/批量 |
| Auralith Ultra | 高自然度、高表现力、多语言精品 | 表现力、情绪、适合内容创作 |

组件：

- 两列对比卡。
- 能力对比表。
- 版本下拉：`v1`、`v1.1`、`preview`。
- `Copy model id` 图标按钮。
- 推荐场景标签。

### 5.4 声音展示模块

参考 ElevenLabs 的场景化声音库。

声音分类：

- Narration
- Advertisement
- Character
- Conversational
- Education
- Customer Support
- Multilingual

声音卡片字段：

- 声音名称。
- 语言/口音。
- 风格标签。
- 播放按钮。
- `Use in Playground`。
- `Copy voice_id`。

### 5.5 开发者模块

目标：让开发者知道接入路径非常短。

展示内容：

- 3 步快速开始：Create API Key -> Pick a voice -> Generate speech。
- 默认代码语言 tabs：cURL、Python、JavaScript。
- 展示 HTTP TTS 和 WebSocket 两个入口。
- 展示 `request_id`、错误码、用量统计和 Console Logs。

## 6. 控制台首页

### 6.1 页面目标

控制台首页不是营销页，而是工作台。用户进入后应能立即完成试用、接入和管理。

### 6.2 页面布局

顶部：

- 当前 Team。
- 套餐和剩余额度。
- `Create API Key`。
- `Open Playground`。

主体：

| 模块 | 内容 |
| --- | --- |
| Quick Start | 3 步接入进度，未完成项可点击 |
| Usage Snapshot | 今日字符数、请求数、失败率、WebSocket 会话数 |
| Recent Generations | 最近生成音频，支持播放、下载、复制 request_id |
| Recommended Voices | 推荐系统声音和最近使用声音 |
| API Health | 最近错误、限流状态、服务状态 |

右侧辅助区：

- 文档入口。
- 常见错误码。
- SDK 下载。
- 安全与声音授权提醒。

## 7. Playground UI

### 7.1 TTS Playground

目标：同时服务创作者试音和开发者调参。

布局建议：三栏结构。

左栏：输入与声音

- 文本输入。
- 语言选择。
- 声音选择。
- 模型选择：Auralith One / Auralith Ultra。
- 最近使用声音。

中栏：参数与生成

- 语速 slider。
- 音量 slider。
- 音高 stepper。
- 情绪 dropdown。
- 稳定性 slider。
- 相似度 slider。
- 输出格式 dropdown。
- 采样率 dropdown。
- Generate 按钮。

右栏：结果与 API

- 音频播放器。
- 下载、复制链接、删除。
- 本次消耗。
- request_id。
- 等价 API 请求代码。
- `Copy cURL`、`Copy Python`、`Copy JS`。

### 7.2 Streaming Demo

目标：让开发者理解 WebSocket 低延迟能力。

核心组件：

- 文本片段输入区。
- Connect / Disconnect 按钮。
- Send / Flush / Cancel 按钮。
- 实时音频播放条。
- 首包延迟、chunk 数、会话时长。
- WebSocket 消息日志。
- 等价代码示例。

状态设计：

- Disconnected：展示连接说明和鉴权提示。
- Connecting：展示 loading。
- Connected：允许发送文本片段。
- Streaming：展示 chunk 接收动画和播放进度。
- Error：展示错误码、原因和重连按钮。

## 8. Models 页面

### 8.1 页面目标

解释 Auralith One 与 Auralith Ultra 的差异，并帮助用户选择合适模型。

### 8.2 页面结构

- 模型总览：两张模型卡。
- 能力对比表。
- 版本历史。
- 参数兼容性。
- 推荐场景。
- 价格和限流提示。
- API model id 复制区。

### 8.3 模型卡字段

| 字段 | 说明 |
| --- | --- |
| 模型名称 | Auralith One / Auralith Ultra |
| API ID | `auralith-one-1.0` / `auralith-ultra-1.0` |
| 定位 | 低延迟或高表现力 |
| 推荐场景 | 客服、批量、内容创作等 |
| 支持能力 | 多语言、克隆声音、音色设计 |
| 版本状态 | stable、preview、deprecated |
| CTA | Try in Playground、Copy model id |

## 9. Voices 页面

### 9.1 声音库

布局：

- 顶部搜索框。
- 左侧筛选栏。
- 主区声音卡片网格。
- 右侧声音详情抽屉。

筛选项：

- 来源：System、Cloned、Designed。
- 语言。
- 性别。
- 年龄。
- 风格。
- 场景。
- 可用模型。
- 权限：Private、Team。

声音卡片：

- 播放按钮。
- 声音名称。
- 来源标签。
- 语言和风格。
- `Use`。
- `Copy voice_id`。
- 收藏按钮。
- 更多菜单：Rename、Edit tags、Delete。

声音详情抽屉：

- 完整试听。
- voice_id。
- 支持模型。
- 创建方式。
- 权限。
- 最近使用记录。
- API 示例。

### 9.2 Voice Clone

流程设计：

1. 选择模式：快速克隆 / 高质量克隆。
2. 上传或录制样本。
3. 样本质量检测。
4. 授权确认。
5. 创建克隆任务。
6. 试听结果。
7. 命名、打标签、保存。

关键 UI：

- 上传区需明确支持格式、大小、时长。
- 质量检测结果使用 checklist：清晰度、噪声、单说话人、音量、时长。
- 授权确认必须是显式 checkbox。
- 克隆结果页必须提供 `Try in Playground` 和 `Copy voice_id`。

### 9.3 Voice Design

流程设计：

1. 输入音色描述。
2. 选择语言、年龄、性别、风格、场景。
3. 生成候选声音。
4. 试听和比较。
5. 保存为声音资产。

候选声音卡片：

- 播放按钮。
- 描述摘要。
- 风格标签。
- Save as Voice。
- Regenerate Similar。

提示词输入辅助：

- 提供 chips：Warm、Calm、Energetic、Narration、Character、Customer Support。
- 不用长说明文字，用可点击 chips 帮助构造 prompt。

## 10. API 与文档 UI

### 10.1 API Keys

功能：

- 创建 API Key。
- 设置名称。
- 设置 scopes。
- 显示创建时间和最后使用时间。
- 禁用、删除、轮换。

安全设计：

- API Key 只完整展示一次。
- 复制按钮明确提示“保存后不可再次查看完整 key”。
- 高风险操作二次确认。

### 10.2 API Logs

字段：

- 时间。
- endpoint。
- status。
- model。
- voice_id。
- latency。
- characters_used。
- request_id。
- error_code。

交互：

- 支持按状态、endpoint、model、voice_id 筛选。
- 点击一条日志打开详情。
- 详情里可复制 request_id、请求摘要、错误码说明。

### 10.3 Docs

文档布局：

- 左侧目录。
- 中间说明和参数表。
- 右侧代码示例。
- 顶部语言切换：cURL、Python、JavaScript。

文档内容优先级：

1. Quickstart。
2. Authentication。
3. Text to Speech。
4. WebSocket Streaming。
5. Voices。
6. Voice Clone。
7. Voice Design。
8. Errors。
9. Rate Limits。

## 11. Usage & Billing UI

### 11.1 Usage

核心指标：

- 字符消耗。
- 请求数。
- 成功率。
- 平均延迟。
- WebSocket 会话数。
- Auralith One / Auralith Ultra 调用占比。
- 克隆和音色设计次数。

图表：

- 用量趋势折线图。
- 模型消耗堆叠柱状图。
- endpoint 分布。
- 错误码 Top 5。

### 11.2 Plans

套餐卡字段：

- 月额度。
- 支持模型。
- 并发限制。
- WebSocket 连接数。
- 克隆次数。
- 团队席位。
- SLA。

## 12. Team 与权限 UI

### 12.1 Members

表格字段：

- 成员。
- 角色。
- 状态。
- 最近活动。
- 操作。

### 12.2 Roles

角色：

- Owner。
- Admin。
- Developer。
- Creator。
- Viewer。

权限矩阵：

- API Key 管理。
- 声音创建。
- 声音删除。
- Playground 使用。
- 用量查看。
- 账单管理。
- 审计查看。

### 12.3 Audit Logs

记录：

- 创建 API Key。
- 删除 API Key。
- 创建声音。
- 删除声音。
- 修改权限。
- 高风险生成拦截。

## 13. 组件规范

### 13.1 音频播放器

必须包含：

- 播放/暂停。
- 进度条。
- 当前时间/总时长。
- 下载。
- 更多操作。

可选：

- 波形。
- 速度切换。
- A/B 对比。

### 13.2 声音卡片

必须包含：

- 播放按钮。
- 名称。
- 来源标签。
- 语言/风格。
- 使用按钮。
- 复制 voice_id。

### 13.3 模型选择器

使用 segmented control：

- Auralith One。
- Auralith Ultra。

展开详情时展示：

- API ID。
- 延迟。
- 价格。
- 推荐场景。
- 支持参数。

### 13.4 代码块

必须包含：

- 语言 tab。
- 复制按钮。
- 可折叠长参数。
- 与 Playground 参数实时同步。

### 13.5 状态标签

统一状态：

- `stable`
- `preview`
- `deprecated`
- `processing`
- `failed`
- `ready`
- `private`
- `team`

## 14. 响应式设计

### 14.1 桌面端

- 控制台使用左侧导航 + 顶部状态栏。
- Playground 可使用三栏布局。
- 表格、日志、代码示例优先桌面体验。

### 14.2 平板端

- Playground 改为双栏：输入/参数一栏，结果/API 一栏。
- Voices 详情抽屉可覆盖右侧 60% 宽度。

### 14.3 移动端

- 保留核心功能：试听、生成、复制 API 示例、查看用量。
- Playground 改为分段 tabs：Input、Settings、Result、Code。
- 表格改为卡片列表。

## 15. 可访问性与国际化

- 所有图标按钮必须有 tooltip 和 aria-label。
- 音频播放器支持键盘操作。
- 颜色对比度满足基础可访问性要求。
- 文案避免仅靠颜色表达状态。
- UI 支持中英文切换。
- 多语言 TTS 能力页需清晰展示支持语言，不把界面语言和生成语言混淆。

## 16. 首期页面优先级

| 优先级 | 页面 |
| --- | --- |
| P0 | 官网首页 |
| P0 | TTS Playground |
| P0 | API Docs / Quickstart |
| P0 | API Keys |
| P0 | Models |
| P0 | Voices Library |
| P1 | Voice Clone |
| P1 | Voice Design |
| P1 | Usage |
| P1 | API Logs |
| P2 | Billing |
| P2 | Team / Audit Logs |

## 17. 验收标准

- 新用户从官网进入后，能在 3 次点击内到达 Playground。
- 开发者能在 10 分钟内创建 API Key 并完成一次 TTS 调用。
- Playground 中参数变化能同步生成等价 API 请求。
- 每个声音卡片都能试听，并能复制 voice_id。
- Auralith One 与 Auralith Ultra 的差异能在 Models 页面一屏内看懂。
- Voice Clone 必须包含质量检测和授权确认。
- Voice Design 候选声音必须能试听、保存并进入声音库。
- API Logs 中任意失败请求都能定位 request_id 和 error_code。
- 移动端不出现文字重叠、按钮溢出、音频播放器不可操作等问题。

## 18. 设计取舍

- 不做完整 Studio：首期聚焦 TTS 服务化和声音资产管理，避免产品边界过宽。
- 不做公开 Marketplace：先解决私有声音、团队权限和合规，再考虑分发体系。
- 不把模型参数规模暴露给用户：使用 Auralith One / Auralith Ultra 表达体验和场景。
- 不让官网首页承载全部功能：官网负责转化，控制台负责效率，文档负责开发者细节。
