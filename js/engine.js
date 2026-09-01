/* ============================================================
   FANOHGE — The Marianas Saga  ·  engine.js
   State, turn processing, economy, events, governance
   ============================================================ */
/* global ERAS, ERA_BY_ID, ISLAND_DEFS, ISLAND_ORDER, BUILDING_DEFS, INDUSTRIES, POLICIES, EVENTS, RANDOM_EVENTS, clamp, UI, AudioMgr, localStorage, window */


const SAVE_KEY = "fanohge_save_v1";
const S = {
  version: 1,
  year: 1300, turn: 0, era: "ancient",
  timeSpeed: 1,
  res: { food: 80, wood: 40, stone: 20, gold: 0 },
  happiness: 70, culture: 70, military: 8, selfSufficiency: 25,
  islands: {},
  flags: {},
  history: [],
  pending: null,
  gov: { path: null, meter: 0, policies: {}, research: {} },
  stats: { lowHappinessTurns: 0, decisions: 0 },
  over: false, outcome: null,
  industryUnlocked: false,
  relationsGuam: 0, reputation: 0,
  eraChanged: false,
  eraChangedEra: null,
};
let lastYpt = 2; // years actually advanced last turn (speed-scaled)

/* ---------------- init ---------------- */
function newGame(){
  S.year = 1300; S.turn = 0; S.era = "ancient";
  S.res = { food: 80, wood: 40, stone: 20, gold: 0 };
  S.happiness = 70; S.culture = 70; S.military = 8; S.selfSufficiency = 25;
  S.gov = { path: null, meter: 0, policies: {} };
  S.stats = { lowHappinessTurns: 0, decisions: 0 };
  S.over = false; S.outcome = null;
  S.industryUnlocked = false; S.relationsGuam = 0; S.reputation = 0;
  S.eraChanged = false; S.eraChangedEra = null;
  S.raidHeat = 0;
  S.pending = null; S.flags = {}; S.history = [];
  initIslands();
  log("1300", "ancient", "The village of Agingan rises on the western shore of Saipan. A thousand-year saga begins.", true);
  log("1300", "ancient", "To the south, Guåhan — the largest island of the chain — is home to the greatest of the Chamorro villages. Your canoes can reach it whenever you choose.", true);
  // starter era music (no-op if assets or AudioMgr absent)
  try { if (typeof AudioMgr !== "undefined") AudioMgr.playEra("ancient"); } catch(e){}
}

function initIslands(){
  S.islands = {};
  for (const id of ISLAND_ORDER){
    S.islands[id] = {
      pop: 0,
      buildings: {},
      industry: null,
      industryLvl: 0,
      accessible: (id === "saipan" || id === "guam"),
      depopulated: false,
    };
  }
  S.islands.saipan.pop = 120;
  S.islands.guam.pop = 150;
}

function saveGame(){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch(e){}
}
function loadGame(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return false;
    for (const k in S) if (k !== "version" && data[k] !== undefined) S[k] = data[k];
    return true;
  } catch(e){ return false; }
}
function clearSave(){ try { localStorage.removeItem(SAVE_KEY); } catch(e){} }

/* ---------------- helpers ---------------- */
function eraIdx(){ return ERAS.findIndex(e => e.id === S.era); }
function curEra(){ return ERA_BY_ID[S.era]; }
function accessibleIslands(){ return ISLAND_ORDER.filter(id => S.islands[id].accessible); }
function totalPop(){
  return accessibleIslands().reduce((a, id) => a + S.islands[id].pop, 0);
}
function baseHousing(def){
  if (def.size >= 3) return 90;
  if (def.size >= 2) return 80;
  if (def.size >= 1) return 60;
  return 40;
}
function islandCap(id){
  const def = ISLAND_DEFS[id];
  let cap = baseHousing(def);
  const isl = S.islands[id];
  for (const b in isl.buildings){
    const bd = BUILDING_DEFS[b];
    if (bd && bd.effects.housing) cap += bd.effects.housing * isl.buildings[b];
  }
  return cap;
}
/* per-island per-turn production */
function islandIncome(id){
  const def = ISLAND_DEFS[id];
  const isl = S.islands[id];
  const inc = { food: 0, wood: 0, stone: 0, gold: 0, housing: 0, culture: 0, approval: 0, military: 0, popGrowth: 0, selfSufficiency: 0 };
  // base yields
  inc.food = def.fish * 4 + def.fert * 2;
  inc.wood = def.forest * 2;
  inc.stone = def.stone * 1;
  if (def.special === "fertile") inc.food += 3;      // Tinian
  if (def.special === "stone") inc.stone += 2;       // Rota
  if (def.special === "capital") inc.gold += 1;      // Guam
  // buildings
  for (const b in isl.buildings){
    const bd = BUILDING_DEFS[b];
    if (!bd) continue;
    const n = isl.buildings[b];
    const fx = bd.effects;
    for (const key in fx) inc[key] += fx[key] * n;
  }
  // industry specialization (future era)
  if (S.industryUnlocked && isl.industry && isl.industryLvl > 0){
    const ind = INDUSTRIES[isl.industry];
    for (const key in ind.perLvl) inc[key] += ind.perLvl[key] * isl.industryLvl;
  }
  // development discount: smaller islands slightly less efficient is already baked
  return inc;
}
function sumIncome(){
  const total = { food: 0, wood: 0, stone: 0, gold: 0, housing: 0, culture: 0, approval: 0, military: 0, popGrowth: 0, selfSufficiency: 0 };
  for (const id of accessibleIslands()){
    const inc = islandIncome(id);
    for (const k in total) total[k] += inc[k];
  }
  return total;
}
/* what the treasury actually gains per turn — mirrors processEconomy + processGovernance */
function turnIncome(){
  const inc = sumIncome();
  const pop = totalPop();
  const era = curEra();
  const yf = Math.max(1, lastYpt / 2);
  const cons = Math.ceil(pop / 6);
  let gold = inc.gold + Math.floor(pop / 60) + era.drift.gold * yf;
  for (const pid in S.gov.policies){
    const p = POLICIES[pid];
    if (!p) continue;
    gold -= p.upkeep;
    gold += (p.effects.gold || 0) * yf;
  }
  return {
    food: inc.food - cons,          // net food after the population eats
    foodGross: inc.food,
    foodCons: cons,
    wood: inc.wood,
    stone: inc.stone,
    gold: Math.floor(gold),
  };
}
function totalCap(){
  return accessibleIslands().reduce((a, id) => a + islandCap(id), 0);
}
function nationName(){
  if (S.flags.nationality === "chamorro") return "the Chamorro Republic of the Marianas";
  if (S.flags.nationality === "chamolinian") return "the Chamolinian Commonwealth of the Pacific";
  return "the Republic of the Marianas";
}
function nationalize(text){
  return String(text).replace(/\{nation\}/g, nationName());
}
function log(year, era, text, hot){
  text = nationalize(text);
  S.history.push({ year: String(year), era: era || S.era, text, hot: !!hot });
  if (S.history.length > 400) S.history.splice(0, S.history.length - 400);
}

/* ---------------- effects application ---------------- */
function applyFx(fx, eventId){
  if (!fx) return;
  if (fx.food) S.res.food += fx.food;
  if (fx.wood) S.res.wood += fx.wood;
  if (fx.stone) S.res.stone += fx.stone;
  if (fx.gold) S.res.gold += fx.gold;
  if (fx.happiness) S.happiness = clamp(S.happiness + fx.happiness, 0, 100);
  if (fx.culture) S.culture = clamp(S.culture + fx.culture, 0, 100);
  if (fx.military) S.military = clamp(S.military + fx.military, 0, 999);
  if (fx.selfSufficiency) S.selfSufficiency = clamp(S.selfSufficiency + fx.selfSufficiency, 0, 100);
  if (fx.reputation) S.reputation += fx.reputation;
  if (fx.relationsGuam) S.relationsGuam += fx.relationsGuam;
  if (fx.pop) S.islands.saipan.pop = Math.max(0, S.islands.saipan.pop + fx.pop);
  if (fx.popIsland){
    for (const id in fx.popIsland){
      if (!S.islands[id]) continue;
      S.islands[id].accessible = true; // a pop grant implies access
      S.islands[id].depopulated = false;
      S.islands[id].pop = Math.max(0, S.islands[id].pop + fx.popIsland[id]);
    }
  }
  if (fx.unlockIslands){
    for (const id of fx.unlockIslands){
      if (!S.islands[id]) continue;
      S.islands[id].accessible = true;
      S.islands[id].depopulated = false;
      if (id === "tinian") { S.islands.aguijan.accessible = true; S.islands.aguijan.depopulated = false; }
    }
  }
  if (fx.lockIslands){
    for (const id of fx.lockIslands){
      if (S.islands[id]) S.islands[id].accessible = false;
    }
  }
  if (fx.setAccessible){
    for (const id in fx.setAccessible){
      if (S.islands[id]){ S.islands[id].accessible = !!fx.setAccessible[id]; if (fx.setAccessible[id]) S.islands[id].depopulated = false; }
    }
  }
  if (fx.movePop){
    const m = fx.movePop;
    const src = m.from.filter(id => S.islands[id]);
    const available = src.reduce((a, id) => a + S.islands[id].pop, 0);
    const moved = Math.round(available * (m.pct !== undefined ? m.pct : 1));
    let remaining = moved;
    for (const id of src){
      const take = Math.min(S.islands[id].pop, remaining);
      S.islands[id].pop -= take; remaining -= take;
    }
    if (!S.islands[m.to]) S.islands[m.to] = { pop: 0, buildings: {}, industry: null, industryLvl: 0, accessible: true, depopulated: false };
    S.islands[m.to].accessible = true;
    S.islands[m.to].depopulated = false;
    S.islands[m.to].pop += moved - remaining;
  }
  // several ordered population moves (each applied to the current totals)
  if (fx.movePops){
    for (const m of fx.movePops){
      const src = m.from.filter(id => S.islands[id]);
      const available = src.reduce((a, id) => a + S.islands[id].pop, 0);
      const moved = Math.round(available * (m.pct !== undefined ? m.pct : 1));
      let remaining = moved;
      for (const id of src){
        const take = Math.min(S.islands[id].pop, remaining);
        S.islands[id].pop -= take; remaining -= take;
      }
      if (!S.islands[m.to]) S.islands[m.to] = { pop: 0, buildings: {}, industry: null, industryLvl: 0, accessible: true, depopulated: false };
      S.islands[m.to].accessible = true;
      S.islands[m.to].depopulated = false;
      S.islands[m.to].pop += moved - remaining;
    }
  }
  // depopulate AFTER movePop so the moved population isn't wiped first
  if (fx.depopulateIslands){
    for (const id of fx.depopulateIslands){
      if (S.islands[id]){ S.islands[id].pop = 0; S.islands[id].depopulated = true; }
    }
  }
  if (fx.guamReunify){
    /* Guam has run its own economy for decades — it arrives as a developed
       island: population and infrastructure proportional to the most
       developed accessible island, plus its real-world military bases. */
    let refPop = 0, refBuildings = {};
    for (const id of accessibleIslands()){
      const isl = S.islands[id];
      if (id === "guam") continue;
      if (isl.pop > refPop){ refPop = isl.pop; refBuildings = Object.assign({}, isl.buildings); }
    }
    const guam = S.islands.guam;
    guam.accessible = true;
    guam.depopulated = false;
    guam.pop = Math.max(refPop, 150);
    const scale = guam.pop / Math.max(refPop, 1);
    for (const b in refBuildings){
      const add = Math.max(1, Math.round((refBuildings[b] || 0) * scale * 0.85));
      guam.buildings[b] = (guam.buildings[b] || 0) + add;
    }
    // guaranteed baseline so Guam always functions on its own
    const basics = {
      guma: Math.max(8, Math.round(guam.pop / 12)),
      corn_field: 3, fishtrap: 3,
      water_system: 1, road: 2, asphalt_roads: 2,
      port_wharf: 1, power_plant: 1, power_grid: 1, telecom: 1,
      hospital: 1, high_school: 1, cultural_center: 1,
      military_base: 1, naval_base: 1,
    };
    for (const b in basics) guam.buildings[b] = Math.max(guam.buildings[b] || 0, basics[b]);
    log(String(S.year), S.era, "Guam arrives with a population of " + guam.pop + " and its full infrastructure — Andersen Air Base and Naval Base Apra Harbor included.", true);
  }
  if (fx.raiderRaid){
    /* Periodic raids — the Military score is the nation's shield.
       Raid power scales with the nation's size & wealth (bigger, richer
       targets attract bigger raids) plus ±15% variance, so a raid always
       has a chance to test even a strong defense. Three bands:
         military >= power          → driven off cleanly
         power > military >= 0.6p   → beaten back at a cost
         military < 0.6p            → the full raid: deaths, theft, burning */
    const r = fx.raiderRaid;
    const pop = totalPop();
    const def = S.military;
    // bigger, richer, and more heavily armed nations attract bigger raids —
    // but each point of military still nets +0.5 of protection, so investing
    // in defense always pays; the ±15% variance keeps even top defenses honest.
    // Population scales WITHOUT a cap (a huge nation is a huge target), and a
    // persistent escalation pool emboldens raiders after every clean repel, so
    // no military level — not even maxed — is ever permanently immune.
    const heat = S.raidHeat || 0;
    let power = (r.power || 40) + Math.round(pop / 12) + Math.min(40, Math.floor(S.res.gold / 10)) + Math.round(def * 0.5) + heat;
    power = Math.max(10, Math.round(power * (0.85 + Math.random() * 0.3)));
    if (def >= power){
      // band 1 — driven off (raiders grow bolder for next time)
      S.happiness = clamp(S.happiness + 2, 0, 100);
      S.military = clamp(S.military + 1, 0, 999);
      S.raidHeat = Math.min(400, heat + 25 + Math.round(power * 0.04));
      log(String(S.year), S.era, "⚔️ " + r.title + " — the raiders are driven off! (military " + def + " vs raiders " + power + ")", false);
    } else if (def >= power * 0.65){
      // band 2 — hard-won defense (raiders were beaten but learned the defenses)
      const deficit = power - def;
      const killed = Math.max(1, Math.round(pop * Math.min(0.04, (deficit / power) * 0.04)));
      losePop(killed);
      const stolen = Math.min(S.res.food, Math.max(2, Math.round(6 + deficit * 0.35)));
      S.res.food = Math.max(0, S.res.food - stolen);
      S.happiness = clamp(S.happiness - 3, 0, 100);
      S.military = clamp(S.military + 2, 0, 999);
      S.raidHeat = Math.min(400, heat + 8);
      log(String(S.year), S.era, "⚔️ " + r.title + " — beaten back at a cost: " + killed + " perish and " + stolen + " food is taken (military " + def + " vs raiders " + power + ").", true);
    } else {
      // band 3 — the full raid (the raiders take their loot and go home)
      const deficit = power - def;
      const killed = Math.max(1, Math.round(pop * Math.min(0.10, (deficit / power) * 0.08)));
      losePop(killed);
      const stolen = Math.min(S.res.food, Math.max(3, Math.round(12 + deficit * 0.7)));
      S.res.food = Math.max(0, S.res.food - stolen);
      S.happiness = clamp(S.happiness - 6, 0, 100);
      S.military = clamp(S.military - 2, 0, 999);
      S.raidHeat = 0;
      let burned = null;
      if (Math.random() < 0.35){
        const victims = [];
        for (const id of accessibleIslands()){
          const isl = S.islands[id];
          for (const b in isl.buildings) victims.push([id, b, isl.buildings[b]]);
        }
        if (victims.length){
          const pick = victims[Math.floor(Math.random() * victims.length)];
          S.islands[pick[0]].buildings[pick[1]] = pick[2] - 1;
          if (S.islands[pick[0]].buildings[pick[1]] <= 0) delete S.islands[pick[0]].buildings[pick[1]];
          burned = (BUILDING_DEFS[pick[1]] ? BUILDING_DEFS[pick[1]].name : pick[1]) + " on " + ISLAND_DEFS[pick[0]].name;
        }
      }
      log(String(S.year), S.era, "⚔️ " + r.title + " — " + killed + " people perish and " + stolen + " food is taken (military " + def + " vs raiders " + power + ")." + (burned ? " The raiders burn a " + burned + "." : ""), true);
    }
  }
  if (fx.unlockBuilding){ S.flags["b_" + fx.unlockBuilding] = true; }
  if (fx.govPath) S.gov.path = fx.govPath;
  if (fx.govMeter) S.gov.meter = clamp(S.gov.meter + fx.govMeter, -100, 100);
  if (fx.era){ S.era = fx.era; S.eraChanged = true; S.eraChangedEra = fx.era; }
  if (fx.revealIndustry) S.industryUnlocked = true;
  if (fx.flags) for (const f in fx.flags) S.flags[f] = fx.flags[f];
  if (fx.stats) for (const k in fx.stats) S.stats[k] = fx.stats[k];
  if (fx.historyNote) log(String(S.year), S.era, fx.historyNote, true);
  if (fxChanceResolve && fxChanceResolve.text) log(String(S.year), S.era, fxChanceResolve.text, true);
  if (fx.text) log(String(S.year), S.era, fx.text, true);
}

/* ---------------- events ---------------- */
function checkStoryEvents(){
  const nowIdx = eraIdx();
  for (const ev of EVENTS){
    // Events from the current or any PAST era may fire once their year
    // arrives — this catches years skipped by fast turns (e.g. jumping
    // 1897 → 1899 still fires the Spanish-American War & Guam's cession).
    const evIdx = ERAS.findIndex(e => e.id === ev.era);
    if (evIdx > nowIdx) continue;
    if (S.flags["e_" + ev.id]) continue;
    if (ev.year !== undefined && S.year < ev.year) continue;
    if (ev.minYear !== undefined && S.year < ev.minYear) continue;
    if (ev.maxYear !== undefined && S.year > ev.maxYear) continue;
    if (ev.after && !S.flags["e_" + ev.after]) continue;
    if (ev.flags && !ev.flags.every(f => S.flags[f])) continue;
    if (ev.notFlags && ev.notFlags.some(f => S.flags[f])) continue;
    fireEvent(ev);
    return true;
  }
  return false;
}

let fxChanceResolve = null;

function fireEvent(ev){
  S.flags["e_" + ev.id] = true;
  S.stats.decisions++;
  if (ev.onEnter) applyFx(ev.onEnter);
  log(String(S.year), S.era, ev.title + " — " + firstSentence(ev.text), true);
  const pulse = boardPulse(ev.id);
  if (pulse && window.Board) window.Board.pulse(pulse);
  if (ev.choices && ev.choices.length){
    S.pending = ev;
    return;
  }
  // no choices: roll fxChance if present
  if (ev.fxChance){
    const roll = Math.random();
    let acc = 0;
    for (const c of ev.fxChance){
      acc += c.chance;
      if (roll <= acc){
        fxChanceResolve = c;
        applyFx(c.fx);
        fxChanceResolve = null;
        break;
      }
    }
  }
}

function firstSentence(text){
  const t = text.replace(/\n+/g, " ").trim();
  const i = t.indexOf(". ");
  return i > 40 ? t.slice(0, i + 1) : t.slice(0, 130);
}

/* map a story event id to a 3D board pulse */
function boardPulse(id){
  if (!id) return null;
  if (/typhoon|storm/.test(id)) return "typhoon";
  if (/battle|war|attack|invasion|raid|siege/.test(id)) return "battle";
  if (/contact|magellan|discover|arrival|first_visit|galleon|whaler/.test(id)) return "discovery";
  return null;
}

function chooseDecision(index){
  if (!S.pending) return;
  const ev = S.pending;
  const choice = ev.choices[index];
  if (!choice) return;
  S.pending = null;
  S.stats.decisions++;
  // always apply the base fx first (e.g. flags)
  applyFx(choice.fx);
  // chance-based choice
  if (choice.fxChance){
    const roll = Math.random();
    let acc = 0; let chosen = null;
    for (const c of choice.fxChance){
      acc += c.chance;
      if (roll <= acc){ chosen = c; break; }
    }
    if (chosen){
      fxChanceResolve = chosen;
      applyFx(chosen.fx);
      fxChanceResolve = null;
    }
  }
  if (choice.text) log(String(S.year), S.era, choice.text, true);
  UI.toast(choice.label, "✅");
  UI.refresh();
  continueEvents();
}

/* ---------------- turn processing ---------------- */
function endTurn(){
  if (S.pending || S.over) return;
  S.turn++;
  const era = curEra();
  const ypt = Math.max(1, Math.round(era.ypt * (S.timeSpeed || 1)));
  lastYpt = ypt;
  S.year += ypt;

  // era transition by year
  let idx = eraIdx();
  while (idx + 1 < ERAS.length && S.year > ERAS[idx].end){
    idx++;
    S.year = ERAS[idx].start;
  }
  if (idx !== eraIdx()){
    S.era = ERAS[idx].id;
    S.eraChanged = true;
    S.eraChangedEra = S.era;
    log(String(S.year), S.era, "The " + ERA_BY_ID[S.era].name + " begins.", true);
    if (typeof AudioMgr !== "undefined") AudioMgr.playEra(S.era);
  }

  processEconomy();
  processGovernance();
  checkEndings();
  saveGame();
  UI.refresh();
  continueEvents();
}

function processEconomy(){
  const era = curEra();
  const yf = Math.max(1, lastYpt / 2); // year-scale factor (speed-scaled)

  // island production
  const inc = sumIncome();
  const pop = totalPop();
  const cap = totalCap();

  // consumption
  const cons = Math.ceil(pop / 6);
  let netFood = inc.food - cons;
  S.res.food += netFood;

  // starvation
  if (S.res.food < 0){
    const short = -S.res.food;
    S.res.food = 0;
    const starve = Math.min(pop, Math.ceil(short * 2));
    losePop(starve);
    S.happiness = clamp(S.happiness - 7, 0, 100);
    log(String(S.year), S.era, "Famine! " + starve + " people perish as the stores run empty.", true);
    netFood = -999;
  }

  // resources
  S.res.wood += inc.wood;
  S.res.stone += inc.stone;
  S.res.gold += inc.gold + Math.floor(pop / 60) + era.drift.gold * yf;

  // population growth
  const remaining = Math.max(0, cap - pop);
  if (netFood > 0 && remaining > 0){
    let g = Math.floor(netFood * 0.15) + Math.floor(era.drift.popGrowth * yf) + Math.floor(inc.popGrowth * yf / 2);
    if (S.happiness < 40) g = Math.floor(g * 0.5);
    g = clamp(g, 0, remaining);
    // distribute growth across islands with free housing
    const order = accessibleIslands().filter(id => S.islands[id].pop < islandCap(id));
    let i = 0;
    while (g > 0 && order.length){
      const id = order[i % order.length];
      const room = islandCap(id) - S.islands[id].pop;
      if (room > 0){
        const add = Math.min(g, room, Math.ceil(room * 0.5) || 1);
        S.islands[id].pop += add;
        g -= add;
        i++;
      } else {
        order.splice(order.indexOf(id), 1);
      }
    }
  }

  // culture drift
  S.culture = clamp(S.culture + era.drift.culture * yf + inc.culture * 0.1, 0, 100);
  // happiness drift toward 55
  S.happiness = clamp(S.happiness + clamp((55 - S.happiness) * 0.05 * yf, -3 * yf, 3 * yf) + era.drift.happiness * yf + inc.approval * 0.12, 0, 100);
  // military from buildings
  S.military = clamp(S.military + inc.military * 0.2, 0, 999);
  // self-sufficiency: mostly driven by buildings, industries & policies
  if (netFood > 0) S.selfSufficiency = clamp(S.selfSufficiency + 0.1 * yf + inc.selfSufficiency * 0.12, 0, 100);

  // low happiness tracking
  if (S.happiness <= 8) S.stats.lowHappinessTurns++;
  else S.stats.lowHappinessTurns = 0;
}

function losePop(amount){
  let left = amount;
  const order = accessibleIslands().filter(id => S.islands[id].pop > 0);
  let i = 0;
  while (left > 0 && order.length){
    const id = order[i % order.length];
    if (S.islands[id].pop <= 0){ order.splice(order.indexOf(id), 1); continue; }
    const take = Math.min(S.islands[id].pop, Math.ceil(left / order.length) || 1);
    S.islands[id].pop -= take;
    left -= take;
    i++;
  }
}

/* ---------------- governance ---------------- */
function processGovernance(){
  // policy research ticks for any chosen path
  if (S.gov.path){
    S.gov.research = S.gov.research || {};
    for (const pid in S.gov.research){
      const p = POLICIES[pid];
      if (!p) continue;
      S.gov.research[pid]--;
      if (S.gov.research[pid] <= 0){
        delete S.gov.research[pid];
        S.gov.policies[pid] = true;
        log(String(S.year), S.era, "📜 Policy enacted: " + p.name + " — now in force.", true);
      }
    }
  }
  if (S.gov.path === null) return;
  const yf = Math.max(1, lastYpt / 2);
  let goldCost = 0, hap = 0, cul = 0, gld = 0, ssf = 0, popG = 0;
  for (const pid in S.gov.policies){
    const p = POLICIES[pid];
    if (!p) continue;
    goldCost += p.upkeep;
    hap += (p.effects.happiness || 0);
    cul += (p.effects.culture || 0);
    gld += (p.effects.gold || 0);
    ssf += (p.effects.selfSufficiency || 0);
    popG += (p.effects.popGrowth || 0);
  }
  // path baseline
  if (S.gov.path === "dem") hap += 2, cul += 1;
  if (S.gov.path === "aut") hap -= 2;
  S.res.gold -= goldCost;
  S.happiness = clamp(S.happiness + hap * 0.5, 0, 100);
  S.culture = clamp(S.culture + cul * 0.5, 0, 100);
  S.res.gold = Math.max(0, S.res.gold + gld * yf);
  S.selfSufficiency = clamp(S.selfSufficiency + ssf * 0.5, 0, 100);
  if (popG){
    const cap = totalCap(), pop = totalPop();
    const room = Math.max(0, cap - pop);
    const add = Math.min(room, Math.floor(popG * yf));
    if (add > 0){
      const order = accessibleIslands().filter(id => S.islands[id].pop < islandCap(id));
      if (order.length) S.islands[order[0]].pop += add;
    }
  }
  // governance meter recompute
  let meter = S.gov.meter;
  for (const pid in S.gov.policies){
    const p = POLICIES[pid];
    if (!p) continue;
    meter += (p.gov === "dem" ? 8 : p.gov === "aut" ? -8 : 0);
  }
  S.gov.meter = clamp(meter, -100, 100);
  // strikes if authoritarian & low happiness
  if (S.gov.path === "aut" && S.happiness < 30 && Math.random() < 0.3){
    S.res.gold -= 6;
    S.happiness = clamp(S.happiness - 4, 0, 100);
    log(String(S.year), S.era, "A quiet strike halts the factories; the state responds with force and the docks fall silent.", true);
  }
}

/* ---------------- build & industry ---------------- */
function canBuild(islandId, b){
  const bd = BUILDING_DEFS[b];
  if (!bd) return { ok:false, why:"unknown" };
  const isl = S.islands[islandId];
  if (!isl.accessible) return { ok:false, why:"Island not accessible" };
  if (eraIdx() < ERAS.findIndex(e => e.id === bd.era)) return { ok:false, why:"Unlocks in the " + ERA_BY_ID[bd.era].name };
  if (bd.reqFlag && !S.flags[bd.reqFlag]) return { ok:false, why:"Requires a prior event" };
  if (bd.requires && !bd.requires(S)) return { ok:false, why:"Requires the reunification of Guam" };
  if ((b === "latte_quarry" || b === "stone_quarry") && (ISLAND_DEFS[islandId].stone || 0) < 1)
    return { ok:false, why:"No building stone on this island" };
  const cost = bd.cost;
  if (S.res.wood < (cost.wood || 0)) return { ok:false, why:"Not enough wood" };
  if (S.res.stone < (cost.stone || 0)) return { ok:false, why:"Not enough stone" };
  if (S.res.gold < (cost.gold || 0)) return { ok:false, why:"Not enough gold" };
  return { ok:true, why:"" };
}
function build(islandId, b){
  buildMany(islandId, b, 1);
}
/* how many units of b the player can afford right now */
function maxAffordable(islandId, b){
  const bd = BUILDING_DEFS[b];
  if (!bd) return 0;
  const isl = S.islands[islandId];
  if (!isl.accessible) return 0;
  if (eraIdx() < ERAS.findIndex(e => e.id === bd.era)) return 0;
  if (bd.reqFlag && !S.flags[bd.reqFlag]) return 0;
  if (bd.requires && !bd.requires(S)) return 0;
  if ((b === "latte_quarry" || b === "stone_quarry") && (ISLAND_DEFS[islandId].stone || 0) < 1) return 0;
  const cost = bd.cost;
  let n = Infinity;
  if (cost.wood) n = Math.min(n, Math.floor(S.res.wood / cost.wood));
  if (cost.stone) n = Math.min(n, Math.floor(S.res.stone / cost.stone));
  if (cost.gold) n = Math.min(n, Math.floor(S.res.gold / cost.gold));
  return isFinite(n) ? n : 0; // free buildings: no sensible "max"
}
function buildMany(islandId, b, n){
  const bd = BUILDING_DEFS[b];
  const maxN = maxAffordable(islandId, b);
  if (maxN <= 0){
    UI.toast(canBuild(islandId, b).why || "Not enough resources", "⚠️");
    return;
  }
  const count = Math.max(0, Math.min(n, maxN));
  if (count === 0){ UI.toast("Not enough resources", "⚠️"); return; }
  const cost = bd.cost;
  if (cost.wood) S.res.wood -= cost.wood * count;
  if (cost.stone) S.res.stone -= cost.stone * count;
  if (cost.gold) S.res.gold -= cost.gold * count;
  const isl = S.islands[islandId];
  isl.buildings[b] = (isl.buildings[b] || 0) + count;
  log(String(S.year), S.era, bd.icon + " ×" + count + " " + bd.name + " built on " + ISLAND_DEFS[islandId].name + ".", false);
  saveGame();
  UI.refresh();
  if (window.Board) window.Board.popBuild();
  UI.toast("×" + count + " " + bd.name + " built", "🔨");
  if (UI.sfx) UI.sfx("build");
}
function industryCost(isl){
  return isl.industryLvl === 0 ? 0 : isl.industryLvl === 1 ? 120 : 250;
}
function setIndustry(islandId, ind){
  if (!S.industryUnlocked) return;
  const isl = S.islands[islandId];
  if (!isl.accessible) return;
  if (isl.industry === ind) return;
  isl.industry = ind;
  isl.industryLvl = 1;
  log(String(S.year), S.era, "🏭 " + ISLAND_DEFS[islandId].name + " is designated a " + INDUSTRIES[ind].name + ".", true);
  saveGame();
  UI.refresh();
}
function upgradeIndustry(islandId){
  const isl = S.islands[islandId];
  if (!isl.industry || isl.industryLvl >= 3) return;
  const cost = industryCost(isl);
  if (S.res.gold < cost) { UI.toast("Not enough gold", "⚠️"); return; }
  S.res.gold -= cost;
  isl.industryLvl++;
  log(String(S.year), S.era, "📈 " + ISLAND_DEFS[islandId].name + "'s " + INDUSTRIES[isl.industry].name + " expands to level " + isl.industryLvl + ".", true);
  saveGame();
  UI.refresh();
}
function researchPolicy(pid){
  const p = POLICIES[pid];
  if (!p) return;
  S.gov.research = S.gov.research || {};
  S.gov.policies = S.gov.policies || {};
  if (S.gov.policies[pid] || S.gov.research[pid]) return;
  if (eraIdx() < ERAS.findIndex(e => e.id === p.era)) return;
  if (p.gov !== "any" && S.gov.path !== p.gov && S.gov.path !== "caretaker") { UI.toast("Requires the " + (p.gov === "dem" ? "democratic" : "authoritarian") + " path", "⚠️"); return; }
  S.gov.research[pid] = Math.max(1, p.research || 3);
  log(String(S.year), S.era, "🔬 Research begun: " + p.name + " (" + S.gov.research[pid] + " turns).", false);
  saveGame();
  UI.refresh();
}
function adoptPolicy(pid){
  const p = POLICIES[pid];
  if (!p || S.gov.policies[pid]) return;
  if (eraIdx() < ERAS.findIndex(e => e.id === p.era)) return;
  if (p.gov !== "any" && S.gov.path !== p.gov && S.gov.path !== "caretaker") { UI.toast("Requires the " + (p.gov === "dem" ? "democratic" : "authoritarian") + " path", "⚠️"); return; }
  S.gov.policies[pid] = true;
  log(String(S.year), S.era, p.icon + " Policy enacted: " + p.name + ".", true);
  saveGame();
  UI.refresh();
}
function dropPolicy(pid){
  if (S.gov.policies[pid]) delete S.gov.policies[pid];
  log(String(S.year), S.era, "Policy ended: " + POLICIES[pid].name + ".", false);
  saveGame();
  UI.refresh();
}

/* ---------------- endings ---------------- */
function checkEndings(){
  if (S.over) return;
  if (S.era === "future"){
    // Victory — either the reunified Chamorro Republic or the standalone Chamolinian Commonwealth can prevail,
    // but the nation must first be shaped by governance: 15 policies enacted —
    // a number equal to the islands of the Marianas.
    if (S.flags.independent && S.flags.nationality && Object.keys(S.gov.policies || {}).length >= 15 && S.selfSufficiency >= 60 && S.happiness >= 60 && S.culture >= 50){
      S.over = true;
      S.outcome = "victory";
      saveGame();
      UI.showEnding("victory");
      return;
    }
    // Collapse
    if (S.stats.lowHappinessTurns >= 4){
      S.over = true;
      S.outcome = "collapse";
      saveGame();
      UI.showEnding("collapse");
      return;
    }
    // Time runs out
    if (S.year >= 2100){
      S.over = true;
      S.outcome = "timeout";
      saveGame();
      UI.showEnding("timeout");
      return;
    }
  }
}

/* ---------------- event continuation ---------------- */
/* periodic raiders — the Military score is the nation's shield.
   Raid power grows with each era; military >= power drives them off. */
const RAIDERS = {
  ancient:     { power: 22, title: "The Outrigger Raiders",  text: "Swift canoes from the southern isles fall on the beaches at dawn, snatching stores and captives before the village can rally." },
  contact:     { power: 26, title: "Sea Raiders",            text: "Sailors and slavers now work the island chain — a raid catches the village unawares." },
  spanish:     { power: 34, title: "Raiders from the South", text: "Moro pirates and deserters raid the coast for food and captives while the garrison sleeps." },
  german:      { power: 40, title: "Sea Bandits",            text: "With the colony's attention elsewhere, armed bandits land to plunder the storehouses." },
  japanese:    { power: 46, title: "The Black Market Raiders", text: "Smugglers and deserters prey on the wartime islands, stealing food from the depots." },
  american:    { power: 52, title: "Pirates in the New Pacific", text: "Outlaw crews work the new sea and air lanes — a raid on a lonely island goes unpunished." },
  commonwealth:{ power: 58, title: "The Smugglers' Raid",    text: "Armed smugglers hit the island's warehouses, taking fuel and goods." },
  future:      { power: 66, title: "Black-Flag Raiders",     text: "In the lawless new Pacific, armed raiders test the young nation's defenses." },
};

function continueEvents(){
  if (S.over){ UI.refresh(); return; }
  // If a decision is already pending (just fired, or restored from a save),
  // don't fire anything new — just persist and show it.
  if (!S.pending){
    let guard = 0;
    while (!S.pending && guard < 8){
      if (!checkStoryEvents()) break;
      guard++;
    }
    if (!S.pending && !S.over){
      // random flavor event
      const pool = RANDOM_EVENTS.filter(r => r.eras.includes(S.era));
      if (pool.length && Math.random() < 0.32){
        const ev = pool[Math.floor(Math.random() * pool.length)];
        if (!S.flags["r_" + ev.id] || Math.random() < 0.5){
          S.flags["r_" + ev.id] = true;
          applyFx(ev.fx);
          log(String(S.year), S.era, ev.title + " — " + firstSentence(ev.text), true);
          UI.toast(ev.title, "🌊");
          const pulse = boardPulse(ev.id);
          if (pulse && window.Board) window.Board.pulse(pulse);
        }
      }
      // periodic raiders — the Military score decides how well the nation defends
      if (totalPop() >= 25 && Math.random() < 0.09){
        const rd = RAIDERS[S.era] || RAIDERS.ancient;
        applyFx({ raiderRaid: { power: rd.power, title: rd.title, text: rd.text } });
        UI.toast(rd.title, "⚔️");
        if (UI.sfx) UI.sfx("raid");
        const pulse = boardPulse("raiders");
        if (pulse && window.Board) window.Board.pulse(pulse);
      }
    }
  }
  saveGame();
  UI.refresh();
  if (S.eraChanged){
    const era = S.eraChangedEra || S.era;
    S.eraChanged = false; S.eraChangedEra = null;
    UI.showEraCard(ERA_BY_ID[era]);
  }
  if (S.pending) UI.showDecision(S.pending);
}

/* ---------------- debug helpers ---------------- */
function dbgSkipToEra(id){
  const idx = ERAS.findIndex(e => e.id === id);
  if (idx < 0) return;
  S.era = id;
  S.year = ERAS[idx].start;
  S.eraChanged = true;
  S.eraChangedEra = id;
  saveGame();
  UI.refresh();
  continueEvents();
}
window.DBG = {
  skipToEra: dbgSkipToEra,
  give: (what, n) => { if (what in S.res) S.res[what] += n; UI.refresh(); },
  state: () => S,
};
