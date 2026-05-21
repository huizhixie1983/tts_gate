# Auralith Voice Platform 使用说明

这是一个多语言 TTS 语音服务平台前端原型，面向 Admin、Developer、Creator 三类核心角色。当前版本已经接入本地 MOSI 代理，可直接调用真实接口完成：

- 加载实时声音库
- 选择现有 voice_id 做语音合成
- 上传样本做声音克隆
- 通过文本描述生成音色预览
- 将设计出的预览音频固化成新的 voice_id
- 对 Clone / Design 产出的 voice_id 执行刷新状态、失败重试和删除
- 将 `id.txt` 中整理的公共 voice_id 合并进声音库
- 将 `Voices` 页面按 `Public / My Cloned / My Designed` 分组展示
- 对删除动作增加二次确认弹窗

## 启动方式

```bash
npm install
npm run dev
```

在 **CentOS 7 / glibc 2.17** 上请使用仓库脚本（固定 Node 16，绕过 npm `.bin` 与 glibc 不兼容问题）：

```bash
bash scripts/dev.sh    # 开发：API 代理 + Vite
bash scripts/build.sh  # 构建：tsc + vite build → dist/
```

需已安装 [nvm](https://github.com/nvm-sh/nvm) 且 `nvm install 16`；脚本会自动 `nvm use 16`。

默认访问地址：

```text
http://127.0.0.1:5173/
```

`npm run dev`（等同 `scripts/dev.sh`）会同时启动两个进程：

- Vite 前端：`http://127.0.0.1:5173`
- 本地 MOSI 代理：`http://127.0.0.1:8787`

## 环境变量

项目通过本地代理读取 `.env.local`，避免把 API key 暴露到浏览器。

已使用的变量：

```bash
MOSI_API_KEY=your_key
MOSI_PROXY_PORT=8787
```

如果需要替换 key，可参考 [.env.example](/Users/admin/Downloads/web_test/.env.example)。

## 角色登录与默认页面

当前项目使用 mock 角色登录，不连接真实账号系统。打开网站后，先在登录页选择角色：

| 角色 | 登录后默认页 | 说明 |
| --- | --- | --- |
| Admin | `Team` | 管理团队、权限、API Key、用量、计费和安全 |
| Developer | `Docs` | 查看接入文档、复制 API 示例、排查自己 API Key 的日志与用量 |
| Creator | `Playground` | 试音、选择声音、克隆声音、设计音色 |

登录后右上角会显示当前角色，并提供 `Switch role` 用于退出当前 mock 角色并重新选择。

## 角色可见页面

不同角色会看到不同顶部导航。如果用户手动访问未授权路由，应用会自动跳转到该角色的默认页面。

| 页面 | Admin | Developer | Creator |
| --- | --- | --- | --- |
| Home | 可见 | 可见 | 可见 |
| Playground | 可见 | 可见 | 可见 |
| Models | 可见 | 可见 | 可见 |
| Voices | 可见 | 可见 | 可见 |
| Docs | 可见 | 可见 | 不可见 |
| Usage | 可见 | 可见 | 不可见 |
| Logs | 可见 | 可见 | 不可见 |
| Pricing | 可见 | 可见 | 可见 |
| Safety | 可见 | 不可见 | 不可见 |
| Team | 可见 | 不可见 | 不可见 |

## Admin 使用方式

Admin 负责团队、权限、API Key、用量、计费和安全治理。

推荐路径：

1. 在登录页选择 `Admin`，系统默认进入 `Team` 页面。
2. 查看团队成员、角色和审计日志。
3. 点击顶部 `Create API Key`，创建新的 API Key，并为其配置 scopes。
4. 在 `Team` 页面查看 API Key 列表和角色权限矩阵。
5. 进入 `Usage` 页面，查看字符消耗、成功率、延迟和错误状态。
6. 进入 `Logs` 页面，点击请求记录查看 request_id、endpoint、status、latency 和 error_code。
7. 进入 `Pricing` 页面查看套餐和升级路径。
8. 进入 `Safety` 页面确认声音授权、RBAC、审计和策略错误设计。

Admin 重点关注：

- API Key 是否按最小权限发放。
- 成员角色是否合理。
- 用量是否接近额度。
- 是否存在 rate limit、quota 或安全策略相关错误。
- 克隆声音和设计声音是否符合授权要求。

## Developer 使用方式

Developer 负责接入真实 TTS API、排查自己 API Key 的请求和复制模型/声音参数。

推荐路径：

1. 在登录页选择 `Developer`，系统默认进入 `Docs` 页面。
2. 查看 Quickstart、Authentication、HTTP TTS、WebSocket、Voices、Errors、Rate limits。
3. 进入 `Models` 页面，了解 `auralith-one-1.0` 和 `auralith-ultra-1.0` 的差异。
4. 进入 `Voices` 页面，加载实时 MOSI 声音库，筛选、试听并复制可用 `voice_id`。
5. 进入 `Playground` 页面，输入文本，选择 model、voice、language 和 format。
6. 点击 `Generate` 发起真实 MOSI TTS 请求，返回可播放音频、request_id、latency 和 cost。
7. 在 Playground 右侧复制等价 API JSON。
8. 进入 `Usage` 页面查看自己/API Key 维度的调用量、成功率和错误状态。
9. 进入 `Logs` 页面排查自己/API Key 维度的请求，点击日志行打开详情抽屉。

Developer 重点关注：

- 生产环境建议固定使用稳定模型版本，例如 `auralith-one-1.0` 或 `auralith-ultra-1.0`。
- `voice_id` 可以从实时 Voices 页面复制。
- API 调用失败时优先根据 `request_id` 和 `error_code` 排查。
- 当前页面里 `WebSocket` 仍是信息架构，占位未接真实协议。
- Developer 看到的 `Usage` 和 `Logs` 应理解为“自用视角”，不是团队全量视角。

## Creator 使用方式

Creator 负责试音、选择声音、创建克隆声音、设计新音色和生成语音内容。

推荐路径：

1. 在登录页选择 `Creator`，系统默认进入 `Playground` 页面。
2. 输入文案并试听不同模型和声音效果。
3. 进入 `Voices` 页面，搜索、筛选、试听和收藏实时声音。
4. 点击声音卡片的 `Use`，回到 Playground 使用该声音。
5. 如果需要品牌或个人声音，可在 `Playground` 页面下方的 Voice Clone 区块上传样本并确认授权。
6. Clone 区块会调用真实上传和克隆接口，生成新的 `voice_id`。
7. 如果克隆状态尚未就绪，可用 `Refresh status` 主动拉取服务端状态；失败后可点 `Retry` 重试。
8. 如果不再需要该克隆音色，可用 `Delete voice` 调用真实删除接口。
9. 如果没有真实样本，可在 `Playground` 页面下方的 Voice Design 区块，通过 prompt 生成真实音色预览。
10. 在 Voice Design 区块点击 `Save as Voice`，系统会把预览音频再走一次上传+克隆，固化成可复用 `voice_id`。
11. 对已保存的设计音色，同样可以 `Refresh status`、`Retry preview`、`Delete voice`。

Creator 重点关注：

- 声音克隆前必须确认拥有该声音的使用权。
- Voice Design 适合创建角色音、旁白音、客服音等虚拟音色。
- 已保存的 cloned / designed voice 会进入 `Voices` 页面统一管理。
- Playground 当前通过 MOSI 实际返回 WAV 音频；UI 里的格式选择仍保留为产品层配置。

## 页面速查

| 页面 | 用途 |
| --- | --- |
| `Home` | 官网首页和能力概览 |
| `Playground` | TTS 试音、调参、真实合成，并内嵌 Voice Clone / Voice Design |
| `Models` | 查看 Auralith One / Auralith Ultra 能力差异和复制 model id |
| `Voices` | 实时声音库、搜索筛选、试听、收藏、复制 voice_id |
| `Docs` | 开发者文档、真实 MOSI 端点和 API 示例 |
| `Usage` | 用量、错误状态和 API 健康概览 |
| `Logs` | API 请求日志和详情抽屉 |
| `Pricing` | 套餐和升级路径 |
| `Safety` | 授权、权限、审计和安全策略说明 |
| `Team` | 成员、角色、API Key、权限矩阵和审计 |

## 当前真实接通的接口

参考 `https://studio.mosi.cn/docs` 的接口信息，当前已接通：

- `GET https://studio.mosi.cn/api/v1/voices`
- `POST https://studio.mosi.cn/v1/audio/tts`
- `POST https://studio.mosi.cn/api/v1/files/upload`
- `POST https://studio.mosi.cn/api/v1/voice/clone`
- `POST https://studio.mosi.cn/api/v1/audio/speech` (`model: moss-voice-generator`)
- `DELETE https://studio.mosi.cn/api/v1/voices/{voice_id}`

## 公共音色

项目会把 [id.txt](/Users/admin/Downloads/web_test/id.txt) 中整理出的公共 voice_id 合并进 `Voices` 页面，当前已纳入的公共音色包括：

- `2020008594694475776` 北京男声（清朗男生）
- `2020009311371005952` 台湾女声（温柔女生）
- `2001257729754140672` 阿树
- `2001286865130360832` 周周
- `2001898421836845056` 子琪
- `2001910895478837248` 小满
- `2001931510222950400` 程述
- `2002941772480647168` 阿宁
- `2002991117984862208` 梁子

## 当前仍是原型的部分

- `WebSocket` 页面内容仍是信息架构，尚未接真实流式协议。
- `Auralith One / Auralith Ultra` 目前是你们产品侧的模型分层命名；这次实际接入的底层推理接口是 MOSI 的 `moss-tts` 与 `moss-voice-generator`。

## 已完成的后台工作区能力

- `Usage / Logs / Pricing / Safety / Team` 已通过本地 Admin state 持久化打通，可保存团队成员、API Key、定价草稿、用量策略、审计事件和音色治理状态。
- `Team` 页面支持邀请成员、调整角色、更新成员状态和移除非 Owner 成员。
- `Safety` 页面支持查看高风险审计事件，并直接修改 voice governance 的可见性、审核状态和授权状态。
