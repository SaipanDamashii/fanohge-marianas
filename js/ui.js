/* ============================================================
   FANOHGE — The Marianas Saga  ·  ui.js
   Rendering: map, panels, tabs, modals, toasts
   ============================================================ */
/* global ERAS, ERA_BY_ID, ISLAND_DEFS, ISLAND_ORDER, ISLAND_OUTLINES, ISLE_DRIFT, ISLE_FIT, BUILDING_DEFS, INDUSTRIES, POLICIES, EVENTS, RANDOM_EVENTS, S, AudioMgr, newGame, loadGame, saveGame, clearSave, endTurn, chooseDecision, continueEvents, build, setIndustry, upgradeIndustry, adoptPolicy, dropPolicy, canBuild, islandIncome, islandCap, accessibleIslands, totalPop, totalCap, curEra, eraIdx, clamp, log, window, document, localStorage */

const UI = {
  sel: "saipan",
  tab: "overview",
  modalSeq: 0,

  init(){
    this.bind();
    this.setupLog();
    if (window.Board) this.setupBoard(); else this.buildMap();
    const hasSave = loadGame();
    // Title screen first on every launch (background: assets/titlescreen.jpg).
    // It resolves into the intro story modal when the player continues/transitions.
    this.showTitleScreen(hasSave);
    // Catch up on story events the moment a save loads — so e.g. the 1898
    // Spanish-American War / Guam cession applies immediately even if the
    // player's turns skipped over 1898 (fast time scale).
    if (hasSave){
      this.refresh();
      continueEvents();
    }
  },

  /* ---------- title screen ---------- */
  showTitleScreen(hasSave){
    // The title surface is the static #boot-cover baked into index.html so it
    // is visible from the very first paint — the game UI never shows first.
    // Here we fill in the action buttons (which depend on hasSave) and wire it up.
    const wrap = document.getElementById("boot-cover");
    if (!wrap) return; // not present — skip
    wrap.classList.add("title-enter");
    this.hasSaveOnStart = hasSave;
    this.loadedEra = (typeof S !== "undefined" && S && S.era) ? S.era : null;

    // The cover shows ONLY the real titlescreen.jpg. If that image cannot
    // load in this host, there is no "fake" gradient screen to fall back on:
    // we bail out immediately (remove the cover) and drop straight into the
    // intro — so the player never sees a placeholder title screen.
    const bg = wrap.querySelector("#boot-bg");
    const proceedWithoutCover = () => {
      if (!document.getElementById("boot-cover")) return;
      if (window.AudioMgr) window.AudioMgr.stopTitle();
      wrap.classList.add("title-leaving");
      window.setTimeout(() => {
        wrap.remove();
        if (typeof this.showIntro === "function") this.showIntro(hasSave);
      }, 360);
    };
    if (bg){
      const bail = () => {
        if (document.getElementById("boot-cover")) proceedWithoutCover();
      };
      // Start the title theme the moment the titlescreen.jpg finishes
      // loading, so the music is in sync with the cover the player sees.
      bg.addEventListener("load", () => {
        try { if (window.AudioMgr) window.AudioMgr.playTitle(); } catch(e){ /* optional audio */ }
      });
      bg.addEventListener("error", bail);
      window.setTimeout(() => {
        // If the image still hasn't rendered after a moment (blocked, slow,
        // or failed without erroring), drop the cover so there's no static
        // placeholder — the player goes straight into the intro.
        if (!bg.naturalWidth) bail();
      }, 3000);
    }

    const actions = wrap.querySelector("[data-title-actions]");
    actions.innerHTML = `
      ${hasSave ? `<button class="title-btn title-continue" data-continue="1">Continue the Saga</button>` : ""}
      <button class="title-btn title-begin" data-begin="1">${hasSave ? "Begin Anew" : "Begin the Saga"}</button>
    `;

    // `fresh` = true means the player chose to start a brand-new saga
    // (clears any saved progress and begins a clean game), whereas `false`
    // continues the existing save. "Begin Anew" must actually wipe the save —
    // previously both buttons took the same path and re-loaded the old game.
    const enter = (fresh) => {
      this.sfx("click");
      if (window.AudioMgr) window.AudioMgr.stopTitle();
      if (fresh){
        // Start over: drop the old save and spin up a brand-new game.
        try { clearSave(); } catch(e){}
        try { newGame(); } catch(e){}
      } else if (this.hasSaveOnStart && window.AudioMgr && typeof AudioMgr.playEra === "function"){
        // Continuing a loaded save: resume that era's music now that the title
        // theme ended (a brand-new game starts its era track via newGame()).
        try { AudioMgr.playEra(this.loadedEra); } catch(e){ /* audio is optional */ }
      }
      wrap.classList.add("title-leaving");
      window.setTimeout(() => {
        wrap.remove();
        // After "Begin Anew"/fresh start there is no save; after "Continue"
        // the save is still present, so showIntro still offers both options.
        if (typeof this.showIntro === "function") this.showIntro(!fresh && hasSave);
      }, 480);
    };

    wrap.querySelector("[data-begin]").addEventListener("click", (e) => { e.stopPropagation(); enter(true); });
    if (hasSave) wrap.querySelector("[data-continue]").addEventListener("click", (e) => { e.stopPropagation(); enter(false); });
    // Clicking the (empty) cover background: with no save it starts a fresh
    // game; with a save it continues — never wipes progress by accident.
    wrap.addEventListener("click", (e) => { if (e.target === wrap) enter(!hasSave); });
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " "){
        wrap.removeEventListener("keydown", onKey);
        enter(!hasSave);
      }
    };
    wrap.addEventListener("keydown", onKey);
    wrap.setAttribute("tabindex", "0");
    wrap.focus();
    // Ensure the title theme is playing whenever the cover is on screen.
    // If the jpg was already cached the "load" listener above fires before we
    // get here, or it will fire shortly; playTitle() is idempotent for the
    // same track, so this overlaps safely as a fallback so music is never
    // missed. Guarded so an audio/environment hiccup can never block the title.
    try { if (window.AudioMgr) window.AudioMgr.playTitle(); } catch(e){ /* optional audio */ }
  },

  /* ---------- 3D gameboard ---------- */
  setupBoard(){
    const col = document.getElementById("map-col");
    const host = document.createElement("div");
    host.id = "board-host";
    col.appendChild(host);
    col.classList.add("board3d");
    const ok = window.Board.init(host, {
      onSelect: (id) => {
        if (!window.S.islands[id].accessible){
          if (id === "guam") this.toast("Guam is under the American flag — beyond your reach for now.", "🇺🇸");
          else if (window.S.era === "ancient" || window.S.era === "contact") this.toast("This island is beyond your canoes' reach — for now.", "🌊");
          else this.toast("This island is not yet settled.", "🔒");
          return;
        }
        this.sel = id;
        this.refresh();
      },
    });
    if (!ok){
      col.classList.remove("board3d");
      host.remove();
      window.Board = null; // make renderMap fall through to the SVG map
      this.buildMap();
    }
  },

  /* ---------- global bindings ---------- */
  bind(){
    document.getElementById("btn-next").addEventListener("click", () => endTurn());
    document.getElementById("btn-audio").addEventListener("click", () => {
      const M = window.AudioMgr;
      const on = !(M && M.enabled);
      if (M) M.toggle(on);
      const btn = document.getElementById("btn-audio");
      if (btn) btn.textContent = on ? "🔊" : "🔇";
    });
    // reflect saved audio pref in the toggle icon
    const audioPref = (() => { try { return window.localStorage.getItem("fanohge_audio"); } catch(e){ return null; } })();
    const btn = document.getElementById("btn-audio");
    if (btn) btn.textContent = audioPref === "0" ? "🔇" : "🔊";
    document.getElementById("speed-sel").addEventListener("change", (e) => {
      S.timeSpeed = +e.target.value;
      saveGame();
      UI.toast("Time scale: " + S.timeSpeed + "× — " + Math.round(curEra().ypt * S.timeSpeed) + " years per turn", "⏳");
      UI.refresh();
    });
    document.getElementById("btn-newgame").addEventListener("click", () => {
      if (confirm("Begin a new saga? Your current progress will be lost.")){
        clearSave();
        newGame();
        this.modalRoot().innerHTML = "";
        this.refresh();
        continueEvents();
      }
    });
    const tabs = document.querySelectorAll("#tabs .tab");
    tabs.forEach(t => t.addEventListener("click", () => {
      this.tab = t.dataset.tab;
      tabs.forEach(x => x.classList.toggle("active", x === t));
      document.querySelectorAll(".tabpage").forEach(p => p.classList.toggle("active", p.id === "tab-" + this.tab));
      this.renderTab();
    }));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " "){
        if (document.getElementById("modal-root").children.length) return;
        e.preventDefault();
        endTurn();
      }
    });
  },
  modalRoot(){ return document.getElementById("modal-root"); },

  /* ---------- SVG map ---------- */
  buildMap(){
    const wrap = document.getElementById("map-svg");
    const W = 420, H = 920;
    let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    // sea
    svg += `<defs>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0d2f52"/><stop offset="1" stop-color="#071a30"/>
      </linearGradient>
      <radialGradient id="isleGrad" cx="0.4" cy="0.35" r="1">
        <stop offset="0" stop-color="#5cb88a"/><stop offset="1" stop-color="#2c7a58"/>
      </radialGradient>
    </defs>`;
    svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#sea)"/>`;
    // sea labels
    svg += `<text x="18" y="${H/2}" fill="#1e4a70" font-size="12" letter-spacing="4" transform="rotate(-90 18 ${H/2})" font-family="Georgia,serif" opacity="0.9">PHILIPPINE SEA</text>`;
    svg += `<text x="${W-14}" y="${H/2}" fill="#1e4a70" font-size="12" letter-spacing="4" transform="rotate(90 ${W-14} ${H/2})" font-family="Georgia,serif" text-anchor="middle" opacity="0.9">PACIFIC OCEAN</text>`;
    // subtle graticule lines
    for (let y = 80; y < H; y += 80){
      svg += `<line x1="24" y1="${y}" x2="${W-24}" y2="${y}" stroke="#123a5e" stroke-width="0.5" stroke-dasharray="2 6" opacity="0.6"/>`;
    }
    // islands
    for (const id of ISLAND_ORDER){
      const d = ISLAND_DEFS[id];
      const dx = ISLE_DRIFT[id] || 0;
      svg += `<g class="isle" id="isle-${id}" data-id="${id}" transform="translate(${dx},0)">`;
      for (const p of this.shapePaths(d)){
        svg += `<path class="blob" d="${p}" fill="url(#isleGrad)" stroke="#0a2a1e" stroke-width="2"/>`;
      }
      svg += `<circle class="town" cx="${d.cx}" cy="${d.cy}" r="5" fill="#ffe9b0" stroke="#b8860b" stroke-width="1.5"/>`;
      svg += `<text class="ind-badge" x="${d.cx + d.rx + 6}" y="${d.cy - d.ry + 6}" font-size="13">🏭</text>`;
      svg += `<text class="isle-name" x="${d.cx}" y="${d.cy + d.ry + 12}" font-family="Georgia,serif">${d.name}</text>`;
      if (id === "guam"){
        svg += `<text class="guam-star" x="${d.cx}" y="${d.cy + 4}" font-size="11" text-anchor="middle">★</text>`;
      }
      svg += `</g>`;
    }
    // compass
    svg += `<g transform="translate(${W-46},46)" opacity="0.85">
      <circle r="15" fill="none" stroke="#7cc4ff" stroke-width="1"/>
      <path d="M0,-12 L3,4 L0,0 L-3,4 Z" fill="#ff8f6b"/>
      <text y="-19" text-anchor="middle" fill="#7cc4ff" font-size="9" font-family="Georgia,serif">N</text>
    </g>`;
    svg += `</svg>`;
    wrap.innerHTML = svg;
    // click handling
    wrap.querySelectorAll(".isle").forEach(g => {
      g.addEventListener("click", () => {
        const id = g.dataset.id;
        const isl = S.islands[id];
        if (!isl.accessible){
          if (id === "guam") this.toast("Guam is under the American flag — beyond your reach for now.", "🇺🇸");
          else if (S.era === "ancient" || S.era === "contact") this.toast("This island is beyond your canoes' reach — for now.", "🌊");
          else this.toast("This island is not yet settled.", "🔒");
          return;
        }
        this.sel = id;
        if (window.Board) window.Board.select(id, true);
        this.refresh();
      });
    });
  },

  /* Real island silhouettes (from ISLAND_OUTLINES) rendered into SVG
     path strings. Outlines are unit-aspect; the island's real km size
     (kmW × kmH) is fitted into its map box so every island shows its
     true shape and proportions. Returns an array of paths (Maug = 3). */
  shapePaths(d){
    const o = ISLAND_OUTLINES[d.id];
    if (!o) return [this.blobPath(d)];
    const fit = ISLE_FIT[d.id] || 1;
    const scale = Math.min(d.rx / (o.kmW / 2), d.ry / (o.kmH / 2)) * fit;
    const sx = (o.kmW / 2) * scale, sy = (o.kmH / 2) * scale;
    const out = [];
    for (const poly of o.polys){
      const pts = poly.map(([x, y]) => [d.cx + x * sx, d.cy + y * sy]);
      out.push("M" + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L") + "Z");
    }
    return out;
  },

  blobPath(d){
    // deterministic wobble
    let seed = d.seed * 9301 + 49297;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const n = 16;
    const pts = [];
    for (let i = 0; i < n; i++){
      const a = (i / n) * Math.PI * 2;
      const rr = 0.82 + 0.3 * rnd();
      pts.push([d.cx + Math.cos(a) * d.rx * rr, d.cy + Math.sin(a) * d.ry * rr]);
    }
    return "M" + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L") + "Z";
  },

  renderMap(){
    if (window.Board){
      window.Board.refresh();
      return;
    }
    const guamLockedStar = S.era !== "ancient" && S.era !== "contact" && !S.islands.guam.accessible;
    for (const id of ISLAND_ORDER){
      const g = document.getElementById("isle-" + id);
      if (!g) continue;
      const isl = S.islands[id];
      const d = ISLAND_DEFS[id];
      g.classList.toggle("locked", !isl.accessible);
      g.classList.toggle("selected", this.sel === id && isl.accessible);
      g.classList.toggle("has-town", isl.accessible && isl.pop >= 4);
      g.classList.toggle("has-industry", !!(isl.industry && isl.industryLvl > 0));
      const nameEl = g.querySelector(".isle-name");
      if (nameEl) nameEl.classList.toggle("locked", !isl.accessible);
      const blobs = g.querySelectorAll(".blob");
      for (const blob of blobs){
        if (isl.accessible) blob.setAttribute("fill", "url(#isleGrad)");
        else blob.setAttribute("fill", "#24394c");
      }
      const star = g.querySelector(".guam-star");
      if (star){
        star.style.display = (id === "guam" && guamLockedStar) ? "block" : "none";
        star.setAttribute("fill", "#7cc4ff");
      }
      const badge = g.querySelector(".ind-badge");
      if (badge){
        if (isl.industry){
          badge.textContent = INDUSTRIES[isl.industry].icon;
          badge.style.display = "block";
        } else badge.style.display = "none";
      }
      // building depiction (2D fallback): tiered dots + total badge
      let bG = g.querySelector(".buildings");
      if (!bG){
        bG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        bG.setAttribute("class", "buildings");
        g.appendChild(bG);
      }
      const totalB = isl.accessible ? Object.values(isl.buildings).reduce((a, x) => a + x, 0) : 0;
      if (isl.accessible && totalB > 0){
        const dots = totalB >= 10 ? 10 : totalB >= 5 ? 5 : totalB >= 3 ? 3 : 1;
        let h = "";
        for (let i = 0; i < dots; i++){
          const x = d.cx + d.rx + 5 + i * 5.6;
          const y = d.cy;
          h += `<path d="M${x},${y - 3.6} l2.7,-2.6 l2.7,2.6 z" fill="#b5452e"/>`;
          h += `<rect x="${x}" y="${y - 3.2}" width="5.4" height="3.6" fill="#e8d9b8" stroke="#5b3a1a" stroke-width="0.3"/>`;
        }
        if (totalB > 10) h += `<text x="${d.cx + d.rx + 7 + dots * 5.6}" y="${d.cy + 1}" font-size="10" fill="#ffe9b0" font-weight="bold">×${totalB}</text>`;
        bG.innerHTML = h;
      } else bG.innerHTML = "";
      // people marker on the 2D map
      let pEl = g.querySelector(".isle-pop");
      if (!pEl){
        pEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        pEl.setAttribute("class", "isle-pop");
        pEl.setAttribute("text-anchor", "middle");
        g.appendChild(pEl);
      }
      if (isl.accessible && isl.pop > 0){
        pEl.setAttribute("x", String(d.cx - d.rx - 6));
        pEl.setAttribute("y", String(d.cy + d.ry + 16));
        pEl.setAttribute("font-size", "9");
        pEl.setAttribute("fill", "#ffd76b");
        pEl.setAttribute("text-anchor", "end");
        pEl.textContent = "👥 " + isl.pop;
      } else pEl.textContent = "";
    }
    // legend
    const leg = document.getElementById("map-legend");
    leg.innerHTML = `
      <span class="lg"><span class="sw" style="background:#3a9d6e"></span>Your islands</span>
      <span class="lg"><span class="sw" style="background:#24394c"></span>Beyond reach</span>
      <span class="lg"><span class="sw" style="background:#3a6ea0"></span>U.S. territory (Guam)</span>`;
  },

  /* ---------- top bar ---------- */
  renderTop(){
    const era = curEra();
    const badge = document.getElementById("era-badge");
    badge.innerHTML =
      `<span class="era-badge-text" style="color:${era.color}">● ${era.name} <span class="year">· ${S.year}${S.era==="future" ? " CE" : ""}</span></span>` +
      `<span class="era-badge-art" data-art="${era.id}"></span>`;
    // Load the era-art thumbnail async (assets/era-art/<era>.jpg). A missing
    // file simply leaves the empty art cell styled as a subtle disc.
    const art = badge.querySelector("[data-art]");
    const probe = new Image();
    probe.onload = () => {
      if (document.contains(art)){
        art.style.backgroundImage = `url('assets/era-art/${era.id}.jpg')`;
        art.classList.add("loaded");
      }
    };
    probe.src = `assets/era-art/${era.id}.jpg`;
    badge.style.borderColor = era.color + "66";
    const res = document.getElementById("resources");
    const pop = totalPop();
    const chips = [
      ["🍠", "Food", Math.floor(S.res.food), S.res.food < 15],
      ["🪵", "Wood", Math.floor(S.res.wood), S.res.wood < 10],
      ["🪨", "Stone", Math.floor(S.res.stone), S.res.stone < 10],
      ["🪙", "Gold", Math.floor(S.res.gold), S.res.gold < 5],
      ["👥", "People", pop, false],
      ["😊", "Happiness", Math.round(S.happiness), S.happiness < 30],
      ["🏛️", "Culture", Math.round(S.culture), S.culture < 30],
      ["⚔️", "Military", Math.round(S.military), false],
    ];
    if (S.era === "future") chips.push(["🌐", "Self-Suff.", Math.round(S.selfSufficiency), S.selfSufficiency < 50]);
    res.innerHTML = chips.map(c =>
      `<span class="res-chip ${c[3] ? "low" : ""}"><span class="ico">${c[0]}</span><span class="val">${c[2]}</span><span class="delta" title="${c[1]}">${c[1]}</span></span>`
    ).join("");
    const btn = document.getElementById("btn-next");
    btn.disabled = !!S.pending || S.over;
    const ypt = Math.max(1, Math.round(era.ypt * (S.timeSpeed || 1)));
    const sel = document.getElementById("speed-sel");
    if (sel) sel.value = String(S.timeSpeed || 1);
    if (S.pending) btn.textContent = "Decision pending…";
    else if (S.over) btn.textContent = "The saga is complete";
    else btn.textContent = "Advance Time (+" + ypt + "y) ⏎";
  },

  /* ---------- tab rendering ---------- */
  renderTab(){
    if (this.tab === "overview") this.renderOverview();
    else if (this.tab === "people") this.renderPeople();
    else if (this.tab === "story") this.renderStory();
  },

  /* ---------- overview: island list + panel ---------- */
  renderOverview(){
    // per-turn income summary
    const ti = turnIncome();
    let incEl = document.getElementById("turn-income");
    if (!incEl){
      incEl = document.createElement("div");
      incEl.id = "turn-income";
      const ov = document.getElementById("tab-overview");
      ov.insertBefore(incEl, ov.firstChild);
    }
    const sign = v => v >= 0 ? "+" + v : String(v);
    const cls = v => v < 0 ? "inc neg" : "inc pos";
    incEl.innerHTML = `<div class="panel-card"><h3>Turn Income <span class="sub">— what the islands earn each turn</span></h3>
      <div class="stat-row">
        <span class="stat-pill">🍠 Food <b class="${cls(ti.food)}">${sign(ti.food)}/turn</b> <span class="inc-sub">of ${ti.foodGross} − ${ti.foodCons} eaten</span></span>
        <span class="stat-pill">🪵 Wood <b class="${cls(ti.wood)}">${sign(ti.wood)}/turn</b></span>
        <span class="stat-pill">🪨 Stone <b class="${cls(ti.stone)}">${sign(ti.stone)}/turn</b></span>
        <span class="stat-pill">🪙 Gold <b class="${cls(ti.gold)}">${sign(ti.gold)}/turn</b> <span class="inc-sub">after policy upkeep</span></span>
      </div>
      <p class="inc-note">Build more on your islands, assign industry centers, and enact policies to raise these numbers. Food is shown after your people eat; gold after policy upkeep.</p>
    </div>`;
    this.renderIslandList();
    this.renderIslandPanel();
  },

  renderIslandList(){
    const el = document.getElementById("island-list");
    let html = "";
    const list = ISLAND_ORDER.slice().reverse(); // south (Guam) first? show north-to-south: keep order but locked dimmed
    for (const id of ISLAND_ORDER){
      const d = ISLAND_DEFS[id];
      const isl = S.islands[id];
      const locked = !isl.accessible;
      html += `<div class="isle-card ${locked ? "locked" : ""} ${this.sel === id && !locked ? "selected" : ""}" data-id="${id}">
        <div class="ic-name">${locked ? "🔒 " : ""}${d.name}${!locked && d.alt ? ` <span style="color:var(--dim);font-weight:400">· ${d.alt}</span>` : ""}</div>
        <div class="ic-meta">
          ${locked ? (id === "guam" ? "🇺🇸 U.S. territory" : "Unsettled") :
            `<span>👥 ${isl.pop} <span style="color:var(--dim)">/ ${islandCap(id)}</span></span>`}
          ${!locked && isl.depopulated ? `<span style="color:var(--coral)">abandoned</span>` : ""}
          ${isl.industry ? `<span class="ic-ind">${INDUSTRIES[isl.industry].icon} ${INDUSTRIES[isl.industry].name} L${isl.industryLvl}</span>` : ""}
        </div>
      </div>`;
    }
    el.innerHTML = html;
    el.querySelectorAll(".isle-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.dataset.id;
        if (!S.islands[id].accessible){
          if (id === "guam") this.toast("Guam is under the American flag — beyond your reach for now.", "🇺🇸");
          else this.toast("This island is not yet settled.", "🔒");
          return;
        }
        this.sel = id;
        if (window.Board) window.Board.select(id, true);
        this.refresh();
      });
    });
  },

  renderIslandPanel(){
    const el = document.getElementById("island-panel");
    const id = this.sel;
    const isl = S.islands[id];
    if (!isl || !isl.accessible){
      el.innerHTML = `<div class="panel-card"><h3>The Marianas</h3>
        <p class="empty-note">Select an island from the map or the list to see its villages, fields, and what can be built there.</p>
        <p class="empty-note">The archipelago stretches 500 miles from the volcanic north to Guam in the south. Your story begins on <b style="color:var(--gold2)">Saipan</b>.</p></div>`;
      return;
    }
    const d = ISLAND_DEFS[id];
    const inc = islandIncome(id);
    const cap = islandCap(id);
    let html = `<div class="panel-card">
      <h3>${d.name} <span class="sub">${d.alt ? "— " + d.alt + " · " : ""}${d.blurb}</span></h3>
      <div class="stat-row">
        <span class="stat-pill">👥 <b>${isl.pop}</b> / ${cap}</span>
        <span class="stat-pill">🍠 <b>${inc.food >= 0 ? "+" : ""}${Math.floor(inc.food)}</b>/turn</span>
        <span class="stat-pill">🪵 <b>+${Math.floor(inc.wood)}</b>/turn</span>
        <span class="stat-pill">🪨 <b>+${Math.floor(inc.stone)}</b>/turn</span>
        <span class="stat-pill">🪙 <b>+${Math.floor(inc.gold)}</b>/turn</span>
        ${isl.depopulated ? `<span class="stat-pill" style="color:var(--coral)">abandoned</span>` : ""}
      </div>`;

    // industry (future)
    if (S.industryUnlocked){
      html += `<div style="margin-top:10px">
        <div style="font-size:11px;color:var(--dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Industry Center</div>
        <div class="industry-row">`;
      for (const indId in INDUSTRIES){
        const ind = INDUSTRIES[indId];
        html += `<button class="ind-btn ${isl.industry === indId ? "active" : ""}" data-ind="${indId}">${ind.icon} ${ind.name}</button>`;
      }
      html += `</div>
        ${isl.industry ? `<div class="ind-upgrade">${INDUSTRIES[isl.industry].name} — level ${isl.industryLvl}/3 ·
          ${isl.industryLvl < 3 ? `<button data-upgrade="1">Upgrade (${this.upCost(isl)} 🪙)</button>` : "max level"}
          <div style="font-size:10.5px;color:var(--dim);margin-top:3px">${this.indDesc(isl.industry)}</div></div>` : ""}
      </div>`;
    }

    // buildings owned
    const owned = Object.keys(isl.buildings).filter(b => isl.buildings[b] > 0);
    if (owned.length){
      html += `<div style="margin-top:10px"><div style="font-size:11px;color:var(--dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Built here</div>
        <div class="own-list">` +
        owned.map(b => `<span class="own-item">${BUILDING_DEFS[b].icon} ${BUILDING_DEFS[b].name} ×${isl.buildings[b]}</span>`).join("") +
        `</div></div>`;
    }

    // build menu
    html += `<div style="margin-top:10px"><div style="font-size:11px;color:var(--dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Construct</div>
      <div class="build-grid">`;
    const buildables = Object.values(BUILDING_DEFS).filter(bd => eraIdx() >= ERAS.findIndex(e => e.id === bd.era) && (!bd.requires || bd.requires(S)));
    for (const bd of buildables){
      const chk = canBuild(id, bd.id);
      const count = isl.buildings[bd.id] || 0;
      const maxN = maxAffordable(id, bd.id);
      html += `<div class="build-card ${!chk.ok ? "locked" : ""}">
        <div class="bc-name"><span class="ico">${bd.icon}</span>${bd.name}</div>
        <div class="bc-desc">${bd.desc}</div>
        <div class="bc-cost">${this.costStr(bd.cost)}</div>
        ${bd.effects ? `<div class="bc-eff">${this.effStr(bd.effects)}</div>` : ""}
        ${count ? `<div class="bc-count">×${count}</div>` : ""}
        ${chk.ok
          ? `<div class="bc-actions">
              <button class="bc-b1" data-build="${bd.id}" title="Buy one">+1</button>
              <input class="bc-num" type="number" min="1" value="5" data-build-n="${bd.id}" title="How many to buy">
              <button class="bc-buy" data-build-many="${bd.id}" title="Buy the number typed above">Buy</button>
              <button class="bc-max" data-build-max="${bd.id}" ${maxN > 1 ? "" : "disabled"} title="Buy as many as you can afford">Max ${maxN > 1 ? "×" + maxN : ""}</button>
            </div>`
          : `<div class="bc-lock">${chk.why}</div>`}
      </div>`;
    }
    html += `</div></div></div>`;
    el.innerHTML = html;

    el.querySelectorAll("[data-build]").forEach(btn => {
      btn.addEventListener("click", () => build(id, btn.dataset.build));
    });
    el.querySelectorAll("[data-build-many]").forEach(btn => {
      btn.addEventListener("click", () => {
        const bid = btn.dataset.buildMany;
        const input = el.querySelector(`[data-build-n="${bid}"]`);
        const n = parseInt((input && input.value) || "1", 10);
        buildMany(id, bid, Math.max(1, isNaN(n) ? 1 : n));
      });
    });
    el.querySelectorAll("[data-build-max]").forEach(btn => {
      btn.addEventListener("click", () => buildMany(id, btn.dataset.buildMax, Infinity));
    });
    el.querySelectorAll("[data-ind]").forEach(btn => {
      btn.addEventListener("click", () => setIndustry(id, btn.dataset.ind));
    });
    el.querySelectorAll("[data-upgrade]").forEach(btn => {
      btn.addEventListener("click", () => upgradeIndustry(id));
    });
  },
  costStr(cost){
    let s = "";
    if (cost.wood) s += `🪵 ${cost.wood} `;
    if (cost.stone) s += `🪨 ${cost.stone} `;
    if (cost.gold) s += `🪙 ${cost.gold} `;
    return s.trim();
  },
  upCost(isl){ return isl.industryLvl === 1 ? 120 : 250; },
  indDesc(indId){
    const ind = INDUSTRIES[indId];
    const parts = [];
    for (const k in ind.perLvl) parts.push(`${k === "gold" ? "🪙" : k === "food" ? "🍠" : k === "culture" ? "🏛️" : k === "approval" ? "😊" : k === "selfSufficiency" ? "🌐" : k} +${ind.perLvl[k]}/lvl`);
    return parts.join(" · ");
  },

  /* ---------- people & governance ---------- */
  renderPeople(){
    const el = document.getElementById("tab-people");
    el.classList.add("col");
    let html = "";
    const pop = totalPop();

    // Era-art banner at the top of the tab (assets/era-art/<era>.jpg). The
    // image is loaded async into [data-era-banner] after innerHTML is set.
    const era = curEra();
    html += `<div class="era-banner" data-era-banner>
      <div class="era-banner-ph">🖼️</div>
      <div class="era-banner-caption">
        <span class="era-banner-epoch">${era.short || era.name}</span>
        <b>${era.name}</b>
        <span class="era-banner-year">${era.start}${era.end ? " — " + era.end : " — the future, unwritten"}</span>
      </div>
    </div>`;

    // stat cards
    html += `<div class="panel-card"><h3>People &amp; Society</h3>
      <div class="stat-grid">
        ${this.bigStat("👥", pop, "Population", "across " + accessibleIslands().length + " islands")}
        ${this.bigStat("😊", Math.round(S.happiness) + "%", "Happiness", S.happiness >= 60 ? "content" : S.happiness >= 35 ? "uneasy" : "restless")}
        ${this.bigStat("🏛️", Math.round(S.culture) + "%", "Culture", S.culture >= 60 ? "the ancestors' ways thrive" : "under pressure")}
        ${this.bigStat("⚔️", Math.round(S.military), "Defense", "warriors, forts & allies")}
        ${this.bigStat("🌐", Math.round(S.selfSufficiency) + "%", "Self-Sufficiency", "local food, energy & goods")}
        ${this.bigStat("🤝", S.reputation, "World Standing", S.gov.path ? "respected in the region" : "known to traders")}
      </div></div>`;

    // islands breakdown
    html += `<div class="panel-card"><h3>Islands</h3><div class="stat-row">`;
    for (const id of accessibleIslands()){
      const d = ISLAND_DEFS[id];
      const isl = S.islands[id];
      html += `<span class="stat-pill"><b>${d.name}</b> ${isl.pop} pop · ${islandCap(id)} cap${isl.industry ? " · " + INDUSTRIES[isl.industry].icon : ""}</span>`;
    }
    html += `</div></div>`;

    // governance
    html += `<div class="panel-card"><h3>Governance</h3>`;
    if (S.flags.nationality){
      const nation = S.flags.nationality === "chamorro"
        ? "The Chamorro Republic of the Marianas"
        : "The Chamolinian Commonwealth of the Pacific";
      const natName = S.flags.nationality === "chamorro" ? "Chamorro" : "Chamolinian";
      html += `<div class="nation-banner"><b style="color:var(--gold2)">${S.flags.reunified ? "🇬🇺🇲🇵" : "🇲🇵"}</b> <b>${nation}</b><br>
        <span style="color:var(--dim);font-size:11.5px">Official nationality: <b style="color:#7cc4ff">${natName}</b>${S.flags.guam_bases ? " · Guam's bases & technologies folded into the national arsenal" : ""}</span></div>`;
    }
    if (S.era !== "future"){
      html += `<p class="empty-note">In ${curEra().name}, the islands are not free to choose their own government. ${S.gov.path ? "You steer within the limits of foreign rule." : "The great choice of governance awaits in the future era — when the Marianas finally rule themselves."}</p>`;
    } else if (!S.gov.path){
      html += `<p class="empty-note" style="margin-bottom:8px">The future has arrived, and with it the great question: what kind of nation will the Marianas be? Choose the path of your government.</p>
      <div class="gov-path-row">
        ${this.govOpt("dem", "🌺 The Democratic Path", "Free press, labor rights, referenda. Slower growth, deeper trust, higher happiness and culture.")}
        ${this.govOpt("aut", "⚡ The Authoritarian Path", "Strong leadership, rapid development, control. Faster industry, quieter streets, restless hearts.")}
        ${this.govOpt("caretaker", "🤝 The Caretaker Path", "Continue the Commonwealth for now. Safe and familiar — but the dream of nationhood waits.")}
      </div>`;
    } else {
      const pathName = S.gov.path === "dem" ? "Democratic Republic" : S.gov.path === "aut" ? "Strong State" : "Commonwealth (Caretaker)";
      const meter = S.gov.meter;
      html += `<div style="font-size:13px"><b style="color:var(--gold2)">${pathName}</b> <span style="color:var(--dim)">· the people ${S.gov.path === "dem" ? "walk beside you" : S.gov.path === "aut" ? "walk carefully" : "wait and watch"}</span></div>
      <div class="meter-wrap"><div style="font-size:10.5px;color:var(--dim)">GOVERNANCE — authoritarian ⇄ democratic</div>
        <div class="meter"><div style="width:${(meter + 100) / 2}%;background:${meter >= 0 ? "var(--teal)" : "var(--coral)"}"></div></div>
        <div style="font-size:10px;color:var(--dim);margin-top:2px">${Math.abs(meter)}% ${meter >= 0 ? "democratic" : "authoritarian"} character</div></div>`;
      // victory gate hint (hidden once the saga is complete)
      const polNeed = 15;
      const polCount = Object.keys(S.gov.policies || {}).length;
      if (S.over && S.outcome === "victory"){
        html += `<div style="margin-top:8px;font-size:11.5px;color:var(--green);background:rgba(140,224,154,.08);border:1px solid rgba(140,224,154,.25);border-radius:10px;padding:6px 10px">🏆 The saga is complete — fifteen policies stand written into law, as many as the islands of the Marianas themselves, and the nation stands victorious.</div>`;
      } else if (!S.over && polCount < polNeed){
        html += `<div style="margin-top:8px;font-size:11.5px;color:var(--gold2);background:rgba(232,192,106,.08);border:1px solid rgba(232,192,106,.25);border-radius:10px;padding:6px 10px">⚖️ Nation-building: research & enact ${polNeed - polCount} more polic${polNeed - polCount === 1 ? "y" : "ies"} (${polCount}/${polNeed} — as many as the islands of the Marianas) to unlock the road to victory.</div>`;
      }
      // policies
      const eraIdxNow = eraIdx();
      const available = Object.values(POLICIES).filter(p => eraIdxNow >= ERAS.findIndex(e => e.id === p.era));
      const adopted = Object.values(POLICIES).filter(p => S.gov.policies && S.gov.policies[p.id]);
      const researching = Object.values(POLICIES).filter(p => S.gov.research && S.gov.research[p.id]);
      const canAdopt = available.filter(p => !(S.gov.policies && S.gov.policies[p.id]) && !(S.gov.research && S.gov.research[p.id]));
      if (adopted.length){
        html += `<div style="margin-top:12px"><div style="font-size:11px;color:var(--dim);letter-spacing:1px;text-transform:uppercase">Active policies — ${adopted.length} enacted</div>
          <div class="policy-grid">` +
          adopted.map(p => this.policyCard(p, true)).join("") +
          `</div></div>`;
      }
      if (researching.length){
        html += `<div style="margin-top:12px"><div style="font-size:11px;color:var(--dim);letter-spacing:1px;text-transform:uppercase">🔬 Researching — ${researching.length} in progress</div>
          <div class="policy-grid">` +
          researching.map(p => this.policyCard(p, "researching", S.gov.research[p.id])).join("") +
          `</div></div>`;
      }
      if (canAdopt.length){
        html += `<div style="margin-top:12px"><div style="font-size:11px;color:var(--dim);letter-spacing:1px;text-transform:uppercase">Available to research</div>
          <div class="policy-grid">` +
          canAdopt.map(p => this.policyCard(p, false)).join("") +
          `</div></div>`;
      }
    }
    html += `</div>`;

    // industry overview (future)
    if (S.industryUnlocked){
      html += `<div class="panel-card"><h3>National Industry Strategy <span class="sub">— each island its own engine</span></h3>`;
      const anyIndustry = accessibleIslands().some(id => S.islands[id].industry);
      if (!anyIndustry){
        html += `<div style="margin:0 0 10px;font-size:11.5px;color:var(--teal);background:rgba(63,214,176,.08);border:1px solid rgba(63,214,176,.25);border-radius:10px;padding:6px 10px">🌊 No centers assigned yet — click an industry for each island below to build the national economy. Centers earn gold and self-sufficiency each turn and can be upgraded with gold.</div>`;
      }
      for (const id of accessibleIslands()){
        const isl = S.islands[id];
        html += `<div style="margin-top:8px;border-top:1px solid var(--line);padding-top:6px">
          <b style="color:var(--gold2)">${ISLAND_DEFS[id].name}</b> ${isl.industry ? `<span style="color:var(--teal)">— ${INDUSTRIES[isl.industry].icon} ${INDUSTRIES[isl.industry].name} L${isl.industryLvl}</span>` : `<span style="color:var(--dim)">— no center yet</span>`}
          <div class="industry-row">`;
        for (const indId in INDUSTRIES){
          html += `<button class="ind-btn ${isl.industry === indId ? "active" : ""}" data-ind="${id}:${indId}">${INDUSTRIES[indId].icon} ${INDUSTRIES[indId].name}</button>`;
        }
        html += `</div></div>`;
      }
      html += `</div>`;
    }

    // culture note (Carolinian heritage only once the voyagers have arrived)
    const hasCarol = !!S.flags.carolinians;
    html += `<div class="panel-card"><h3>Culture &amp; Heritage</h3>
      <p class="empty-note">${S.culture >= 70 ? (hasCarol ? "Chamorro and Carolinian languages, dance, and voyaging traditions flourish openly." : "Chamorro language, dance, and voyaging traditions flourish openly.") :
        S.culture >= 45 ? "The old ways survive in kitchens, boats, and family gatherings — but the institutions of the wider world press in." :
        "The languages and customs of the ancestors are fading. Cultural centers, heritage sites, and open societies can revive them."}</p></div>`;

    el.innerHTML = html;

    // Load the era-art into the banner (assets/era-art/<era>.jpg) — same file
    // the era card and badge use, so it's already cached.
    const banner = el.querySelector("[data-era-banner]");
    if (banner){
      const probe = new Image();
      probe.onload = () => { banner.style.backgroundImage = `url('assets/era-art/${era.id}.jpg')`; banner.classList.add("has-art"); };
      probe.src = `assets/era-art/${era.id}.jpg`;
    }

    el.querySelectorAll("[data-ind]").forEach(btn => {
      const [iid, indId] = btn.dataset.ind.split(":");
      btn.addEventListener("click", () => setIndustry(iid, indId));
    });
    el.querySelectorAll("[data-policy-research]").forEach(btn => {
      btn.addEventListener("click", () => researchPolicy(btn.dataset.policyResearch));
    });
    el.querySelectorAll("[data-policy-adopt]").forEach(btn => {
      btn.addEventListener("click", () => adoptPolicy(btn.dataset.policyAdopt));
    });
    el.querySelectorAll("[data-policy-drop]").forEach(btn => {
      btn.addEventListener("click", () => dropPolicy(btn.dataset.policyDrop));
    });
    el.querySelectorAll("[data-gov]").forEach(btn => {
      btn.addEventListener("click", () => {
        S.gov.path = btn.dataset.gov;
        if (S.gov.path === "dem") S.gov.meter = 60;
        else if (S.gov.path === "aut") S.gov.meter = -60;
        else S.gov.meter = 0;
        log(String(S.year), S.era, "The Marianas choose the " + (S.gov.path === "dem" ? "democratic" : S.gov.path === "aut" ? "authoritarian" : "caretaker") + " path.", true);
        saveGame();
        this.refresh();
      });
    });
  },
  bigStat(ico, val, lbl, note){
    return `<div class="big-stat"><div class="bs-ico">${ico}</div><div class="bs-val">${val}</div><div class="bs-lbl">${lbl}</div><div class="bs-note">${note || ""}</div></div>`;
  },
  govOpt(path, name, desc){
    return `<button class="gov-opt" data-gov="${path}"><b>${name}</b><br><span style="color:var(--dim)">${desc}</span></button>`;
  },
  policyCard(p, active, turnsLeft){
    const tag = p.gov === "dem" ? "democratic" : p.gov === "aut" ? "authoritarian" : "all paths";
    let btn;
    if (active === true){
      btn = `<button class="drop" data-policy-drop="${p.id}">End policy</button>`;
    } else if (active === "researching"){
      btn = `<button class="drop" disabled title="Researching — enacted when complete">🔬 ${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left</button>`;
    } else {
      btn = `<button class="adopt" data-policy-research="${p.id}">🔬 Research (${p.research || 3} turns)</button>`;
    }
    return `<div class="policy-card ${active === true ? "adopted" : active === "researching" ? "researching" : ""}">
      <div class="pc-tag">${tag} · ${p.upkeep} 🪙/yr upkeep</div>
      <div class="pc-name">${p.icon} ${p.name}</div>
      <div class="pc-desc">${p.desc}</div>
      <div class="pc-meta">${this.effStr(p.effects)}</div>
      ${btn}
    </div>`;
  },
  effStr(eff){
    const m = { happiness:"😊", gold:"🪙", culture:"🏛️", selfSufficiency:"🌐", popGrowth:"👥", approval:"😊" };
    const parts = [];
    for (const k in eff) if (eff[k] !== 0) parts.push(`${m[k] || k} ${eff[k] > 0 ? "+" : ""}${eff[k]}`);
    return parts.join("  ");
  },

  /* ---------- story tab ---------- */
  renderStory(){
    const el = document.getElementById("tab-story");
    el.classList.add("col");
    const era = curEra();
    let html = `<div class="story-pane">`;

    html += `<div class="panel-card"><h3>${era.name} <span class="sub">${era.start}${era.end ? "–" + era.end : " — the future"}</span></h3>
      <p class="era-blurb">${era.blurb}</p></div>`;

    html += `<div class="goal-card"><b>Your goals</b> — ${this.goalsText()}</div>`;

    html += `<div class="panel-card" style="flex:1;display:flex;flex-direction:column;min-height:200px"><h3>Chronicle</h3>
      <div class="chron">`;
    const entries = S.history.slice().reverse();
    for (const h of entries){
      const eraInfo = ERA_BY_ID[h.era];
      html += `<div class="chron-entry ${h.hot ? "era-marker" : ""}">
        <div class="ce-year">${h.year} <span class="ce-era" style="color:${eraInfo ? eraInfo.color : "var(--dim)"}">${eraInfo ? eraInfo.short : h.era}</span></div>
        <div class="ce-text">${h.text}</div>
      </div>`;
    }
    html += `</div></div></div>`;
    el.innerHTML = html;
  },
  goalsText(){
    switch (S.era){
      case "ancient": return "grow your village on Saipan — build guma', farms, and canoes; raise latte stones; keep culture strong. The horizon will bring strangers soon enough.";
      case "contact": return "survive the age of first contact — trade carefully, limit the epidemics, and keep the Chamorro soul intact before the missions arrive in 1668.";
      case "spanish": return "endure Spanish rule without losing yourselves — preserve culture, welcome the Carolinians in 1815, and survive the coming end of the Spanish era.";
      case "german": return "keep the copra economy steady and the culture alive through the brief, orderly German years (1899–1914).";
      case "japanese": return "ride the sugar boom without surrendering the islands' soul — develop the north, and shield your people when the war comes in the 1940s.";
      case "american": return "rebuild from the ashes, educate a generation, and choose the political future that will carry the Marianas to self-rule.";
      case "commonwealth": return "navigate the federal transition period (2014 → 2019 → 2029) as the American union unravels — and be ready for the day the islands must stand alone.";
      default: return "guide the new nation to greatness — whether the reunified Chamorro Republic or the standalone Chamolinian Commonwealth — research and enact fifteen policies (as many as the islands of the Marianas), proclaim your sovereignty, and reach 60% self-sufficiency, 60% happiness, and 50% culture to forge a thriving island nation.";
    }
  },

  /* ---------- log bar ---------- */
  /* Collapsible Chronicle: on phones it starts minimized to a thin toggle
     strip so the game screen gets the space. Tap the toggle to expand/collapse.
     It auto-expands when a HOT (notable) entry is logged so the player notices,
     then they can re-minimize. */
  setupLog(){
    const logbar = document.getElementById("logbar");
    const toggle = document.getElementById("log-toggle");
    const minBtn = document.getElementById("log-min");
    if (!logbar) return;
    // Only auto-minimize on phone-sized screens; keep it open on desktop.
    const isPhone = window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
    const saveToggle = () => { try { localStorage.setItem("fanohge_log", logbar.classList.contains("dismissed") ? "0" : "1"); } catch(e){ } };

    const set = (collapsed) => {
      logbar.classList.toggle("dismissed", collapsed);
      logbar.classList.toggle("expanded", !collapsed);
      if (toggle){
        toggle.textContent = collapsed ? "▴" : "▾";
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      }
      // a manual collapse re-arms the auto-pop-on-hot so the next big event
      // pops the Chronicle open again.
      if (collapsed) this._logForcedOpenDismiss = false;
      saveToggle();
    };

    // Collapse / expand via the header toggle button.
    const onToggleClick = (e) => { e.stopPropagation(); set(!logbar.classList.contains("dismissed")); };
    if (toggle) toggle.addEventListener("click", onToggleClick);

    // The big, labeled "Minimize" button — always available when expanded so the
    // player ALWAYS has an obvious way to collapse the feed again in portrait.
    if (minBtn) minBtn.addEventListener("click", (e) => { e.stopPropagation(); set(true); });

    // tapping the header row toggles too (finger-friendly)
    const titleEl = logbar.querySelector("#log-title");
    if (titleEl) titleEl.addEventListener("click", (e) => {
      if (e.target === toggle || e.target === minBtn || minBtn && minBtn.contains(e.target)) return;
      set(!logbar.classList.contains("dismissed"));
    });

    // Restore saved preference, else default to minimized on phones.
    let saved = "1";
    try { saved = localStorage.getItem("fanohge_log"); } catch(e){ }
    if (isPhone && saved !== "1"){ set(true); }
    else if (saved === "0"){ set(true); }
    else { set(false); }
  },

  renderLog(){
    const el = document.getElementById("log-list");
    const count = document.querySelector(".log-count");
    if (count) count.textContent = "· " + S.history.length + " entries";
    const recent = S.history.slice(-9).reverse();
    el.innerHTML = recent.map(h => {
      const eraInfo = ERA_BY_ID[h.era];
      return `<div class="log-line ${h.hot ? "hot" : ""}"><b>${h.year}</b> <span style="color:${eraInfo ? eraInfo.color : "var(--dim)"}">[${eraInfo ? eraInfo.short : ""}]</span> ${h.text}</div>`;
    }).join("");
    // Auto-pop open when a notable (hot) event just landed, so the player sees it —
    // but only if the player hasn't intentionally collapsed it in this same pass.
    if (recent.length && recent[0].hot && !this._logForcedOpenDismiss){
      const logbar = document.getElementById("logbar");
      if (logbar && logbar.classList.contains("dismissed")){
        // expand to show the new event
        logbar.classList.remove("dismissed");
        logbar.classList.add("expanded");
        const t = document.getElementById("log-toggle");
        if (t){ t.textContent = "▾"; t.setAttribute("aria-expanded","true"); }
        this._logForcedOpenDismiss = true;   // re-collapse once after this burst
      }
    }
  },

  /* ---------- full refresh ---------- */
  refresh(){
    this.renderTop();
    this.renderMap();
    this.renderTab();
    this.renderLog();
  },

  /* ---------- toasts ---------- */
  toast(msg, icon){
    const root = document.getElementById("toast-root");
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `${icon ? `<span style="margin-right:6px">${icon}</span>` : ""}${msg}`;
    root.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .4s"; }, 3200);
    setTimeout(() => t.remove(), 3700);
  },

  /* play a named sound effect if the audio manager + asset exist */
  sfx(name){
    if (typeof AudioMgr !== "undefined" && AudioMgr.playSfx) AudioMgr.playSfx(name);
  },

  /* ---------- modals ---------- */
  pushModal(html, cls){
    const root = this.modalRoot();
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop " + (cls || "");
    wrap.dataset.modal = ++this.modalSeq;
    wrap.innerHTML = `<div class="modal">${html}</div>`;
    root.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    return { el: wrap, close };
  },

  showIntro(hasSave){
    const eraChips = ERAS.map(e =>
      `<div class="intro-era"><span class="dot" style="background:${e.color}"></span><span class="yr">${e.start}${e.end ? "–" + e.end : "+"}</span> ${e.name}</div>`
    ).join("");
    const m = this.pushModal(`
      <div class="m-kicker">A Saga of Civilization in the Pacific</div>
      <h2>Fanohge — The Marianas</h2>
      <div class="m-year">From Latte Stones to Nationhood · 1300 CE onward</div>
      <div class="m-text">
        <p>You are the people of the Marianas — Chamorro and Carolinian, voyagers and survivors. Guide your islands from a fledgling village on Saipan, through Spanish missions, German ledgers, Japanese sugar mills, American bases, and Commonwealth halls…</p>
        <p>Then, when the long colonial arc is done, take the archipelago into a future of your own making: reunify Guam with the north, build a self-sustaining island nation, and choose whether to lead it democratically or with an iron hand.</p>
        <p class="m-hint">⏳ Tip: use the time-scale selector in the top bar to speed history up — 8× will carry you across the centuries in a handful of turns. Watch your islands grow: every building you raise appears on the map.</p>
        <div class="m-quote">"The island gives everything. The people decide what to do with it."</div>
      </div>
      <div class="intro-eras">${eraChips}</div>
      <div class="howto">
        <b>How to play:</b> Advance time to grow your villages and gather resources. Build from the island panel. When the conch sounds — a story decision awaits; your choices shape history, culture, and survival. Watch the archipelago map as eras come and go.
      </div>
      <div class="btn-row">
        ${hasSave ? `<button class="btn-primary" data-continue="1">Continue the Saga</button>` : ""}
        <button class="btn-primary" data-begin="1">${hasSave ? "Begin Anew" : "Begin the Saga"}</button>
      </div>
    `, "intro-modal");
    if (hasSave) m.el.querySelector("[data-continue]").addEventListener("click", () => { m.close(); this.refresh(); continueEvents(); });
    m.el.querySelector("[data-begin]").addEventListener("click", () => {
      clearSave();
      newGame();
      m.close();
      this.refresh();
      continueEvents();
    });
  },

  showDecision(ev){
    // conch sound announces a decision awaits
    this.sfx("conch");
    // remove any existing decision modals so only the newest shows
    this.modalRoot().querySelectorAll(".modal-backdrop.decision-modal").forEach(x => x.remove());
    const goTab = (ev.id === "governance_guide_2029" || ev.id === "specialization_unlock") ? " data-gotab=\"people\"" : "";
    const m = this.pushModal(`
      <div class="m-kicker" style="color:var(--gold)">A decision awaits · ${ev.era ? ERA_BY_ID[ev.era].short : ""} ${S.year}</div>
      <h2>${ev.title}</h2>
      <div class="m-text">${ev.text.split("\n\n").map(p => `<p>${p}</p>`).join("")}</div>
      <div class="choice-list">
        ${ev.choices.map((c, i) => `
          <button class="choice" data-choice="${i}"${goTab}>
            <div class="c-label">${c.label}</div>
            ${c.hint ? `<div class="c-hint">${c.hint}</div>` : ""}
          </button>`).join("")}
      </div>
    `, "decision-modal");
    m.el.querySelectorAll("[data-choice]").forEach(btn => {
      btn.addEventListener("click", () => {
        m.close();
        chooseDecision(parseInt(btn.dataset.choice, 10));
        if (btn.dataset.gotab) this.goTab(btn.dataset.gotab);
      });
    });
  },

  goTab(tab){
    const b = document.querySelector('#tabs .tab[data-tab="' + tab + '"]');
    if (b) b.click();
  },

  showEraCard(era){
    const milestones = {
      ancient:   ["First contact — Magellan's ships, 1521", "The Age of Contact begins", "Spanish missions arrive, 1668"],
      contact:   ["San Vitores founds the mission, 1668", "Hurao's revolt, 1670", "The reduction to Guam, 1698"],
      spanish:   ["Carolinian voyagers settle Saipan, 1815", "Spanish-American War, 1898 — Guam is lost to the U.S.", "Germany buys the northern islands, 1899"],
      german:    ["WWI — Japan seizes the islands, 1914"],
      japanese:  ["The sugar boom of the 1920s–30s", "Settlements in the northern islands", "Battle of Saipan, 1944 — the islands fall to the U.S."],
      american:  ["The Trust Territory, 1947", "Congress of Micronesia, 1965", "The Commonwealth plebiscite, 1976"],
      commonwealth:["The garment boom, 1980s", "Federalization & the long transition, 2009", "Labor movements & strikes, 2010s", "The transition stretched to 2019, then 2029", "The American union dissolves, 2028"],
      future:    ["Island specialization strategy", "The nation is proclaimed — 2029", "Reunify with Guam — or stand alone", "Sovereignty at last — the Declaration, 2032"],
    };
    const m = this.pushModal(`
      <div class="era-card-wrap">
        <div class="era-art" data-era-art="${era.id}">
          <div class="era-art-ph"><span>🖼️</span></div>
        </div>
        <div class="m-kicker" style="color:${era.color}">A new era dawns</div>
        <h2>${era.name}</h2>
        <div class="m-year era-years">${era.start}${era.end ? " — " + era.end : " — the future, unwritten"}</div>
        <div class="m-text"><p>${era.blurb}</p></div>
        <ul class="milestone-list">${(milestones[era.id] || []).map(x => `<li>${x}</li>`).join("")}</ul>
        <button class="btn-primary" data-era-continue="1">Continue</button>
      </div>
    `, "era-modal");
    // cinematic backdrop: load assets/era-art/<id>.jpg when present; else keep the
    // elegant placeholder so the card never looks broken without art.
    const artSlot = m.el.querySelector("[data-era-art]");
    const probe = new Image();
    probe.src = `assets/era-art/${era.id}.jpg`;
    probe.onload = () => {
      artSlot.style.backgroundImage = `url('assets/era-art/${era.id}.jpg')`;
      artSlot.style.backgroundSize = "cover";
      artSlot.style.backgroundPosition = "center";
      artSlot.classList.add("has-art");
      const ph = artSlot.querySelector(".era-art-ph");
      if (ph) ph.remove();
    };
    probe.onerror = () => {
      artSlot.classList.add("no-art");
    };
    m.el.querySelector("[data-era-continue]").addEventListener("click", () => m.close());
  },

  showEnding(outcome){
    this.sfx(outcome === "victory" ? "victory" : "collapse");
    let kicker, title, body;
    if (outcome === "victory"){
      kicker = "🏝️ The Saga is Complete";
      title = "The Sovereign Marianas";
      const united = !!S.flags.reunified;
      const nat = S.flags.nationality === "chamorro"
        ? "The Chamorro Republic of the Marianas"
        : S.flags.nationality === "chamolinian"
          ? "The Chamolinian Commonwealth of the Pacific"
          : "The Republic of the Marianas";
      const extent = united
        ? "from the volcanic cone of Farallon de Pajaros to the shores of Guam"
        : "from the volcanic cone of Farallon de Pajaros to the southern reef — one commonwealth, whole and self-sufficient, watching the strait that leads to Guam";
      body = `<div class="ending-banner">Independent. ${united ? "Reunified. " : ""}Self-sufficient. At peace with the world and with themselves.</div>
        <div class="m-text">
        <p>${nat} — ${extent} — stands as one nation, self-governing and self-sustaining.</p>
        <p>Chamorro and Carolinian voices fill the halls of the new capital. The old languages are taught in every school. The latte stones, once abandoned to the jungle, watch over a people who never forgot them.</p>
        <p class="hi">After a thousand years of empires, the islands belong to themselves — and they belong to their people.</p>
        <div class="m-quote">"Fanohge — we planted it ourselves."</div>
        </div>
        <div class="m-text" style="font-size:12px;color:var(--dim)">Final year: ${S.year} · Turns played: ${S.turn} · Decisions made: ${S.stats.decisions} · Happiness ${Math.round(S.happiness)}% · Culture ${Math.round(S.culture)}% · Self-sufficiency ${Math.round(S.selfSufficiency)}%</div>`;
    } else if (outcome === "collapse"){
      kicker = "🌫️ The Islands Fall Silent";
      title = "A Dream Dissolved";
      body = `<div class="ending-banner">The people have lost faith. The villages empty, the boats stop sailing, and the Marianas sink into chaos and emigration.</div>
        <div class="m-text">
        <p>History will record that the islands — so close to nationhood — were undone by hunger, fear, and broken trust. The conch sounds no more.</p>
        <p class="red">Somewhere, the latte stones still stand. They have outlasted every empire. They will wait for another people to remember them.</p></div>`;
    } else {
      kicker = "⏳ The Long Commonwealth";
      title = "The Dream Deferred";
      body = `<div class="ending-banner">The century turns. The Marianas endure — prosperous, peaceful, and still not wholly their own.</div>
        <div class="m-text">
        <p>Reunification remains a flag raised at festivals. The Declaration is drafted and shelved, year after year. The islands are free in fact, comfortable in daily life — and still half of what they might have been.</p>
        <p class="hi">The dream is not dead — only waiting for a leader bold enough to carry it.</p></div>`;
    }
    const m = this.pushModal(`
      <div class="m-kicker">${kicker}</div>
      <h2>${title}</h2>
      ${body}
      <div class="btn-row">
        <button class="btn-primary" data-restart="1">Begin a New Saga</button>
      </div>
    `, "ending-modal");
    m.el.querySelector("[data-restart]").addEventListener("click", () => {
      clearSave();
      newGame();
      m.close();
      this.refresh();
      continueEvents();
    });
  },
};

/* boot */
window.addEventListener("DOMContentLoaded", () => UI.init());
