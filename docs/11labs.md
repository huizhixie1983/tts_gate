# ElevenLabs Voice & Speech PRD

## 1. 文档说明

- 目标页面：`https://elevenlabs.io/app/home`
- 输出目标：仅整理 ElevenLabs 中与 voice、speech 直接相关的页面展示与功能实现需求。
- 调研日期：2026-05-18
- 访问限制：目标页为客户端渲染的登录态应用页，公开 HTML 仅能确认页面标题、元信息和应用容器；本文基于 ElevenLabs 公开产品页、页面示例文本和帮助中心资料整理。
- 范围说明：本文只保留语音生成、声音资产、变声、声音克隆、语音转文字、配音翻译、人声分离、语音编辑相关内容；不包含 Music、SFX、Image & Video、Marketplace、非语音创作等内容。

## 2. 产品定位

ElevenLabs App Home 中的 Voice & Speech 能力是一个 AI 语音工作台，帮助用户完成从“选择/创建声音”到“生成语音、转换声音、识别语音、清理人声、翻译配音、编辑交付”的完整流程。

核心价值：

1. 快速生成高质量、自然、可控的 AI 语音。
2. 统一管理声音资产，包括预置声音、社区声音、收藏声音和克隆声音。
3. 将语音生成、转写、变声、配音和人声清理串联为可复用的生产流程。
4. 支持创作者、开发者和团队在同一平台内复用声音、项目和历史生成结果。

## 3. 目标用户

- 内容创作者：需要视频旁白、播客片段、有声书、游戏角色语音和广告口播。
- 音频后期人员：需要转写、字幕、人声清理、片段修正和多轨语音编辑。
- 本地化团队：需要多语言配音、说话人识别、翻译编辑和音轨同步。
- 开发者/产品团队：需要试用 TTS、STT、实时语音、Agents 和 API 能力。
- 企业团队：需要团队声音资产、权限管理、商用授权和安全合规。

## 4. 页面信息架构

### 4.1 与 Voice/Speech 相关的导航入口

| 区域 | 页面/入口 | 说明 |
| --- | --- | --- |
| Home | 首页工作台 | 聚合语音快速创建、最近语音项目、声音推荐和额度状态 |
| Voices | 声音资产 | 管理预置声音、社区声音、克隆声音、收藏声音 |
| Generate / Speech | Text to Speech | 输入文本并生成语音 |
| Generate / Voice Changer | Voice Changer | 上传或录制语音，转换为另一种声音 |
| Products / Studio | 语音编辑 | 编辑语音、修正文稿、转写、降噪和导出 |
| Products / Dubbing | AI Dubbing | 多语言语音翻译与配音 |
| Products / Transcription | Speech to Text | 实时或文件语音转文字 |
| Products / Voice Isolator | 人声分离 | 从音频中提取清晰人声 |

### 4.2 Home 首页建议模块

| 模块 | 功能 | 优先级 |
| --- | --- | --- |
| 快速生成语音 | 输入文本、选声音、选模型、生成音频 | P0 |
| 快速变声 | 上传或录制音频，选择目标声音并转换 | P0 |
| 快速转写 | 上传音频/视频，生成文本和字幕 | P0 |
| 人声清理 | 上传录音，移除噪声并导出清晰人声 | P1 |
| 最近语音项目 | 展示最近 TTS、变声、转写、配音和 Studio 语音项目 | P0 |
| 推荐声音 | 展示收藏、最近使用、热门、克隆声音 | P0 |
| 额度与套餐 | 展示字符额度、生成限制、商用授权、升级入口 | P0 |

## 5. 核心功能需求

### 5.1 Text to Speech / Speech

用户可输入文本，选择声音与模型，生成自然语音。

功能需求：

- 支持文本输入、粘贴和长文本分段。
- 支持选择声音：预置声音、社区声音、收藏声音、克隆声音。
- 支持模型选择：Eleven v3、Multilingual v2、Flash v2.5、Turbo v2.5。
- 支持参数调节：速度、语气、节奏、风格夸张度、稳定性、相似度等。
- 支持多说话人对话生成。
- 支持音频标签控制情绪和事件，例如低语、笑声、叹气等。
- 支持发音词典或 SSML，用于控制品牌名、术语、停顿、重音和音素。
- 支持导出 MP3、WAV/PCM、telephony 场景格式。
- 支持将生成结果保存到历史记录、加入项目或发送到 Studio 继续编辑。

验收标准：

- 用户 3 步内完成“输入文本 -> 选声音 -> 生成音频”。
- 生成失败时明确提示原因：额度不足、文本超限、模型不可用、网络错误。
- 每条生成结果可播放、下载、复制链接、重命名和删除。
- 生成记录必须保留输入文本、声音、模型、参数和输出文件。

### 5.2 Voices

用户可发现、创建、克隆和管理声音资产。

功能需求：

- 声音库支持搜索、筛选和分类：语言、性别、年龄、口音、用途、风格。
- 支持试听声音样例。
- 支持收藏声音、最近使用声音、团队共享声音。
- 支持 Voice Design：通过文字描述生成新声音。
- 支持 Instant Voice Cloning：上传或录制短音频创建声音。
- 支持 Professional Voice Cloning：上传更长、更高质量样本创建高保真声音。
- 支持多语言声音复用：已创建声音可用于多语言语音生成。
- 支持权限与合规：克隆前获得授权确认，展示安全和使用限制。

验收标准：

- 声音卡片展示名称、标签、样例试听、适用场景、使用按钮。
- 克隆流程必须包含授权确认与音频质量检查。
- 生成后的声音可用于 TTS、Voice Changer、Studio、Dubbing 和 API。
- 团队共享声音需按权限控制可见、可用、可编辑范围。

### 5.3 Voice Cloning

用户可上传或录制语音样本，创建可复用的数字声音。

功能需求：

- 支持录音和上传音频两种输入方式。
- 支持 Instant Voice Cloning，用于快速创建声音。
- 支持 Professional Voice Cloning，用于高保真、长期使用的声音模型。
- 支持音频样本质量检测：噪声、时长、单说话人、清晰度。
- 支持创建后编辑声音名称、描述、标签、可见性。
- 支持声音删除、禁用、权限变更。
- 支持授权确认和滥用风险提示。

验收标准：

- 用户提交样本前必须确认拥有使用该声音的权利。
- 音频质量不足时给出可执行的改进建议。
- 克隆完成后可立即在 Text to Speech 中试用。

### 5.4 Voice Changer

用户可上传或录制音频，将原始表演转换为另一种声音，同时保留语气、节奏和情绪。

功能需求：

- 支持上传音频文件或浏览器内录音。
- 支持从声音库选择目标声音。
- 支持搜索目标声音。
- 支持生成前预览原音和目标声音示例。
- 支持生成后试听、下载、保存到项目或发送到 Studio。
- 支持文件大小、格式、时长限制提示。
- 支持保留原始表演的停顿、重音、情绪、口音和语速特征。

验收标准：

- 用户可清楚看到“原始音频”和“转换后音频”的对比。
- 上传格式/大小不符合要求时，在上传前或上传后立即反馈。
- 生成结果可作为新的语音资产进入历史记录或项目。

### 5.5 Speech to Text / Transcription

用户可将实时语音或录制音视频转换为文本、字幕和可编辑稿件。

功能需求：

- 支持实时转写和文件转写。
- 支持音频/视频上传，输出文本、字幕和可编辑 transcript。
- 支持 90+ 语言识别。
- 支持关键术语提示，提高专有名词识别准确率。
- 支持动态音频标签，识别笑声、脚步声等声音事件。
- 支持说话人分离或说话人标注，用于访谈、播客、会议和配音场景。
- 支持将转写结果发送到 Studio 编辑。

验收标准：

- 转写任务展示状态：上传中、处理中、完成、失败。
- 输出支持复制、下载、导出字幕格式。
- 长文件需展示处理进度和预计时间。
- 用户可编辑 transcript，并保留编辑后的版本。

### 5.6 Dubbing

用户可上传或链接视频/音频，将口播内容翻译并配音到目标语言，同时尽量保留原说话人的声音与情绪。

功能需求：

- 支持上传文件或从 URL 导入。
- 支持自动识别多说话人。
- 支持生成源语言 transcript 和目标语言翻译。
- 支持编辑转写、翻译和配音结果。
- 支持每条音轨调节稳定性、相似度、风格。
- 支持片段级操作：合并、拆分、删除、移动、重新生成。
- 支持时间线对齐，确保口播与画面同步。
- 支持导出配音后视频/音频。

验收标准：

- 多说话人内容生成后应能按说话人查看和编辑。
- 用户修改翻译文本后可仅重新生成对应片段。
- 生成前明确提示预计消耗和是否带水印。
- 配音结果应保留原始说话人的声音风格、语气和情绪。

### 5.7 Voice Isolator

用户可从音频中提取清晰人声，移除背景噪声、音乐、重叠对话和干扰。

功能需求：

- 支持上传或录制音频。
- 支持 WAV、MP3、FLAC、OGG、AAC。
- 支持原始音频和降噪后音频对比试听。
- 支持下载处理后人声音轨。
- 支持发送到 Studio 继续编辑。
- 支持处理状态展示和失败重试。

验收标准：

- 处理流程清晰展示：上传/录制 -> 隔离人声 -> 预览/下载。
- 不支持的格式或超限文件需给出明确提示。
- 处理后的结果应尽量减少背景噪声、混响和环境干扰。

### 5.8 Studio 语音编辑

Studio 仅保留与 voice/speech 相关的编辑能力，用于组织、修正和导出语音内容。

功能需求：

- 支持创建语音或视频口播项目。
- 支持上传 MP3、WAV、MP4、MOV 等包含语音的媒体文件。
- 支持时间线编辑：裁剪、合并、移动、同步语音片段。
- 支持添加 AI 旁白。
- 支持 Speech Correction：通过改脚本文字修正已录语音。
- 支持 Voice Isolator 清理背景噪声、混响和干扰。
- 支持 Transcription 生成字幕或 transcript。
- 支持将 TTS、Voice Changer、Dubbing、Transcription 的结果加入项目。

验收标准：

- 时间线操作应支持撤销/重做。
- 任何 AI 生成语音片段都能回溯其输入文本、声音、模型和参数。
- 用户可从项目导出完整音频、片段音频或字幕文件。

## 6. 关键用户流程

### 6.1 快速生成语音

1. 用户进入 Home。
2. 在快速创建区选择 Speech。
3. 输入文本。
4. 选择声音和模型。
5. 调整语速、风格、稳定性等参数。
6. 点击 Generate。
7. 试听、下载或发送到 Studio。

### 6.2 创建并使用克隆声音

1. 用户进入 Voices。
2. 选择 Voice Cloning。
3. 上传或录制语音样本。
4. 确认拥有声音使用授权。
5. 系统检查音频质量并创建声音。
6. 用户命名并保存声音。
7. 在 Text to Speech 或 Voice Changer 中使用该声音。

### 6.3 转换已有录音的声音

1. 用户进入 Voice Changer。
2. 上传录音或直接录制。
3. 选择目标声音。
4. 生成转换结果。
5. 对比原始音频和转换后音频。
6. 下载或保存到项目。

### 6.4 语音转文字并生成字幕

1. 用户进入 Transcription。
2. 上传音频/视频或启动实时转写。
3. 选择语言或使用自动识别。
4. 添加关键术语提示。
5. 等待系统生成 transcript。
6. 编辑文本并导出字幕或发送到 Studio。

### 6.5 多语言配音

1. 用户进入 Dubbing。
2. 上传视频/音频或粘贴 URL。
3. 选择源语言和目标语言。
4. 系统自动识别说话人并生成转写。
5. 用户编辑翻译和片段。
6. 重新生成局部配音片段。
7. 导出配音结果。

### 6.6 清理播客或访谈录音

1. 用户进入 Voice Isolator 或 Studio。
2. 上传录音。
3. 系统分离人声并移除背景噪声。
4. 用户对比原始音频和处理后音频。
5. 下载清晰人声或进入 Studio 继续剪辑。

## 7. 非功能需求

- 性能：Home 首屏 voice/speech 核心入口在 2 秒内可交互；长任务异步处理并支持状态轮询。
- 稳定性：TTS、变声、转写、配音、人声分离任务失败后可重试，不能丢失用户输入。
- 可用性：所有核心语音结果都应支持试听、下载、重命名、删除和复用。
- 响应式：桌面端优先支持完整语音工作台；移动端保留生成、播放、历史和基础管理能力。
- 国际化：界面支持多语言；TTS、STT、Dubbing 的语言范围需按具体模型提示。
- 合规：克隆声音、商用导出、多语言配音必须展示权限、授权和安全提示。
- 安全：账号资产、声音样本、转写文本和生成记录应按用户/团队权限隔离。
- 可追溯：AI 生成语音需保留来源输入、模型、声音、参数、时间和操作者。

## 8. 数据与对象模型

| 对象 | 关键字段 |
| --- | --- |
| User | user_id、plan、quota、team_id、permissions |
| Voice | voice_id、name、type、language、accent、tags、owner、visibility、sample_url、status |
| VoiceCloneJob | job_id、voice_id、sample_assets、mode、quality_check、consent_status、status |
| SpeechGeneration | generation_id、input_text、model、voice_id、params、status、output_url、created_at |
| VoiceChangeJob | job_id、source_asset、target_voice_id、params、status、output_url |
| TranscriptionJob | job_id、source_media、language、keyterms、speakers、transcript、captions、status |
| DubbingJob | job_id、source_media、source_language、target_languages、speakers、clips、status |
| VoiceIsolationJob | job_id、source_asset、status、output_url、quality_metadata |
| Project | project_id、type、title、voice_assets、timeline、collaborators、updated_at |
| Asset | asset_id、media_type、source、duration、format、size、metadata |

## 9. 指标

- Home 中 voice/speech 快速入口点击率。
- 从 Home 到首次语音生成成功的转化率。
- TTS 生成成功率、平均生成耗时、重试率。
- 声音库搜索到使用转化率。
- Voice Cloning 创建成功率和音频质量驳回率。
- Voice Changer 上传到成功生成转化率。
- Speech to Text 转写完成率、编辑率和字幕导出率。
- Dubbing 项目完成率、片段重新生成次数、导出率。
- Voice Isolator 处理完成率和下载率。
- 额度不足触发升级页点击率。

## 10. 风险与待确认

- `/app/home` 登录态内容无法直接完整抓取，首页模块的布局细节需用真实账号截图或录屏复核。
- 免费/付费额度、模型可用性、语言数量和价格会动态变化，正式 PRD 上线前需以产品后台配置为准。
- Voice Cloning、Dubbing、商用使用涉及授权与合规，需法务确认完整交互文案。
- Speech to Text、Dubbing、Voice Isolator 对上传媒体格式、大小、时长的限制需以后台配置和当前套餐为准。
- Studio 的非语音能力已排除，若后续需要完整 Studio PRD，应另开文档。

## 11. 参考来源

- ElevenLabs App Home：`https://elevenlabs.io/app/home`
- Text to Speech：`https://elevenlabs.io/text-to-speech`
- Voice Changer：`https://elevenlabs.io/voice-changer`
- Voice Cloning：`https://elevenlabs.io/voice-cloning`
- Speech to Text：`https://elevenlabs.io/speech-to-text`
- Dubbing Studio：`https://elevenlabs.io/dubbing-studio`
- Voice Isolator：`https://elevenlabs.io/voice-isolator`
- Studio：`https://elevenlabs.io/studio`
- Conversational AI：`https://elevenlabs.io/conversational-ai`
- Text to Speech API：`https://elevenlabs.io/text-to-speech-api`
