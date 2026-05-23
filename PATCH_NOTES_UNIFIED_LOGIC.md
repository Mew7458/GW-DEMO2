# Unified Battle Logic Patch

本次修复目标：把每一关战斗脚本里复制出来后分叉的玩家技能、抽牌、AI范围、Lirathe特殊机制重新统一。

## 全关卡共通修复

- 新增 `battle-unified-fixes.js`，并挂载到所有 battle 页面：
  - `intro-battle.html`
  - `velmira-boss-battle.html`
  - `khathia-boss-battle.html`
  - `heresy-battle.html`
  - `7seaboss-battle.html`
  - `lirathe-boss-battle.html`
  - `blood-tower-battle.html`
  - `Zai-Battle.html`
  - `pvp-battle.html`
  - `farpvp-battle.html`
- 修复技能选择系统的关键 Bug：
  - 旧代码把 `adora_bloom` / `dario_tear_wound` 这种技能库 ID，直接拿去和战斗内中文技能名比较。
  - 结果：只要本地保存过技能选择，某些关卡就会抽不到手牌，表现成“技能不能用”。
  - 现在统一改为：`buildSkillFactoriesForUnit()` 负责把技能 ID 映射到中文 key，`drawOneSkill()` 只从返回的工厂里抽牌。
- 修复所有脚本里的 AI 范围预览参数错误：
  - `computeCellsForSkill(en, cand.dir, cand.dir)` 改为 `computeCellsForSkill(en, cand.sk, cand.dir)`。
  - 这会影响敌方使用 AOE/方向技能时的显示与判断一致性。
- 修复玩家手动放技能后重复 `unitActed()` 的问题：
  - 旧逻辑里技能函数内部已经 `unitActed()`，外层确认函数又再调用一次。
  - 这会让某些 Buff、鸡血、依赖、连击、行动次数被重复结算。
- 给旧关卡补齐缺失的 50 级通用技能工厂：
  - Adora：`课本知识：刺杀一`、`绽放（红色）`
  - Dario：`撕裂伤口`、`状态恢复`
  - Karma：`肾上腺素`
- 给旧关卡补上 `绽放（红色）` 的被动叠层逻辑：有绽放卡在手牌时，玩家攻击敌人会叠 `血色花蕾`，主动技能可引爆。

## Lirathe 关卡修复

- 修复 `又想逃？` 不能正常移动：
  - 旧技能函数读取 `payload.r`，但统一移动技能传入的是 `{ moveTo: cell }`。
  - 现在两种格式都兼容。
- Lirathe 二阶段数值对齐文档：
  - HP 改为 1500。
  - SP 下限改为 -100。
  - 疲劳崩溃从 50 真伤改为 20 真伤，并恢复到 -10 SP。
- `退去凡躯` 对齐文档：
  - 常态减伤 70%。
  - 软肋坠落后降为 35% 减伤。
  - 保留 20% 受击回血 5HP。
- 修复软肋格逻辑：
  - 文档是“任何人踩上软肋格都会让 Lirathe 掉下来”。
  - 旧代码只有 Lirathe 自己踩到才触发，几乎等于没用。
  - 现在玩家/敌人任意单位踩到软肋格都会让 Lirathe 坠落、眩晕、进入软肋易伤。
- 修复意识花苞攻击范围：
  - 从错误的前方 1 格改为前方 3 格。
- 修正 `你在哪` 的 6x6 范围：
  - 对 2x2 Lirathe 使用“本体向外扩 2 格”的 6x6，而不是从左上角硬算 7x7。
- 终局 400HP 以下事件现在会：
  - Lirathe 回满血。
  - 清除 Lirathe 负面效果。
  - Adora/Dario 虚影变 1HP + 99 腐蚀。
  - 清除花苞、恢复格、软肋、蛛网。
  - 进入 7 次 `掏心掏肺` 剧情攻击。
  - 之后 Lirathe 永久眩晕。

## 检查结果

- 所有 `.js` 文件已通过 `node --check` 语法检查。
- 由于当前环境阻止 Chromium 打开本地/localhost 页面，无法完成浏览器实机点击测试；这次属于代码层统一修复 + 静态语法验证通过。
