/* ============================================================
   FANOHGE — The Marianas Saga  ·  audio.js
   Era-dynamic ambient music + UI sound effects.
   All playback is OPTIONAL: if an asset file is absent the
   feature silently skips (no console spam, no broken audio).
   Assets live under assets/audio/ — drop MP3s there to activate.
   ============================================================ */
/* global window, document */

const AUDIO_SETTINGS = {
  volume: 0.6,
};

/* Tracks for the era-scaled score. Keyed by era id.
   When a file is missing we fall back to the nearest earlier era
   that has a file, so a partial set still gives continuous music. */
const ERA_TRACKS = {
  ancient:     "assets/audio/era-ancient.mp3",
  contact:     "assets/audio/era-contact.mp3",
  spanish:     "assets/audio/era-spanish.mp3",
  german:      "assets/audio/era-german.mp3",
  japanese:    "assets/audio/era-japanese.mp3",
  american:    "assets/audio/era-american.mp3",
  commonwealth:"assets/audio/era-commonwealth.mp3",
  future:      "assets/audio/era-future.mp3",
};

/* Short UI / event sounds. Keep tiny (a few KB each). */
const SFX = {
  click:   "assets/audio/sfx-click.mp3",
  build:   "assets/audio/sfx-build.mp3",
  conch:   "assets/audio/sfx-conch.mp3",
  raid:    "assets/audio/sfx-raid.mp3",
  victory: "assets/audio/sfx-victory.mp3",
  collapse:"assets/audio/sfx-collapse.mp3",
};

const AudioMgr = {
  ctx: null,
  current: null,        // playing <audio> element for music
  eraId: null,          // era the current music belongs to
  enabled: true,
  assets: {},           // cached map filename -> boolean (exists)
  triedStatic: new Set(),
  _sfxCache: {},
  _titleActive: false,  // title-screen music is the active layer
  _titleSrc: null,      // current title audio src (to avoid loop restarts)

  /* Lazy-create the AudioContext (must be after a user gesture). */
  ensure(){
    if (this.ctx || typeof window === "undefined") return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch (e){ /* audio unavailable — stay silent */ }
  },

  /* Enable/disable all sound. Persist preference. */
  toggle(on){
    this.enabled = on;
    try { window.localStorage.setItem("fanohge_audio", on ? "1" : "0"); } catch(e){}
    if (!on) this.stop();
    else if (this._titleActive) this.playTitle();
    else if (this.eraId) this.playEra(this.eraId);
  },

  /*
    Prefer: fetch HEAD of the full path (works in the game's http server).
    Fallback: if the fetch throws/fails, try a HEAD of the filename alone so
    a static host serving from the project root still resolves it.
    Returns a Promise<boolean>.
  */
  assetExists(url){
    if (this.assets[url] !== undefined) return Promise.resolve(this.assets[url]);
    if (typeof fetch !== "function") return Promise.resolve(false); // no network in this environment
    const mark = (v) => { this.assets[url] = v; return v; };
    let cur = url;
    if (cur.startsWith("./")) cur = cur.slice(2);
    const probe = (u) =>
      fetch(u, { method: "HEAD", cache: "no-cache" })
        .then(r => mark(r.ok))
        .catch(() => {
          // try basename as a fallback for static hosts
          const base = u.split("/").pop();
          if (!base || this.triedStatic.has(url)) return mark(false);
          this.triedStatic.add(url);
          return fetch(base, { method: "HEAD", cache: "no-cache" })
            .then(r => mark(r.ok))
            .catch(() => mark(false));
        });
    return probe(cur);
  },

  /* Switch the looping music to the given era. Crossfades from the
     previous track if both exist. */
  playEra(eraId){
    if (!this.enabled) { this.eraId = eraId; return; }
    // (re)create context in case it was suspended
    this.ensure();
    if (eraId === this.eraId && this.current){
      if (!this.current.paused) return;            // already playing — no-op
      // Same era, but element is paused (e.g. autoplay was blocked at boot).
      // Resume it in place instead of rebuilding a fresh element.
      try {
        if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
        this.current.play().catch(()=>{});
      } catch(e){}
      return;
    }
    this.eraId = eraId;
    // find nearest available track (walk back through eras so a partial
    // asset set still yields continuous music)
    const order = ["ancient","contact","spanish","german","japanese","american","commonwealth","future"];
    const probe = (i) => {
      if (i < 0) return Promise.resolve(null);
      const file = ERA_TRACKS[order[i]];
      return this.assetExists(file).then(exists => exists ? file : probe(i - 1));
    };
    probe(order.indexOf(eraId)).then(file => {
      if (!file || eraId !== this.eraId) return; // none available / era moved on
      this.ensure();
      const fadeOut = () => { try { if (this.current){ this.current.volume = 0; } } catch(e){} };
      const newEl = new Audio();
      newEl.src = file;
      newEl.loop = true;
      newEl.volume = 0;
      newEl.addEventListener("canplaythrough", () => {
        try {
          if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
        } catch(e){}
        newEl.play().catch(()=>{});
        // fade in
        const step = 0.05;
        const v = AUDIO_SETTINGS.volume;
        let t = 0;
        const ramp = setInterval(() => {
          t += step;
          if (t >= 1){ clearInterval(ramp); newEl.volume = v; }
          else newEl.volume = v * t;
        }, 90);
        fadeOut();
      });
      const oldEl = this.current;
      this.current = newEl;
      try { if (oldEl) oldEl.pause(); } catch(e){}
    });
  },

  /* One-shot UI / event sound. */
  playSfx(name){
    if (!this.enabled) return;
    const url = SFX[name];
    if (!url) return;
    this.assetExists(url).then(exists => {
      if (!exists) return;
      try {
        this.ensure();
        const a = new Audio();
        a.src = url;
        a.volume = AUDIO_SETTINGS.volume;
        a.play().catch(()=>{});
      } catch(e){}
    });
  },

  stop(){
    try { if (this.current){ this.current.pause(); this.current = null; } } catch(e){}
  },

  /* Title-screen music: loops assets/audio/titlescreen.mp3. Optional — if the
     file is absent this silently does nothing (consistent with the rest of
     the optional-audio system). */
  playTitle(){
    this._titleActive = true;
    const file = "assets/audio/titlescreen.mp3";
    this.assetExists(file).then(exists => {
      if (!this._titleActive) return;      // toggled/left while probing
      if (!exists){ try { if (this.current) this.current.pause(); } catch(e){} return; }
      if (!this.enabled) return;
      this.ensure();
      if (this.current){
        // Already the title track. Only short-circuit if it's genuinely playing;
        // if it's paused (e.g. autoplay blocked the first attempt before a user
        // gesture), go ahead and retry so music starts the moment it's allowed.
        if (this._titleSrc && this.current.src && this.current.src.endsWith(file)
            && !this.current.paused) return;
        try { this.current.pause(); } catch(e){}
      }
      const el = new Audio();
      el.src = file;
      el.loop = true;
      el.volume = 0;
      el.autoplay = true;   // best-effort start; play() also called on canplaythrough
      el.addEventListener("canplaythrough", () => {
        try { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); } catch(e){}
        el.play().catch(()=>{});
        const v = AUDIO_SETTINGS.volume;
        let t = 0;
        const ramp = setInterval(() => {
          t += 0.07;
          if (t >= 1){ clearInterval(ramp); el.volume = v; }
          else el.volume = v * t;
        }, 80);
      });
      try { el.play().catch(()=>{}); } catch(e){}
      this.current = el;
      this._titleSrc = file;
    });
  },

  /* Stop title-screen music and clear the active flag. */
  stopTitle(){
    this._titleSrc = null;
    this._titleActive = false;
    try { if (this.current){ this.current.pause(); this.current = null; } } catch(e){}
  },

  /* Exit-the-page / hide-the-view handling: when the game document is no
     longer visible (tab switched, preview pane cleared, user clicks out to
     the chat), stop any looping music so it does not keep playing behind
     other work. `current` is left in place so it can be resumed when the
     view returns. */
  pauseForBackground(){
    if (!this.ctx || !this.current) { return; }
    try { if (this.ctx.state === "running" && this.ctx.suspend) this.ctx.suspend(); } catch(e){}
    try { this.current.pause(); } catch(e){}
  },

  /* Resume the currently-armed music when the view becomes visible again
     (only if the user has sound enabled and this page is actually active).
     IMPORTANT: this resumes the EXISTING element in place so the music
     continues from where it was paused — never rebuilds/restarts it. */
  resumeForForeground(){
    if (!this.enabled) { return; }
    this.ensure();
    try { if (this.ctx && this.ctx.state === "suspended" && this.ctx.resume) this.ctx.resume(); } catch(e){}
    // If there's an element armed (title OR era), resume it in place rather
    // than restarting the loop from the top.
    if (this.current){
      try { if (this.current.paused) this.current.play().catch(()=>{}); } catch(e){}
      return;
    }
    // No element yet — arm music from scratch (title screen or era track).
    if (this._titleActive){ this.playTitle(); return; }
    if (this.eraId){ this.playEra(this.eraId); return; }
  },

  /* Resume whatever music is currently armed. Called once audio becomes
     allowed (first user gesture) because browsers block autoplay before that.
     Replays the title theme if the title screen is up, else the era track. */
  resumeMusic(){
    if (!this.enabled) return;
    this.ensure();
    if (this._titleActive){
      this.playTitle();
      return;
    }
    if (this.eraId){
      this.playEra(this.eraId);
      return;
    }
    try { if (this.current && this.current.paused){ this.current.play().catch(()=>{}); } } catch(e){}
  },
};

/* Auto-init: resume on first user interaction (browser autoplay rules). */
if (typeof window !== "undefined"){
  const boot = () => {
    AudioMgr.enabled = !(window.localStorage.getItem("fanohge_audio") === "0");
    AudioMgr.ensure();
    if (AudioMgr.enabled) AudioMgr.resumeMusic();
    window.removeEventListener("pointerdown", boot);
    window.removeEventListener("keydown", boot);
  };
  window.addEventListener("pointerdown", boot, { once: true });
  window.addEventListener("keydown", boot, { once: true });

  // Stop looping music when this page/view is no longer visible (hidden tab,
  // preview pane cleared, or user switches away to the chat). Resume it when
  // the view comes back, if sound is still enabled. Using both visibilitychange
  // and pagehide covers tab switches, iframe hiding, and full teardown.
  const onVis = () => { if (document.hidden) AudioMgr.pauseForBackground(); else AudioMgr.resumeForForeground(); };
  const onHide = () => AudioMgr.pauseForBackground();
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onHide);
  // NOTE: we deliberately do NOT pause on window "blur". Blur fires constantly
  // during normal play (tapping a modal button, focusing the canvas, the era
  // popup clearing, etc.) and has no matching "shown again" event — so music
  // paused on blur would never resume. Only genuine page-hide/visibility
  // changes should stop the score. This was why era music died as soon as the
  // first era popup was dismissed.
  // Safety net: whenever the game view regains focus, make sure the score is
  // actually playing (resumes in place, or re-arms the current era/title).
  window.addEventListener("focus", () => { try { AudioMgr.resumeForForeground(); } catch(e){} });
  document.addEventListener("pointerdown", () => { try { AudioMgr.resumeForForeground(); } catch(e){} });

  // Watchdog: some mobile WebViews silently pause/suspend audio without firing
  // any event we can hook. Every few seconds, if the game is visible, sound is
  // on, and a track is armed (title or era) but its element is paused, resume
  // it in place. Cheap, runs only while the document is visible, and never
  // restarts a playing track.
  setInterval(() => {
    try {
      if (document.hidden) return;
      if (!AudioMgr.enabled) return;
      if (!AudioMgr._titleActive && !AudioMgr.eraId) return;
      if (AudioMgr.ctx && AudioMgr.ctx.state === "suspended" && AudioMgr.ctx.resume) AudioMgr.ctx.resume();
      if (AudioMgr.current && AudioMgr.current.paused){
        AudioMgr.current.play().catch(()=>{});
      } else if (!AudioMgr.current){
        // Element lost entirely (e.g. recreated view) — re-arm the score.
        AudioMgr.resumeForForeground();
      }
    } catch(e){ /* audio is optional */ }
  }, 2500);
}

if (typeof window !== "undefined") window.AudioMgr = AudioMgr;
