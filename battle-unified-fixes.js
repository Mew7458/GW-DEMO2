// Unified runtime fixes for all battle pages.
// Loaded after each page-specific battle script and before DOMContentLoaded.
(function(){
  if(globalThis.__GW_BATTLE_UNIFIED_FIXES__) return;
  globalThis.__GW_BATTLE_UNIFIED_FIXES__ = true;

  function safe(fn, fallback){ try{ return fn(); }catch(e){ console.warn('[UnifiedFix]', e); return fallback; } }
  function baseIdOf(u){ return String((u && u.id) || '').replace(/_p2$/,''); }
  function hasFactory(fset, key){ return Array.isArray(fset) && fset.some(f=>f && f.key===key); }
  function selectedSetFor(u){
    try{
      if(typeof getSelectedSkillKeysForUnit === 'function'){
        const native = getSelectedSkillKeysForUnit(u);
        // Older battle scripts ignored the gray slot, so selected 枪击 vanished when level>=50 selection filtering was active.
        const extra = new Set(native ? Array.from(native) : []);
        try{
          const selectedSkills = (typeof loadSelectedSkillsForBattle === 'function') ? loadSelectedSkillsForBattle() : null;
          const base = baseIdOf(u);
          let charSelection = null;
          if(selectedSkills && selectedSkills.mode && selectedSkills.data){
            charSelection = selectedSkills.data.player1?.[base] || selectedSkills.data.player2?.[base] || selectedSkills.data[base] || null;
          }else if(selectedSkills && selectedSkills.data){
            charSelection = selectedSkills.data[base] || null;
          }else if(selectedSkills){
            charSelection = selectedSkills[base] || null;
          }
          if(charSelection && charSelection.gray){ extra.add('枪击'); }
        }catch(e){}
        return extra.size ? extra : native;
      }
    }catch(e){}
    return null;
  }
  function mayAddSelected(u, key){
    const selected = selectedSetFor(u);
    return !selected || selected.has(key);
  }
  function livingUnits(){ return safe(()=>Object.values(units).filter(u=>u && u.hp>0), []); }
  function alliesOf(u){ return livingUnits().filter(v=>v.side===u.side); }
  function enemiesOf(u){ return livingUnits().filter(v=>v.side!==u.side); }
  function firstEnemyAtOrNear(cell, side){
    if(!cell) return null;
    try{
      const direct = getUnitAt(cell.r, cell.c);
      if(direct && direct.hp>0 && direct.side!==side) return direct;
    }catch(e){}
    return null;
  }
  function everyDirectionRange(u, rangeFn){
    const arr=[];
    for(const d of Object.keys(DIRS || {})){
      try{ (rangeFn(u,d)||[]).forEach(c=>arr.push(c)); }catch(e){}
    }
    return arr;
  }
  function addBleedCompat(target, layers=1, strength=1){
    if(!target || !target.status) return;
    if(typeof addBleed === 'function') return addBleed(target,layers,strength);
    const nextLayers = Math.max(0,(target.status.bleed||0)+layers);
    let nextStrength = Math.max(0,(target.status.bleedStrength||0));
    if(nextStrength <= 0) nextStrength = 1;
    if(strength > 1) nextStrength += strength;
    target.status.bleedStrength = nextStrength;
    if(typeof updateStatusStacks === 'function') updateStatusStacks(target,'bleed',nextLayers,{label:'流血', type:'debuff'});
    else target.status.bleed = nextLayers;
  }
  function removeNegativesCompat(t){
    if(!t || !t.status) return;
    const negativeKeys = ['stunned','paralyzed','bleed','bloodyBud','resentStacks','mockeryStacks','blastStacks','agileStacks'];
    for(const k of negativeKeys){
      if(t.status[k]){
        if(typeof updateStatusStacks === 'function') updateStatusStacks(t,k,0,{label:k,type:'debuff'});
        else t.status[k]=0;
      }
    }
    if(t._spBroken) t._spBroken=false;
    if(t._spCrashVuln) t._spCrashVuln=false;
    if(t._vulnerabilityStacks) t._vulnerabilityStacks=0;
  }
  function hasBloomCardInPlayerPool(){
    return livingUnits().some(u=>u.side==='player' && Array.isArray(u.skillPool) && u.skillPool.some(sk=>sk && sk.name==='绽放（红色）'));
  }


  const CANONICAL_SKILL_COLORS = {
    '短匕轻挥': 'green', '短匕轻挥！': 'green',
    '枪击': 'gray',
    '呀！你不要靠近我呀！！': 'blue',
    '自制粉色迷你电击装置': 'red', '自制粉色迷你电击装置！': 'red',
    '略懂的医术': 'pink', '略懂的医术！': 'pink',
    '加油哇': 'orange', '加油哇！': 'orange',
    '只能靠你了。。': 'orange',
    '课本知识：刺杀一': 'green',
    '绽放': 'red', '绽放（红色）': 'red',
    '黑瞬「充能」': 'purple', '黑瞬「释放」': 'purple',
    '机械爪击': 'green',
    '迅捷步伐': 'blue',
    '拿来吧你！': 'red',
    '先苦后甜': 'orange',
    '撕裂伤口': 'green',
    '状态恢复': 'orange',
    '生命夺取': 'pink',
    '沙包大的拳头': 'green',
    '都听你的': 'blue',
    '嗜血之握': 'red',
    '深呼吸': 'white',
    '肾上腺素': 'white'
  };
  function canonicalColorForSkillName(name, fallback){
    const n = String(name||'').trim();
    if(CANONICAL_SKILL_COLORS[n]) return CANONICAL_SKILL_COLORS[n];
    for(const [key,color] of Object.entries(CANONICAL_SKILL_COLORS)){
      if(n === key || n.startsWith(key)) return color;
    }
    return fallback || 'green';
  }
  try{
    if(typeof skill === 'function'){
      const oldSkillCtor = skill;
      skill = function(name,cost,color,desc,rangeFn,execFn,estimate={},meta={}){
        const fixedColor = canonicalColorForSkillName(name,color);
        const sk = oldSkillCtor(name,cost,fixedColor,desc,rangeFn,execFn,estimate,meta);
        if(sk && sk.name === '黑瞬「释放」'){
          sk.cost = 3;
          sk.color = 'purple';
          sk.desc = '敌方全体受到其最大SP的50%+30SP伤害（不受掩体）';
        }
        if(sk && sk.name === '黑瞬「充能」'){
          sk.color = 'purple';
          sk.desc = '随机生成3个墨片；友方踩完全部墨片后获得额外技能“黑瞬「释放」”。';
        }
        return sk;
      };
    }
  }catch(e){ console.warn('[UnifiedFix] skill color patch failed', e); }
  try{
    const colorStyle=document.createElement('style');
    colorStyle.textContent='.skillCard.gray{border-left-color:#8c8c8c!important}.skillCard.purple{border-left-color:#9254de!important}.skillCard.green{border-left-color:#73d13d!important}.skillCard.red{border-left-color:#ff4d4f!important}.skillCard.blue{border-left-color:#40a9ff!important}.skillCard.orange{border-left-color:#fa8c16!important}.skillCard.pink{border-left-color:#eb2f96!important}.skillCard.white{border-left-color:#d9d9d9!important}';
    document.head.appendChild(colorStyle);
  }catch(e){}

  function genericAdoraAssassination(u, target){
    target = target && target.id ? target : firstEnemyAtOrNear(target, u.side);
    if(!target){ appendLog('课本知识：刺杀一 目标无效'); if(typeof unitActed==='function') unitActed(u); return; }
    const dmg1 = typeof calcOutgoingDamage === 'function' ? calcOutgoingDamage(u,10,target,'课本知识：刺杀一') : 10;
    const dmg2 = typeof calcOutgoingDamage === 'function' ? calcOutgoingDamage(u,5,target,'课本知识：刺杀一') : 5;
    if(typeof cameraFocusOnCell === 'function') cameraFocusOnCell(target.r,target.c);
    damageUnit(target.id, dmg1, 5, `${u.name} 课本知识：刺杀一·刺入 ${target.name}`, u.id, {skillFx:'adora:课本知识：刺杀一'});
    damageUnit(target.id, dmg2, 5, `${u.name} 课本知识：刺杀一·拔出 ${target.name}`, u.id, {skillFx:'adora:短匕轻挥'});
    addBleedCompat(target,1,1);
    u.dmgDone = (u.dmgDone||0) + dmg1 + dmg2;
    if(typeof unitActed==='function') unitActed(u);
  }

  function genericAdoraBloom(u){
    let total = 0;
    for(const t of enemiesOf(u)){
      const stacks = (t.status && t.status.bloodyBud) || 0;
      if(stacks<=0) continue;
      total += stacks;
      if(typeof updateStatusStacks === 'function') updateStatusStacks(t,'bloodyBud',0,{label:'血色花蕾', type:'debuff'});
      else t.status.bloodyBud = 0;
      damageUnit(t.id, stacks*10, stacks*5, `${u.name} 引爆 ${t.name} 的血色花蕾（${stacks}层）`, u.id, {trueDamage:true, ignoreCover:true, ignoreBlast:true});
    }
    if(total>0){
      const beforeHp = u.hp, beforeSp = u.sp;
      u.hp = Math.min(u.maxHp, u.hp + total*5);
      u.sp = Math.min(u.maxSp, u.sp + total*5);
      if(typeof syncSpBroken==='function') syncSpBroken(u);
      if(typeof showGainFloat==='function') showGainFloat(u,u.hp-beforeHp,u.sp-beforeSp);
      for(const a of alliesOf(u)){
        if(a===u) continue;
        const ah=a.hp, asp=a.sp;
        const close = (typeof mdist==='function') ? mdist(u,a)<=5 : true;
        if(close){
          a.hp=Math.min(a.maxHp,a.hp+total*3);
          a.sp=Math.min(a.maxSp,a.sp+total*3);
          if(typeof syncSpBroken==='function') syncSpBroken(a);
          if(typeof showGainFloat==='function') showGainFloat(a,a.hp-ah,a.sp-asp);
        }
      }
      appendLog(`${u.name} 使用 绽放（红色）：引爆 ${total} 层血色花蕾`);
    }else{
      appendLog('绽放（红色）：场上没有血色花蕾');
    }
    if(typeof unitActed==='function') unitActed(u);
  }

  function genericDarioTearWound(u, target){
    target = target && target.id ? target : firstEnemyAtOrNear(target, u.side);
    if(!target){ appendLog('撕裂伤口 目标无效'); if(typeof unitActed==='function') unitActed(u); return; }
    const wounded = target.hp < target.maxHp;
    const dmg = wounded ? 23 : 15;
    damageUnit(target.id, dmg, 0, `${u.name} 撕裂伤口 ${target.name}`, u.id, {skillFx:'dario:机械爪击'});
    addBleedCompat(target, wounded ? 2 : 1, 1);
    damageUnit(target.id, 5, 0, `${u.name} 抽出利爪 ${target.name}`, u.id, {skillFx:'dario:机械爪击'});
    u.dmgDone = (u.dmgDone||0) + dmg + 5;
    if(typeof unitActed==='function') unitActed(u);
  }

  function genericDarioStatusRecovery(u, aim){
    let target = aim && aim.id ? aim : null;
    if(!target && aim && typeof getUnitAt === 'function') target = getUnitAt(aim.r, aim.c);
    if(!target || target.side!==u.side) target = u;
    removeNegativesCompat(target);
    const before = target.sp;
    target.sp = Math.min(target.maxSp, target.sp + 15);
    if(typeof syncSpBroken==='function') syncSpBroken(target);
    if(typeof showGainFloat==='function') showGainFloat(target,0,target.sp-before);
    appendLog(`${u.name} 使用 状态恢复：${target.name} 清除负面并 +${target.sp-before}SP`);
    if(typeof unitActed==='function') unitActed(u);
  }

  function genericKarmaAdrenaline(u){
    if(typeof updateStatusStacks === 'function') updateStatusStacks(u,'jixueStacks',(u.status.jixueStacks||0)+1,{label:'鸡血', type:'buff'});
    else u.status.jixueStacks=(u.status.jixueStacks||0)+1;
    const hp0=u.hp, sp0=u.sp;
    u.hp=Math.min(u.maxHp,u.hp+15);
    u.sp=Math.min(u.maxSp,u.sp+5);
    if(typeof syncSpBroken==='function') syncSpBroken(u);
    if(typeof showGainFloat==='function') showGainFloat(u,u.hp-hp0,u.sp-sp0);
    appendLog(`${u.name} 使用 肾上腺素：鸡血+1，恢复15HP/5SP`);
    if(typeof unitActed==='function') unitActed(u);
  }

  // Fix the selected-skill draw bug: selected skills are stored as library ids, while battle factories use Chinese keys.
  // buildSkillFactoriesForUnit already maps/filter selected keys, so drawOneSkill must draw from the returned factories directly.
  try{
    if(typeof drawOneSkill === 'function'){
      drawOneSkill = function(u){
        const fset = (typeof buildSkillFactoriesForUnit === 'function') ? buildSkillFactoriesForUnit(u) : [];
        const viable = (fset || []).filter(f=>{
          try{ return f && (!f.cond || f.cond()); }catch(e){ return false; }
        });
        if(viable.length===0) return null;
        for(let i=0;i<30;i++){
          const f=viable[Math.floor(Math.random()*viable.length)];
          if(Math.random() < (typeof f.prob==='number' ? f.prob : 1)) return f.make();
        }
        viable.sort((a,b)=>(b.prob||0)-(a.prob||0));
        return viable[0].make();
      };
    }
  }catch(e){ console.warn('[UnifiedFix] drawOneSkill patch failed', e); }

  // Add missing level-50 common skill factories to older/branch pages so every battle page reads the same player kit.
  try{
    if(typeof buildSkillFactoriesForUnit === 'function' && typeof skill === 'function'){
      const oldBuildSkillFactoriesForUnit = buildSkillFactoriesForUnit;
      buildSkillFactoriesForUnit = function(u){
        let F = oldBuildSkillFactoriesForUnit(u) || [];
        const base = baseIdOf(u);
        const add = (factory)=>{ if(factory && mayAddSelected(u,factory.key) && !hasFactory(F,factory.key)) F.push(factory); };
        if(base==='adora'){
          add({ key:'课本知识：刺杀一', prob:0.80, cond:()=>u.level>=50, make:()=> skill('课本知识：刺杀一',1,'green','四周2格瞬移到敌人后侧，10HP+5SP，拔出5HP+5SP+1层流血',
            (uu,aimDir,aimCell)=> range_square_n(uu,2).filter(p=>{ const t=getUnitAt(p.r,p.c); return t && t.side!==uu.side; }),
            (uu,target)=> (typeof adoraAssassination==='function' ? adoraAssassination(uu,target) : genericAdoraAssassination(uu,target)),
            {}, {castMs:1100}
          )});
          add({ key:'绽放（红色）', prob:0.20, cond:()=>u.level>=50 && !(u.skillPool||[]).some(s=>s.name==='绽放（红色）'), make:()=> skill('绽放（红色）',3,'red','队友攻击叠血色花蕾；主动引爆全部花蕾，真实伤害并治疗友方',
            (uu)=>[{r:uu.r,c:uu.c,dir:uu.facing}],
            (uu)=> (typeof adoraBloom==='function' ? adoraBloom(uu) : genericAdoraBloom(uu)),
            {aoe:true}, {castMs:1200}
          )});
        }
        if(base==='dario'){
          add({ key:'撕裂伤口', prob:0.80, cond:()=>u.level>=50, make:()=> skill('撕裂伤口',1,'green','前3格15HP+流血；若目标非满血，伤害+50%并额外流血；抽出利爪5HP',
            (uu,aimDir)=> aimDir ? range_forward_n(uu,3,aimDir) : everyDirectionRange(uu,(x,d)=>range_forward_n(x,3,d)),
            (uu,target)=> (typeof darioTearWound==='function' ? darioTearWound(uu,target) : genericDarioTearWound(uu,target)),
            {}, {castMs:950}
          )});
          add({ key:'状态恢复', prob:0.15, cond:()=>u.level>=50, make:()=> skill('状态恢复',2,'orange','全图选择友方，清除负面并+15SP',
            (uu)=> livingUnits().filter(t=>t.side===uu.side).map(t=>({r:t.r,c:t.c,dir:uu.facing})),
            (uu,aim)=> (typeof darioStatusRecovery==='function' ? darioStatusRecovery(uu,aim) : genericDarioStatusRecovery(uu,aim)),
            {}, {cellTargeting:true, castMs:900}
          )});
        }
        if(base==='karma'){
          add({ key:'肾上腺素', prob:0.20, cond:()=>u.level>=50 && !(u.skillPool||[]).some(s=>s.name==='肾上腺素'), make:()=> skill('肾上腺素',2,'white','主动：鸡血+1，恢复15HP/5SP；在手牌时支持拳头连段追击',
            (uu)=>[{r:uu.r,c:uu.c,dir:uu.facing}],
            (uu)=> (typeof karmaAdrenaline==='function' ? karmaAdrenaline(uu) : genericKarmaAdrenaline(uu)),
            {}, {castMs:850}
          )});
        }
        return F;
      };
    }
  }catch(e){ console.warn('[UnifiedFix] buildSkillFactories patch failed', e); }

  // Add Bloom passive only to older pages where native damageUnit did not know about it.
  try{
    const pageHasNativeBloomPassive = (typeof hasBloomInAnyPlayerPool === 'function');
    if(!pageHasNativeBloomPassive && typeof damageUnit === 'function'){
      const oldDamageUnit = damageUnit;
      damageUnit = function(id, hpDmg, spDmg, reason, sourceId=null, opts={}){
        const targetBefore = safe(()=>units[id], null);
        const hp0 = targetBefore ? targetBefore.hp : 0;
        const sp0 = targetBefore ? targetBefore.sp : 0;
        const ret = oldDamageUnit(id, hpDmg, spDmg, reason, sourceId, opts || {});
        const target = safe(()=>units[id], null);
        const source = sourceId ? safe(()=>units[sourceId], null) : null;
        if(source && target && source.side==='player' && target.side!==source.side && target.hp>0 && !opts?.ignoreBloomPassive){
          const didDamage = (target.hp < hp0) || (target.sp < sp0);
          if(didDamage && hasBloomCardInPlayerPool()){
            target.status = target.status || {};
            const current = target.status.bloodyBud || 0;
            if(current < 7){
              if(typeof updateStatusStacks === 'function') updateStatusStacks(target,'bloodyBud',current+1,{label:'血色花蕾', type:'debuff'});
              else target.status.bloodyBud=current+1;
              appendLog(`${source.name} 的攻击触发“绽放（红色）”：${target.name} +1层血色花蕾 (${current+1}/7)`);
            }
          }
        }
        return ret;
      };
    }
  }catch(e){ console.warn('[UnifiedFix] damageUnit patch failed', e); }


  // 黑瞬统一逻辑：文档要求“充能”生成3个墨片，友方踩完所有墨片后才给 Adora 额外技能“释放”。
  // 以前不同关卡有的直接给释放、有的释放只打15SP；这里统一修正为 3步、敌方最大SP 50% + 30SP。
  const BLACK_FLASH_STATE = globalThis.__GW_BLACK_FLASH_STATE__ || (globalThis.__GW_BLACK_FLASH_STATE__ = {
    shards: new Set(),
    ownerId: null,
  });
  function bfKey(r,c){ return `${r},${c}`; }
  function bfCellFromKey(k){ const [r,c]=String(k).split(',').map(Number); return {r,c}; }
  function bfCoveredKeysForUnit(u){
    if(typeof coveredKeysForUnit === 'function') return coveredKeysForUnit(u);
    if(!u) return [];
    const size = u.size || 1;
    const keys=[];
    for(let dr=0; dr<size; dr++) for(let dc=0; dc<size; dc++) keys.push(bfKey(u.r+dr,u.c+dc));
    return keys;
  }
  function bfCanUseCell(r,c){
    try{ if(typeof clampCell === 'function' && !clampCell(r,c)) return false; }catch(e){}
    try{ if(typeof isCoverCell === 'function' && isCoverCell(r,c)) return false; }catch(e){}
    try{ if(typeof getUnitAt === 'function' && getUnitAt(r,c)) return false; }catch(e){}
    if(BLACK_FLASH_STATE.shards.has(bfKey(r,c))) return false;
    return true;
  }
  function bfRandomEmptyCells(count){
    const cells=[];
    const maxR = (typeof ROWS === 'number') ? ROWS : 9;
    const maxC = (typeof COLS === 'number') ? COLS : 14;
    for(let r=1; r<=maxR; r++) for(let c=1; c<=maxC; c++) if(bfCanUseCell(r,c)) cells.push({r,c});
    for(let i=cells.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [cells[i],cells[j]]=[cells[j],cells[i]]; }
    return cells.slice(0,count);
  }
  function bfOwner(){
    const id = BLACK_FLASH_STATE.ownerId;
    if(id && units && units[id] && units[id].hp>0) return units[id];
    const candidates = livingUnits().filter(u=>baseIdOf(u)==='adora' && u.hp>0);
    return candidates[0] || null;
  }
  function bfHasRelease(u){ return !!(u && Array.isArray(u.skillPool) && u.skillPool.some(sk=>sk && sk.name==='黑瞬「释放」')); }
  function bfReleaseSkill(){
    return skill('黑瞬「释放」', 3, 'purple', '敌方全体受到其最大SP的50%+30SP伤害（不受掩体）',
      (uu)=>[{r:uu.r,c:uu.c,dir:uu.facing}],
      (uu)=>{
        const enemies = enemiesOf(uu);
        if(enemies.length===0){ appendLog('黑瞬「释放」：场上没有敌方单位'); if(typeof unitActed==='function') unitActed(uu); return; }
        for(const t of enemies){
          const spDmg = Math.floor((t.maxSp || 0) * 0.5) + 30;
          damageUnit(t.id, 0, spDmg, `${uu.name} 黑瞬「释放」命中 ${t.name}`, uu.id, {ignoreCover:true});
        }
        BLACK_FLASH_STATE.ownerId = null;
        appendLog(`${uu.name} 使用 黑瞬「释放」：敌方全体受到最大SP 50% + 30SP`);
        if(typeof unitActed==='function') unitActed(uu);
      },
      {aoe:true},
      {castMs:900, extraSkill:true}
    );
  }
  function bfGrantReleaseToOwner(){
    const owner = bfOwner();
    if(!owner || bfHasRelease(owner)) return;
    owner.skillPool = owner.skillPool || [];
    owner.skillPool.push(bfReleaseSkill());
    appendLog(`${owner.name} 收集完所有墨片，获得额外技能：黑瞬「释放」`);
    try{ renderAll(); }catch(e){}
  }
  function bfSpawnShards(u){
    if(!u || u.hp<=0) return;
    if(BLACK_FLASH_STATE.shards.size>0){ appendLog('黑瞬「充能」：场上仍有墨片，不能重复生成'); if(typeof unitActed==='function') unitActed(u); return; }
    if(bfHasRelease(u)){ appendLog('黑瞬「充能」：已经拥有“释放”，不能重复充能'); if(typeof unitActed==='function') unitActed(u); return; }
    const cells = bfRandomEmptyCells(3);
    for(const cell of cells) BLACK_FLASH_STATE.shards.add(bfKey(cell.r,cell.c));
    BLACK_FLASH_STATE.ownerId = u.id;
    appendLog(`${u.name} 使用 黑瞬「充能」：生成 ${cells.length} 个墨片。友方踩完后解锁“释放”。`);
    if(typeof renderAll==='function') renderAll();
    if(typeof unitActed==='function') unitActed(u);
  }
  function bfPickupForUnit(u){
    if(!u || u.hp<=0 || BLACK_FLASH_STATE.shards.size===0) return;
    const owner = bfOwner();
    const ownerSide = owner ? owner.side : u.side;
    if(u.side !== ownerSide) return;
    let picked=0;
    for(const key of bfCoveredKeysForUnit(u)){
      if(BLACK_FLASH_STATE.shards.delete(key)) picked++;
    }
    if(picked>0){
      appendLog(`${u.name} 拾取了 ${picked} 个墨片（剩余 ${BLACK_FLASH_STATE.shards.size}）`);
      if(BLACK_FLASH_STATE.shards.size===0) bfGrantReleaseToOwner();
      else if(typeof renderAll==='function') renderAll();
    }
  }
  function bfPaintShards(){
    if(!BLACK_FLASH_STATE.shards || BLACK_FLASH_STATE.shards.size===0) return;
    for(const key of BLACK_FLASH_STATE.shards){
      const {r,c}=bfCellFromKey(key);
      try{
        const el = typeof getCellEl === 'function' ? getCellEl(r,c) : null;
        if(el) el.classList.add('black-flash-shard');
      }catch(e){}
    }
  }
  try{
    const style=document.createElement('style');
    style.textContent='.cell.black-flash-shard{position:relative;box-shadow:inset 0 0 0 2px rgba(70,35,130,.95),0 0 18px rgba(80,40,180,.65)!important}.cell.black-flash-shard::after{content:"墨";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-weight:900;color:#f3e9ff;text-shadow:0 0 8px #7b4dff,0 0 14px #000;font-size:18px;pointer-events:none}';
    document.head.appendChild(style);
  }catch(e){}
  try{
    if(typeof renderAll === 'function'){
      const oldRenderAll = renderAll;
      renderAll = function(){ const ret = oldRenderAll.apply(this, arguments); bfPaintShards(); return ret; };
    }
  }catch(e){ console.warn('[UnifiedFix] black render patch failed', e); }
  try{
    if(typeof registerUnitMove === 'function'){
      const oldRegisterUnitMove = registerUnitMove;
      registerUnitMove = function(u){ const ret = oldRegisterUnitMove.apply(this, arguments); bfPickupForUnit(u); return ret; };
    }
  }catch(e){ console.warn('[UnifiedFix] black pickup patch failed', e); }
  try{
    if(typeof grantBlackFlashRelease === 'function') grantBlackFlashRelease = function(u){ bfGrantReleaseToOwner(); };
    if(typeof adoraBlackFlashCharge === 'function') adoraBlackFlashCharge = function(u){ bfSpawnShards(u); };
  }catch(e){ console.warn('[UnifiedFix] black function patch failed', e); }
  try{
    if(typeof buildSkillFactoriesForUnit === 'function'){
      const oldBFBuild = buildSkillFactoriesForUnit;
      buildSkillFactoriesForUnit = function(u){
        const F = oldBFBuild(u) || [];
        for(const f of F){
          if(f && f.key === '黑瞬「充能」'){
            const oldCond = f.cond || (()=>true);
            f.cond = ()=> oldCond() && BLACK_FLASH_STATE.shards.size===0 && !bfHasRelease(u);
          }
        }
        return F;
      };
    }
  }catch(e){ console.warn('[UnifiedFix] black factory patch failed', e); }

  document.addEventListener('DOMContentLoaded', ()=>{
    try{ if(typeof appendLog==='function') appendLog('统一战斗逻辑补丁已加载：技能抽取/通用技能/绽放被动已同步。'); }catch(e){}
  });
})();
