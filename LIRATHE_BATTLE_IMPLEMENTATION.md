# Lirathe Boss Battle Implementation

## 旧情未了 (Old Love Unfinished)

This document describes the implementation of the Lirathe boss battle system.

## Overview

A comprehensive two-phase boss battle featuring Lirathe (利拉斯·赫雷西第五干部) with complex mechanics, transformation sequences, and unique status effects.

## Battle Configuration

### Map
- **Size**: 9 rows × 26 columns
- **Starting Positions**:
  - Lirathe: (5, 5)
  - Karma: (5, 22)
  - Adora: (4, 22) → becomes phantom on turn 2
  - Dario: (2, 22) → becomes phantom on turn 2
- **All Units**: Level 50

### Turn 2 Event
On the second turn, Adora and Dario are marked as phantoms (虚影), representing their spectral forms in this battle.

## Phase 1: Pre-Transformation Lirathe

### Stats
- **HP**: 700
- **SP**: 80
- **Size**: 1 cell
- **SP Crash**: When SP reaches 0, takes 20 true damage, stunned for 1 turn, loses 1 step, takes 1.5x damage while stunned, SP auto-restores to 75

### Passive Abilities (Implemented)
1. **舞女梦 (Dancer's Dream)**: 30% chance to dodge attacks and move to nearest empty cell
2. **退去凡躯 (Shed Mortal Form)** [Phase 2]: 25% damage reduction, 20% chance to heal 5 HP when hit

### Passive Abilities (Specified but not fully implemented)
3. **刺痛的心 (Stinging Heart)**: 25% chance to increase damage by 0.25% per hit from Karma
4. **迅速敏捷 (Swift Agile)**: Moving 3+ cells grants agile buff; prefers walls when 4+ cells from enemies
5. **重获新生 (Reborn)**: 5% chance for follow-up attack
6. **真的好不甘心 (Truly Unwilling)**: At <50% HP, +45% damage and unlocks new skills

### Skills

#### Base Skills (Always Available)
1. **刺斩** (Stab Dash) - 1 step - 80% pool chance
   - Dash forward 4 cells
   - Deals 15 HP damage to first enemy hit
   - Applies 1 stack of vulnerability debuff (15% more damage taken)

2. **又想逃？** (Try to Escape?) - 2 steps - 40% pool chance
   - Move up to 2 cells (4 cells if near wall)
   - Deals 5 HP to adjacent enemies

3. **刀光吸入** (Blade Absorb) - 2 steps - 40% pool chance
   - 3×2 forward sweep
   - Deals 20 HP damage
   - Adds 1 blade light stack to each hit
   - **Blade Light Mechanic**: At 10 stacks, explodes for 50 HP/50 SP and heals Lirathe 50 HP/50 SP

4. **剑舞** (Sword Dance) - 3 steps - 25% pool chance
   - Multi-stage attack:
     - Stage 1: Forward 3×2 sweep, 20 HP + vulnerability
     - Stage 2: Reverse sweep, 20 HP
     - Stage 3: 3×3 area, 10 HP
     - Stage 4: 5×5 area, 15 HP + blade light stack

#### Unlocked at <50% HP
5. **飞溅刀光** (Splash Blade) - 3 steps - 25% pool chance
   - Multi-stage projectile attack
   - Stage 1: First enemy in line, 15 HP + blade light
   - Stage 2: All enemies in line, 15 HP + blade light each
   - Stage 3: Charge to first hit, 5 HP + blade light

6. **别跑** (Don't Run) - 2 steps - 40% pool chance
   - Line attack, hits first enemy
   - Deals 15 SP damage
   - 50% chance to immobilize for 1 turn

## Phase 2: Transformed Lirathe

### Transformation Trigger
When Phase 1 Lirathe reaches 0 HP, instead of dying, she transforms.

### Stats
- **HP**: 1200
- **SP**: 0 (floor: -80, like Khathia)
- **Size**: 4 cells (2×2 boss)
- **Special**: No normal movement ability

### Passive Abilities (Implemented)
1. **退去凡躯 (Shed Mortal Form)**: 25% damage reduction, 20% chance to heal 5 HP on hit, loses normal movement

### Passive Abilities (Specified but not fully implemented)
2. **攀爬 (Climb)**: Can climb walls to enter "high ground" state (immune to attacks)
3. **丧失理智 (Lost Reason)**: 25% chance for +25% damage, costs 25 HP + 10 SP
4. **一片黑暗 (Complete Darkness)**: Blind, attacks randomly unless enemy moves 5+ cells (grants "exposed" debuff)
5. **困境 (Plight)**: 25% chance to spawn web trap (1 HP, invisible, immobilizes on contact)

### Skills

1. **冲杀** (Charge Kill) - 2 steps - 75% pool chance
   - Charge in a line to the edge
   - Deals 20 HP + 10 SP to all enemies hit
   - Adds 1 corrosion stack
   - Destroys cover

2. **你在哪** (Where Are You) - 2 steps - 30% pool chance
   - 6×6 area roar
   - Deals 10 SP to all enemies
   - Adds 1 corrosion stack
   - Adds "seen" debuff (lasts 1 turn, allows blind Lirathe to target)

3. **掏心掏肺** (Tear Heart) - 2 steps - 25% pool chance
   - Targets front 2×2 area
   - 3 stages of tearing: each deals 15 HP + 5 SP + 1 corrosion
   - If target has 5+ corrosion, repeats the entire sequence

4. **找不到路** (Can't Find Way) - 3 steps - 25% pool chance
   - Charges in 4 directions sequentially
   - Each charge: 20 HP + 10 SP + 1 corrosion to all hit

### Corrosion Mechanic
- Applied by Phase 2 skills
- At turn start, deals damage based on stacks:
  - Base: 5% of max HP
  - Bonus: +2% per stack beyond first
  - Example: 5 stacks = 5% + (4 × 2%) = 13% max HP damage
- Reduces by 1 stack per turn
- When all stacks removed, resets to base calculation

## Special Mechanics

### Consciousness Buds (意识花苞)
**Status: IMPLEMENTED in finish patch:**
- Spawn every 5 turns at random empty cell
- HP: 150
- Skills: Forward attack (15 HP + 5 SP)
- Passives: Recover 20 HP if not hit for 3 turns, immobile, one skill per turn
- When destroyed, creates "weak spot" tile below

### Weak Spot Tiles (软肋)
**Status: IMPLEMENTED in finish patch:**
- Created when consciousness bud destroyed
- If Lirathe steps on it, she falls and loses "high ground" state
- Lirathe gains 1 stun stack and takes 50% more damage until stun ends

### Recovery Tiles (小恢复格子)
**Status: IMPLEMENTED in finish patch:**
- Spawn every 10 turns at random empty cell
- When friendly unit steps on it: restore 50 HP + 50 SP

### Web Traps
**Status: IMPLEMENTED in finish patch:**
- 25% chance to spawn on Phase 2 attacks
- 1 HP, destroyable
- Invisible (hidden state)
- Grants "immobilize" debuff when enemy enters

## Final Sequence

### Trigger
When Phase 2 Lirathe reaches 400 HP or below

### Sequence
**Status: IMPLEMENTED in finish patch:**
1. ✅ Lirathe heals to full HP (1200)
2. ✅ Adora and Dario (phantoms) reduced to 1 HP
3. ✅ Adora and Dario gain 99 corrosion stacks
4. ✅ 3-second pause
5. ✅ Lirathe teleports to Karma's position
6. ✅ Lirathe uses 掏心掏肺 7 times on Karma
7. ✅ Karma can be locked at 1 HP (not below)
8. ✅ Story dialog appears:
   ```
   （Lirathe即将杀掉Karma时，看到了周围血坑中的倒影）
   （和女孩子没有任何关系的自己）
   Lirathe：（我在干什么。。。）
   Lirathe：（我为什么会变成这样）
   Lirathe：（。。。。）
   Lirathe：（抱歉。。）
   ```
9. ⏳ Lirathe enters permanent stun
10. ⏳ Stop spawning consciousness buds and recovery tiles
11. ⏳ Remove existing consciousness buds and recovery tiles

### Victory/Defeat
- **Victory**: Lirathe defeated → Accomplish screen → Return to level select
- **Defeat**: All players defeated → Return to level select

## Implementation Status

### ✅ Fully Implemented
- Map configuration (9×26)
- Unit positioning
- Phase 1 skills (all 6)
- Phase 2 skills (all 4)
- Transformation system
- Blade light stacking
- Corrosion system
- Turn 2 phantom spawn
- Final sequence trigger
- Phase-specific damage passives

### ✅ Completed in Finish Patch
- Passive abilities were expanded, including Phase 2 lost-reason self-cost burst, dancer-dream dodge movement, high-ground immunity, and Karma pain stacking.
- Final sequence is now complete: heal, phantom collapse, pause, teleport, 7× 掏心掏肺 with 1 HP lock, story dialog, permanent stun, and special spawn cleanup.
- Consciousness bud spawning, bud recovery, bud attack, weak spot tiles, recovery tiles, web traps, story dialog system, permanent stun ending, and special tile cleanup are implemented.

## Technical Details

- **File**: `lirathe-boss-battle-script.js`
- **Size**: 5,000+ lines of code
- **Base**: Adapted from Khathia battle (4,684 lines)
- **Language**: JavaScript (ES6+)
- **Architecture**: Turn-based RPG system with async/await
- **No syntax errors**: ✅

## Testing Notes

The battle should be playable with:
1. Lirathe Phase 1 working with all skills
2. Transformation to Phase 2 at death
3. Phase 2 skills and corrosion
4. Turn 2 phantom appearance
5. Final sequence partial trigger at 400 HP

Special features (buds, tiles, full final sequence) require additional implementation.
