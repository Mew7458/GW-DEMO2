# Current bugfix pass — Lirathe / Black Flash / Bleed / Skill Colors

## Fixed
- Added gray skill slots to the main skill-selection UI so `枪击` can be selected and saved as a gray card instead of disappearing from selected-skill filtering.
- Battle scripts now read the gray selected-skill slot in addition to green/blue/pink/white/red/purple/orange.
- All battle `枪击` cards are now gray at runtime and in source definitions.
- Runtime skill-constructor patch enforces canonical player skill colors across every battle page.
- Added runtime CSS for gray and purple battle cards so their colors show even on older pages.
- Black Flash remains unified: Charge creates 3 ink shards; ally pickup of all shards grants Release; Release costs 3 steps and deals each enemy maxSP*50%+30 SP damage.
- Lirathe high-ground state is now document-compliant: direct attacks cannot hit her while high up, including true-damage attacks; ongoing/self/environment damage can still resolve.
- Lirathe no longer naturally falls from high ground after one turn. She falls from soft-spot, SP fatigue crash, or final sequence logic.
- Lirathe SP fatigue crash now clears high ground and its self-damage bypasses high-ground immunity.
- Zai battle Haz-bleed now uses `status.hazBleedTurns` consistently, fixing the hidden field mismatch that could prevent Haz bleed from ticking.

## Still intentionally special
- Normal bleed remains the unified strength-queue system: damage = total bleed strength × 5 HP at the unit-side turn start, then one layer is consumed.
- Haz bleed remains a special two-turn maxHP% bleed and is not merged into normal bleed.
- Corrosion remains Lirathe-specific and separate from bleed.
