# Unified Skill Limitation System

本文件用于继续完善 The Battle Cards / GW-DEMO2 战斗系统中的技能限制机制。

当前项目已经有 `battle-unified-fixes.js` 作为全关卡统一补丁层，因此后续技能限制不要分散写进每个 Boss 脚本里，而应该优先从统一补丁层处理。

---

## 1. 当前基础

现有战斗 Demo 已经有：

- 多个独立战斗页面：`intro-battle.html`、`velmira-boss-battle.html`、`khathia-boss-battle.html`、`heresy-battle.html`、`7seaboss-battle.html`、`lirathe-boss-battle.html`、`blood-tower-battle.html`、`Zai-Battle.html`、`pvp-battle.html`、`farpvp-battle.html`。
- `battle-unified-fixes.js` 已经被设计成所有战斗页面共用的统一修复层。
- 当前统一层已经处理了技能 ID 映射、玩家通用技能、技能颜色、绽放被动、黑瞬充能 / 释放等逻辑。
- Lirathe 战斗已经有多阶段 Boss、腐蚀、意识花苞、软肋格、小恢复格子、蛛网、终局 7 次掏心掏肺与永久眩晕。

因此下一步不是重新写战斗系统，而是加一个“技能限制规则层”。

---

## 2. 核心目标

技能限制系统要解决这些问题：

1. 稀有技能不能在手牌里重复出现。
2. 强技能不能一回合连续使用。
3. 超强技能可以设置每场战斗次数。
4. 多段攻击不能无限触发被动。
5. 对 Boss 的处决、眩晕、击退、禁锢效果必须削弱或转化。
6. 条件技能必须明确条件，比如 Karma 需要打够拳头次数才能抽到嗜血之握。
7. 所有关卡的玩家技能逻辑保持一致。

---

## 3. 技能限制标签

建议给技能增加隐藏 `limitTags`，不需要改 UI，只用于逻辑判断。

```js
const SKILL_LIMIT_RULES = {
  '深呼吸': {
    uniqueInHand: true,
    oncePerTurn: true,
    role: 'prepare'
  },
  '肾上腺素': {
    uniqueInHand: true,
    oncePerTurn: true,
    noRecursiveTrigger: true,
    role: 'risk_boost'
  },
  '先苦后甜': {
    uniqueInHand: true,
    oncePerTurn: true,
    maxUsesPerBattle: 2,
    role: 'delayed_reward'
  },
  '嗜血之握': {
    oncePerTurn: true,
    bossLimited: true,
    requires: 'karma_fist_count_4',
    role: 'finisher'
  },
  '绽放（红色）': {
    uniqueInHand: true,
    oncePerTurn: true,
    role: 'detonate'
  },
  '黑瞬「充能」': {
    uniqueInHand: true,
    oncePerTurn: true,
    role: 'prepare_tile'
  },
  '黑瞬「释放」': {
    extraSkill: true,
    oncePerBattleGenerated: true,
    role: 'special_release'
  }
};
```

---

## 4. 抽牌限制

当前 `drawOneSkill(u)` 已经在统一补丁中被重写过，所以技能限制应该接在这个函数附近。

### 4.1 唯一手牌

如果某个技能有 `uniqueInHand: true`，并且单位当前 `skillPool` 里已经有同名技能，则不能再次抽到。

```js
function hasSkillInHand(u, skillName){
  return !!(u && Array.isArray(u.skillPool) && u.skillPool.some(sk => sk && sk.name === skillName));
}

function canDrawByLimit(u, factory){
  if(!factory) return false;
  const name = factory.key || '';
  const rule = SKILL_LIMIT_RULES[name] || null;
  if(!rule) return true;

  if(rule.uniqueInHand && hasSkillInHand(u, name)) return false;

  if(rule.requires === 'karma_fist_count_4'){
    const count = (u.status && u.status.karmaFistCount) || 0;
    if(count < 4) return false;
  }

  return true;
}
```

### 4.2 抽牌失败后的补偿

如果强技能全部因为限制被排除，不应该让单位没牌用。

规则：

- 先抽合法技能。
- 如果没有合法技能，退回抽普通攻击 / 基础技能。
- 如果还是没有，返回 null。

这样不会出现“限制太多导致不能行动”。

---

## 5. 使用次数限制

每个单位应该有一个隐藏状态：

```js
u._skillLimitState = {
  turnUses: {},
  battleUses: {},
  triggerLocks: {}
};
```

每次使用技能后记录：

```js
function markSkillUsed(u, skillName){
  if(!u) return;
  u._skillLimitState = u._skillLimitState || { turnUses:{}, battleUses:{}, triggerLocks:{} };
  u._skillLimitState.turnUses[skillName] = (u._skillLimitState.turnUses[skillName] || 0) + 1;
  u._skillLimitState.battleUses[skillName] = (u._skillLimitState.battleUses[skillName] || 0) + 1;
}
```

每个友方回合 / 敌方回合开始时清空 `turnUses`，但不要清空 `battleUses`。

---

## 6. 多段攻击限制

所有多段技能默认使用这个规则：

1. 技能可以造成多次伤害。
2. 每一段都能触发伤害、流血、腐蚀等基础效果。
3. 但是“攻击后额外触发”类被动每个技能最多触发一次。
4. `肾上腺素` 追加拳不能再触发新的追加拳。
5. `嗜血之握` 不能被追加攻击、反击、绽放等效果再次触发。

推荐统一加一个 trigger guard：

```js
function withSkillTriggerLock(u, lockName, fn){
  if(!u) return fn();
  u._skillLimitState = u._skillLimitState || { turnUses:{}, battleUses:{}, triggerLocks:{} };
  if(u._skillLimitState.triggerLocks[lockName]) return null;

  u._skillLimitState.triggerLocks[lockName] = true;
  try{
    return fn();
  }finally{
    u._skillLimitState.triggerLocks[lockName] = false;
  }
}
```

Karma 的拳头追击应该被包在类似：

```js
withSkillTriggerLock(karma, 'karma_extra_punch', () => {
  // 追加拳逻辑
});
```

这样可以防止：

> 沙包大的拳头 → 肾上腺素追加 → 追加拳再次触发肾上腺素 → 无限循环

---

## 7. Boss 限制规则

强控制对 Boss 不能完全生效。

建议统一转换：

| 效果 | 普通敌人 | Boss |
|---|---|---|
| 眩晕 | 直接眩晕 1 回合 | 增加 1 层眩晕值 |
| 禁锢 | 不能移动 | 减少 1 步，或增加 1 层眩晕值 |
| 击退 | 击退指定格数 | 只增加失衡，不移动 |
| 处决 | 满足条件直接死亡 | 改成真实伤害 + 眩晕值 |
| 沉默 / 封技 | 不能用技能 | 禁止大招 1 回合 |

Boss 判定：

```js
function isBossUnit(u){
  if(!u) return false;
  return !!(u.isBoss || u.boss || u.size >= 2 || String(u.id || '').includes('boss') || String(u.id || '').includes('lirathe'));
}
```

注意：Lirathe 终局永久眩晕是剧情机制，优先级高于 Boss 抗性。

---

## 8. Karma 技能完善

### 沙包大的拳头

定位：基础连击技能。

限制：

- 每次成功命中，`karmaFistCount +1`。
- 每回合最多通过追加拳额外 +2 次。
- 被闪避 / 没命中不计数。

### 肾上腺素

当前统一补丁里已经是：主动使用后鸡血 +1，恢复 15HP / 5SP，并且作为手牌时支持拳头连段追击。

进一步限制：

- 手牌唯一。
- 每回合最多使用一次。
- 追加拳不能触发追加拳。
- 如果 Karma SP 低于 10，使用后额外获得“疲劳”1层。

### 嗜血之握

触发条件：

- 本场战斗 Karma 成功使用 / 命中 `沙包大的拳头` 4 次后进入技能池。

效果建议：

- 普通敌人：如果 HP 低于 75，直接处决。
- 精英敌人：如果 HP 低于 100，直接处决。
- 小 Boss：造成 100 真实伤害。
- 大 Boss / Lirathe：造成 50 真实伤害 + 1 眩晕值。

限制：

- 每场战斗最多成功处决 1 次。
- 对 Boss 不处决。
- 使用后清空 `karmaFistCount`。

---

## 9. Adora 技能完善

### 绽放（红色）

当前统一补丁已经有：玩家攻击敌人时叠 `血色花蕾`，最多 7 层，主动引爆造成真实伤害并治疗友方。

进一步限制：

- 手牌唯一。
- 每回合只能主动引爆一次。
- 花蕾最多 7 层已经正确。
- Boss 可以吃真实伤害，但治疗量对 Boss 战应保持，不要再放大。

### 黑瞬「充能」/「释放」

当前统一补丁已经有：

- 充能生成 3 个墨片。
- 友方踩完所有墨片后给 Adora 额外技能 `黑瞬「释放」`。
- 释放对敌方全体造成最大 SP 50% + 30SP。

进一步限制：

- 场上有墨片时不能再次充能。
- 已经拥有释放时不能再次充能。
- 释放后清除充能状态。
- Boss 最低保留 1SP，除非当前是剧情破防状态。

---

## 10. Dario 技能完善

### 撕裂伤口

当前统一补丁已经补齐为：前 3 格攻击，目标非满血时伤害提高并额外流血，最后抽出利爪 5HP。

进一步限制：

- 不能在同一个技能动作中重复触发绽放超过一次。
- 对 Boss 的额外流血只加 1 层，不加 2 层。

### 状态恢复

当前统一补丁已经补齐为：全图选择友方，清除负面并 +15SP。

进一步限制：

- 每个单位每回合只能被状态恢复一次。
- 不能清除剧情腐蚀，例如 Lirathe 终局 Adora / Dario 的 99 腐蚀。
- 可以清除普通流血、麻痹、嘲讽、敏捷类错误状态。

---

## 11. Lirathe 战斗适配

Lirathe 二阶段已有特殊机制：

- 高处免疫。
- 意识花苞。
- 软肋格。
- 小恢复格。
- 蛛网。
- 腐蚀。
- 400HP 以下终局剧情。

技能限制系统必须遵守：

1. Lirathe 高处时，普通技能不能伤害她。
2. 软肋坠落后，Boss 抗性下降。
3. 终局剧情期间，Karma 锁 1HP，不受普通技能限制影响。
4. 终局永久眩晕是剧情状态，不被 Boss 抗性抵消。
5. 终局的 99 腐蚀不能被 Dario 状态恢复清除。

---

## 12. 接入顺序

推荐实现顺序：

1. 在 `battle-unified-fixes.js` 加 `SKILL_LIMIT_RULES`。
2. 修改 `drawOneSkill(u)`，加入 `canDrawByLimit(u, factory)`。
3. 加 `markSkillUsed(u, skillName)`。
4. 给 `肾上腺素`、`深呼吸`、`先苦后甜`、`嗜血之握` 加具体限制。
5. 加 Boss 限制转换。
6. 最后才改具体 Boss 脚本。

---

## 13. 测试清单

必须测试：

- `肾上腺素` 不会在同一手牌里出现两张。
- `绽放（红色）` 不会在同一手牌里出现两张。
- `黑瞬「充能」` 场上有墨片时不会再出现。
- `黑瞬「释放」` 使用后不会重复获得。
- Karma 4 次拳头后才会出现 `嗜血之握`。
- `嗜血之握` 对普通敌人能处决，对 Boss 不处决。
- 多段攻击不会无限触发追加拳。
- Dario 状态恢复不能清掉 Lirathe 终局剧情腐蚀。
- Lirathe 永久眩晕不会被 Boss 抗性取消。

---

## 14. 结论

这套限制系统的重点不是削弱玩家，而是让强技能可以安全存在。

以后可以继续加入非常夸张的技能，例如：

- 一回合多段乱拳。
- Adora 精神崩坏技。
- Dario 救命锁血。
- Boss 处决技。
- 地图软肋机制。
- 召唤物机制。

但每个强技能必须有：

> 条件、唯一性、回合限制、战斗限制、Boss 削弱、反递归保护。
