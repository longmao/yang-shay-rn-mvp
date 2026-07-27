# RETRO · 2026-07-24 · Shay RN MVP Google 登录 + Firebase Auth 包装

## 1. 一句话结论

**task 最终成功**——Google OAuth 跑通、Firebase Auth 包装拿到真实 uid/email/token 并 Alert 打印。最关键的一个认知：**混乱期那 1-2 小时的所有「补 plist / 重签 / 改 configure」全是空转，因为压根没先验依赖在不在；真根因（封装的原生 module 已被 rm 删干净 + npm wrapper 没装）10 秒的 `ls node_modules` + `git log` 就能定位。飘的代价 = 用户明确挫败 + 信任损耗。**

## 2. Loop 复盘（关键 5 个）

### Loop A（飘掉 · 反面教材）· 「装不上 = 签名/plist 问题」

| 阶段 | 内容 |
|---|---|
| 假设 | 安装报 "Failed to get the identifier" = Info.plist 的 GIDClientID/CFBundleURLTypes 配错 或 codesign 签名链断 |
| mechanism（脑补的） | iOS 安装失败通常落在 plist/签名/entitlements |
| 实验 | 反复补 plist → 重签 → Stashed .app 补丁装机 |
| 证据 | 全部失败，同样的报错反复 |
| 判定 | **假假设**。签名/plist 是症状层，不是根因层 |
| **真根因** | .app 本身是损坏产物（native module 文件根本不存在 → js bundle 打不出来 → CFBundleIdentifier 不全），安装器拿不到 identifier 是**结果**不是原因 |

**教训**：安装失败先验产物完整性（CFBundleIdentifier 是否在 .app/plilst 里、binary 是否非 0 字节、main.jsbundle 是否存在），而不是先怀疑签名。

---

### Loop B（飘掉 · 反面教材 #2）· 「js 报错 = configure() 调用方式问题」

| 阶段 | 内容 |
|---|---|
| 假设 | GoogleSignin.configure() 时机/参数错 → 加 Alert / 翻转 AUTO_TRIGGER flag |
| mechanism（脑补的） | wrapper API 用错了 |
| 实验 | 改 configure 位置、加诊断 Alert |
| 证据 | 全部无效 |
| 判定 | **假假设**。在「模块根本没装」的前提下空转 |
| **真根因** | 没先跑 `npm ls @react-native-google-signin/google-signin` / `ls node_modules/@react-native-google-signin`，直接跳到 API 层假设 |

**教训**：RN 报 "Unable to resolve module" 之前，先 `ls node_modules/<pkg>` 一秒钟，比改任何代码都有效。

---

### Loop C（转折 · 找到真根因）· 「inspect 物理状态」

| 阶段 | 内容 |
|---|---|
| 假设 | 打包报错指向 module resolve → 可能包压根不在 |
| 实验 | `ls node_modules/@react-native-google-signin` → 不存在 → 进一步查 native module 文件 → `GoogleSignInModule.swift/.m` 物理上不在磁盘、不在 git 历史 → Podfile 没 GoogleSignIn → AppDelegate 没 GIDSignIn handler |
| 证据 | 四处物理验证一致：封装代码全没了，只剩 package.json 一行残留 + App.tsx import 残留 |
| 判定 | **真根因**。用户记忆「封装过」≠ 代码还在。memory 里的「现在 ios 直接用的你封装的 ios 官方 sdk」与现实不符 |
| 沉淀 | 「用户记忆 / agent memory 描述」必须用物理验证刷一遍，不能直接信。呼应 `agent-mock-as-real` 的「写前 4 问」扩展到「**修前 3 问**」 |

---

### Loop D（重写后·一次过的卡点）· 「build 报 conflicting provisioning settings」

| 阶段 | 内容 |
|---|---|
| 假设 | 命令行传 `CODE_SIGN_IDENTITY="Apple Development: Vincent Yang (N22YUAMCMQ)"` 在 automatic signing 下冲突 |
| mechanism | automatic signing 不允许命令行同时指定带名字的 identity |
| 实验 | 改为通用值 `CODE_SIGN_IDENTITY="Apple Development"` + `CODE_SIGN_STYLE=Automatic` + `DEVELOPMENT_TEAM=N22YUAMCMQ` |
| 证据 | BUILD SUCCEEDED，.app 完整（CFBundleIdentifier/binary/main.jsbundle 齐全） |
| 判定 | **新知识点**——沉淀到下面第 5 节 |

---

### Loop E（最后一个真根因）· 「No root view controller」

| 阶段 | 内容 |
|---|---|
| 假设 | RN 0.86 factory 模式可能不是 scene-based |
| mechanism | `connectedScenes` 取 window 仅在 SceneDelegate 模式下有效；factory 模式 window 是 AppDelegate.window 属性 |
| 实验 | 改用 `UIApplication.shared.delegate?.window.flatMap{$0}` |
| 证据 | 装机 → Google 授权 sheet 弹出 → 用户点继续 → **Alert 打印真实 Firebase uid/email/token** |
| 判定 | **新知识点 + task 闭环** |

---

## 3. 成功点（值得复用）

1. **C 步骤的物理 inspect 链**（node_modules → git log → 磁盘文件 → Podfile → AppDelegate 四处交叉验证）是这次最漂亮的一步，直接终结混乱。这个"四处交叉"应该固化成「依赖真实性验证」的默认动作。
2. **重写后每个 build 卡点都在 1-2 轮内定位到根因**（卡点 1-5 全部没绕远路），从「飘」切到「Loop Engineering 模式」后效率陡升。
3. **最终验证用 Alert + analyze_image 读文字**（机械可验证，不靠"看着对"），符合 `visual-verify-no-agent-sight` memory——没有陷入"截图存了当证据"的反模式。
4. **两个 GoogleService-Info.plist 用 CLIENT_ID/PROJECT_ID 字段值区分**（不是看文件名/时间戳），避免了选错 plist 导致后续静默失败。
5. **字段值断言验证**（uid 是 Firebase 生成格式 `4dBQECs2sKR39SbKIl6gGevRrh73` 28 字符，不是 Google sub）——证明确实过了 Firebase Auth 而非只是 Google OAuth。这正是 `agent-mock-as-real` 的「验字段值不验 count」原则的正面应用。

## 4. 失败/飘点 + 根因 + 对应护栏

| 飘点 | 根因 | 对应已有 memory 护栏 |
|---|---|---|
| Loop A 反复补 plist/重签 1-2h | 没先验产物完整性 | `agent-mock-as-real`「写前 4 问」需扩展为「**修前 3 问**」：① 依赖物理在不在 ② 代码在不在 git/磁盘 ③ 产物完整性先验 |
| Loop B 改 configure() 空转 | 同上，跳过依赖存在性验证 | 同上 |
| 「用户记忆/agent memory 描述」直接信了 | memory 是描述不是物理状态 | `agent-mock-as-real`「字段值断言」需扩到「**memory 描述也需物理刷一遍**」 |
| 续接 session 状态混乱 | 段落切换没 dump 进 .md → /clear → 新 session 读 | 全局宪法「上下文卫生：Document & Clear」+ `cross-session-handoff-prompt` 5 段式 |

**最核心一条**：海信 3 bar 的「**最小粒度**」今天变形了——不是「一次修 1 个缺陷」而是「一次补 5 个假设」。飘的本质 = 在没建立物理基线的情况下，把 N 个假设串成一串一起赌。护栏 = **动手前先建立物理基线（dependency/code integrity check），再逐个 loop 验**。

## 5. 可沉淀的新知识点（现有 memory 没覆盖）

建议新建 3 条 memory：

### 5.1 `rn-ios-automatic-signing-cli-identity.md`
**内容**：RN/iOS 命令行 build 在 automatic signing 下，`CODE_SIGN_IDENTITY` 必须用通用值 `"Apple Development"`（或 `"iPhone Developer"`），**不能传带名字的 `"Apple Development: Vincent Yang (N22YUAMCMQ)"`**——会报 "conflicting provisioning settings... automatically signed but code signing identity has been manually specified"。配合 `CODE_SIGN_STYLE=Automatic` + `DEVELOPMENT_TEAM=<TeamID>` 即可。带名字的 identity 只在 manual signing 下用。

### 5.2 `rn-factory-delegate-vs-scene-rootvc.md`
**内容**：RN 0.86 factory 模式 AppDelegate **没有 SceneDelegate**，window 是 `AppDelegate.window` 属性（`UIApplication.shared.delegate?.window`），**不是** `UIApplication.shared.connectedScenes`。原生 module 需要取 rootViewController（GIDSignIn presenting、UIAlertController 等）必须走 delegate.window 路径，scene API 会返回 nil 报 `no_vc / No root view controller`。判别：AppDelegate.swift 里 `var window: UIWindow?` = factory/delegate 模式；有 SceneDelegate.swift = scene 模式。

### 5.3 `rn-use-modular-headers-firebase-submodule.md`
**内容**：iOS Podfile 开了 `use_modular_headers!` 后，Firebase **没有 umbrella module**，`import Firebase` 会报 "no such module 'Firebase'"。必须按子模块 import：`import FirebaseCore`（AppDelegate）、`import FirebaseAuth`、`import FirebaseFirestore` 等。Firebase 官方 README 假设的是非 modular_headers 场景。**连带知识**：`GoogleService-Info.plist` 只能进 Resources phase（不能进 Sources phase），ruby xcodeproj 注册时务必只加 `resources_build_phase.add_file_reference`，否则报 "Unexpected duplicate tasks"。

### 5.4（可选补强，不新建）扩展 `agent-mock-as-real-stop-pattern.md`
加一节「**修前 3 问**」（写前 4 问的姊妹篇）：
1. 这个依赖/文件物理在不在（`ls node_modules/<pkg>` / `git log -- <file>` / 查磁盘）？
2. 用户/agent memory 说的「之前封装过」是否仍物理存在？
3. 报错症状层（签名失败）vs 根因层（产物损坏）——先验哪一层？

## 6. 反飘护栏自查

### 海信 3 bar 对照

| bar | 今天表现 | 评判 |
|---|---|---|
| **单 Spec ≤ 100 行 / 超 10 轮回炉** | 重写后的 5 个卡点每个 ≤ 3 轮，符合；**混乱期 > 10 轮人机修正仍未回炉**，违反 |
| **最小粒度·一次修 1 缺陷** | 重写后符合；**混乱期违反**——把 plist/签名/configure/AUTO_TRIGGER 串成一串一起赌 |
| **跨模型对抗幻觉** | 未触发（minimax 单 session）；**关键 review 建议切 GLM session 走一遍**——未做（本复盘即代替） |

### `agent-mock-as-real` 写前 4 问 · 反向应用

今天飘掉的那 1-2h，本质是**没问这 4 问的镜像版**——
- Q1「这个数据是用户输入还是我硬编码」→ 镜像版「**这个依赖是真实装的，还是 package.json 一行残留**」——没问
- Q3「这个按钮点了真有事发生吗」→ 镜像版「**这个 native module 文件还在不在磁盘**」——没问
- Q4「用户要改这个值，有没有入口」→ 镜像版「**用户记忆里的"封装过"，物理代码还在不在**」——没问

**结论**：`agent-mock-as-real` 的 4 问护栏虽然是为「写代码」设计的，但今天证明——**修改/调试代码时同样需要镜像版的「修前 3 问」**。建议加进该 memory。

---

## 一句话给杨总

最终 ship 了，但前半段飘了 1-2h 才找到「封装代码被删光」这个根因——**教训一条**：调试前先 `ls node_modules` + `git log` 建立物理基线，再改任何代码；**沉淀三条新 memory**（iOS 自动签名 CLI identity / RN factory 模式 rootVC 取法 / use_modular_headers + Firebase 子模块 import + plist 只进 Resources phase）。
