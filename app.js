/* Operations HQ — local-first chief-of-staff app with time tracking.
   Data is stored in this browser (localStorage). No server, no tracking.
   Google Calendar is optional and connects directly from your browser. */

(function () {
  "use strict";

  var KEY = "ops_hq_v2";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function todayLabel() {
    return new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  }
  function nowISO() { return new Date().toISOString(); }
  function dayKey(d) { d = d || new Date(); return d.toISOString().slice(0, 10); }

  /* which project does a task belong to? infer from its text, else "Other" */
  var PROJECT_HINTS = [
    ["English Partner", /english partner|recharge|meta \+ google/i],
    ["Avanzar Health", /avanzar/i],
    ["Vasantha", /vasantha|ems|smt|pcb|landing page|associate|box build|turnkey/i]
  ];
  function projectOf(text) {
    for (var i = 0; i < PROJECT_HINTS.length; i++) if (PROJECT_HINTS[i][1].test(text)) return PROJECT_HINTS[i][0];
    return "Other";
  }

  function seed() {
    return {
      meta: { updated: nowISO() },
      daily: {
        critical: [
          { t: "Keep English Partner ads live (recharge + check)", d: false },
          { t: "Prep Avanzar kickoff questions before Wednesday", d: false },
          { t: "Write Vasantha homepage EMS positioning statement", d: false }
        ],
        deep: [{ t: "Vasantha — positioning statement + approve page structure", d: false }],
        quick: [
          { t: "English Partner — daily recharge", d: false },
          { t: "English Partner — ad check (Meta + Google)", d: false },
          { t: "Brief associate on this week's Vasantha tasks", d: false }
        ],
        follow: [
          { t: "Confirm Avanzar Wednesday start time + scope", d: false },
          { t: "Review associate's competitor research", d: false }
        ],
        mon: [{ t: "English Partner — performance + expense/portal check", d: false }],
        strat: [{ t: "Vasantha — lock phase sequence + weekly cadence", d: false }]
      },
      sprint: {
        current: [
          { t: "Vasantha — EMS homepage positioning statement", d: false, o: "you" },
          { t: "Vasantha — approve landing page structure (6 pages)", d: false, o: "you" },
          { t: "Find 5–10 reference EMS websites + 1 line each", d: false, o: "assoc" },
          { t: "Gather facility photos + videos into one folder", d: false, o: "assoc" },
          { t: "Draft raw copy: SMT + PCB Assembly pages", d: false, o: "assoc" }
        ],
        upcoming: [
          { t: "Edit associate drafts to client-ready (6 pages)", d: false, o: "you" },
          { t: "Draft raw copy: Box Build + Turnkey pages", d: false, o: "assoc" },
          { t: "Draft raw copy: Contract Mfg + Prototype pages", d: false, o: "assoc" },
          { t: "Start prospect list in Sales Nav + Apollo", d: false, o: "assoc" }
        ],
        backlog: [
          { t: "Approve LinkedIn content calendar (Phase 2)", d: false, o: "you" },
          { t: "Build LinkedIn content calendar draft", d: false, o: "assoc" },
          { t: "SEO keyword research for landing pages", d: false, o: "assoc" },
          { t: "Avanzar — scope + deliverables (after kickoff)", d: false, o: "you" }
        ]
      },
      projects: [
        { name: "English Partner", goal: "Maintain & grow ad performance for paying retainer (live income)", status: "Active / ongoing", milestone: "Unbroken daily continuity", prio: "High", risks: "Budget dries if recharge missed; performance dips if checks skipped", updated: nowISO() },
        { name: "Avanzar Health", goal: "Deliver on new client commitment (4 hrs/day typical, 1–6 range)", status: "Starts Wednesday", milestone: "Kickoff + scope lock", prio: "High", risks: "Scope undefined; variable hours squeeze other projects", updated: nowISO() },
        { name: "Vasantha Advanced Systems", goal: "Generate offshore OEM/EMS customers via LinkedIn, email, SEO, events", status: "Not started — directing 1 full-time associate", milestone: "Phase 1 website positioning (months 1–2)", prio: "High", risks: "Associate is learning — needs bounded tasks, examples, deadlines, review on every output", updated: nowISO() }
      ],
      recurring: [
        { name: "English Partner — daily recharge", freq: "Daily", last: "" },
        { name: "English Partner — ad check (Meta + Google)", freq: "Daily", last: "" },
        { name: "English Partner — expense + portal check", freq: "Weekly", last: "" },
        { name: "Vasantha — review associate output + reassign", freq: "Daily", last: "" },
        { name: "Vasantha — 3 educational LinkedIn posts", freq: "Weekly", last: "" },
        { name: "Vasantha — 2 facility showcase posts", freq: "Weekly", last: "" },
        { name: "Vasantha — 1 long-form article", freq: "Monthly", last: "" }
      ],
      /* time tracking */
      timer: { activeList: null, activeI: null, startedAt: null }, /* the one running task */
      log: []  /* entries: { date:"YYYY-MM-DD", project:"", task:"", seconds: N } */
    };
  }

  var DB;
  function load() {
    try { var raw = localStorage.getItem(KEY); DB = raw ? JSON.parse(raw) : seed(); }
    catch (e) { DB = seed(); }
    if (!DB.timer) DB.timer = { activeList: null, activeI: null, startedAt: null };
    if (!DB.log) DB.log = [];
  }
  function save() {
    DB.meta.updated = nowISO();
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast("Could not save — storage blocked"); }
  }

  function esc(s) { return (s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function freqDays(f) { return { Daily: 1, "2× / week": 3, Weekly: 7, Fortnightly: 14, Monthly: 30 }[f] || 9999; }
  function daysSince(iso) { if (!iso) return null; return Math.floor((Date.now() - new Date(iso)) / 86400000); }

  var toastTimer;
  function toast(msg) {
    var el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  /* ---------- time helpers ---------- */
  function fmt(sec) {
    sec = Math.round(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h) return h + "h " + (m < 10 ? "0" : "") + m + "m";
    if (m) return m + "m " + (s < 10 ? "0" : "") + s + "s";
    return s + "s";
  }
  function fmtHours(sec) { return (sec / 3600).toFixed(1) + " h"; }
  function isActive(listName, i) { return DB.timer.activeList === listName && DB.timer.activeI === i; }
  function liveSeconds() { return DB.timer.startedAt ? (Date.now() - DB.timer.startedAt) / 1000 : 0; }

  /* bank the currently running timer into the log, clear active */
  function bankActive() {
    if (DB.timer.activeList === null) return;
    var sec = liveSeconds();
    if (sec >= 1) {
      var arr = path(DB, DB.timer.activeList);
      var item = arr && arr[DB.timer.activeI];
      var text = item ? item.t : "(removed task)";
      DB.log.push({ date: dayKey(), project: item ? taskProject(item) : projectOf(text), task: text, seconds: Math.round(sec) });
    }
    DB.timer = { activeList: null, activeI: null, startedAt: null };
  }
  function startTimer(listName, i) {
    if (isActive(listName, i)) return;       /* already running */
    bankActive();                            /* auto-pause whatever was running */
    DB.timer = { activeList: listName, activeI: i, startedAt: Date.now() };
    save(); renderAll(); toast("Timer started");
  }
  function pauseTimer() { bankActive(); save(); renderAll(); toast("Paused & saved"); }

  /* total seconds logged today for a task text */
  function loggedFor(text, onlyToday) {
    var tk = dayKey();
    return DB.log.reduce(function (sum, e) {
      if (e.task !== text) return sum;
      if (onlyToday && e.date !== tk) return sum;
      return sum + e.seconds;
    }, 0);
  }

  /* project options for dropdowns, drawn from the real project list + Other */
  function projectNames() {
    var names = DB.projects.map(function (p) { return p.name; });
    if (names.indexOf("Other") === -1) names.push("Other");
    return names;
  }
  /* the project a task belongs to: stored value wins, else guess from text */
  function taskProject(it) {
    if (it && it.p) return it.p;
    return projectOf(it ? it.t : "");
  }
  function projectSelect(idAttr, listName) {
    var opts = projectNames().map(function (n) { return '<option>' + esc(n) + '</option>'; }).join("");
    return '<select class="psel" data-' + idAttr + '="' + listName + '">' + opts + '</select>';
  }
  function projTag(name) {
    if (!name || name === "Other") return "";
    return '<span class="ptag" style="background:' + (PROJ_SOFT[name] || "var(--surface-2)") + ';color:' + (projColor(name)) + ';">' + esc(name) + '</span>';
  }

  /* ---------- task rendering with timer controls ---------- */
  function timerControls(listName, i, text) {
    var active = isActive(listName, i);
    var banked = loggedFor(text, true);
    var live = active ? liveSeconds() : 0;
    var total = banked + live;
    var readout = total >= 1 ? '<span class="time' + (active ? " run" : "") + '">' + fmt(total) + '</span>' : "";
    var btn = active
      ? '<button class="tbtn pause" data-act="pause" aria-label="Pause">❚❚</button>'
      : '<button class="tbtn play" data-act="play" data-list="' + listName + '" data-i="' + i + '" aria-label="Start">▶</button>';
    return '<span class="ctl">' + readout + btn + '</span>';
  }
  function ownerTag(o) {
    if (o === "you") return '<span class="owner you">You</span>';
    if (o === "assoc") return '<span class="owner assoc">Assoc</span>';
    return "";
  }
  function taskRows(arr, listName, withTimer) {
    if (!arr.length) return '<div class="empty">Nothing here yet.</div>';
    return arr.map(function (it, i) {
      return '<div class="row">' +
        '<button class="box ' + (it.d ? "on" : "") + '" data-act="toggle" data-list="' + listName + '" data-i="' + i + '" aria-label="Toggle">' + (it.d ? "✓" : "") + '</button>' +
        '<div class="txt ' + (it.d ? "on" : "") + '">' + esc(it.t) + ownerTag(it.o) + projTag(taskProject(it)) + '</div>' +
        (withTimer ? timerControls(listName, i, it.t) : "") +
        '<button class="rm" data-act="del" data-list="' + listName + '" data-i="' + i + '" aria-label="Remove">×</button>' +
        '</div>';
    }).join("");
  }

  var DAILY_SECTIONS = [
    ["crit", "critical", "Top 3 critical outcomes"],
    ["", "deep", "Deep work"],
    ["quick", "quick", "Quick wins · under 15 min"],
    ["follow", "follow", "Follow-ups"],
    ["mon", "mon", "Monitoring"],
    ["", "strat", "Strategic"]
  ];
  function renderDaily() {
    var html = '<p class="daystamp">' + todayLabel() + '</p>';
    DAILY_SECTIONS.forEach(function (s) {
      var cls = s[0] ? " " + s[0] : "", key = "daily." + s[1];
      html += '<div class="block' + cls + '"><h2>' + s[2] + '</h2>' +
        taskRows(DB.daily[s[1]], key, true) +
        '<div class="add"><input placeholder="Add…" data-addinput="' + key + '">' + projectSelect("addproj", key) + '<button data-addbtn="' + key + '">Add</button></div></div>';
    });
    $("#daily").innerHTML = html;
  }

  function sprintCol(title, key) {
    var arr = DB.sprint[key], open = arr.filter(function (x) { return !x.d; }).length;
    return '<div class="block"><h2>' + title + ' <span class="count">(' + open + ')</span></h2>' +
      taskRows(arr, "sprint." + key, true) +
      '<div class="add"><input placeholder="Add…" data-addinput="sprint.' + key + '">' + projectSelect("addproj", "sprint." + key) + '<button data-addbtn="sprint.' + key + '">Add</button></div></div>';
  }
  function renderSprint() {
    $("#sprint").innerHTML = '<div class="cols">' +
      sprintCol("Current sprint", "current") +
      sprintCol("Upcoming", "upcoming") +
      sprintCol("Backlog", "backlog") + '</div>';
  }

  var editingProj = null; /* index of project being edited, or null */
  function renderProjects() {
    var html = '<div class="note">A project untouched for <b>4+ days</b> gets flagged below. Tap <b>Edit</b> on any project to update its particulars as you learn them.</div>';
    DB.projects.forEach(function (p, i) {
      if (editingProj === i) {
        html += '<div class="proj"><div class="name" style="margin-bottom:10px;">Editing: ' + esc(p.name) + '</div>' +
          '<input class="field" id="ep_name" value="' + esc(p.name) + '" placeholder="Project name">' +
          '<input class="field" id="ep_goal" value="' + esc(p.goal || "") + '" placeholder="Business goal">' +
          '<input class="field" id="ep_status" value="' + esc(p.status || "") + '" placeholder="Current status">' +
          '<input class="field" id="ep_mile" value="' + esc(p.milestone || "") + '" placeholder="Next milestone">' +
          '<input class="field" id="ep_risks" value="' + esc(p.risks || "") + '" placeholder="Risks">' +
          '<select class="field" id="ep_prio">' +
            ['High', 'Medium', 'Low'].map(function (o) { return '<option' + (p.prio === o ? ' selected' : '') + '>' + o + '</option>'; }).join("") +
          '</select>' +
          '<div style="display:flex;gap:8px;"><button class="btn primary" data-act="saveproj" data-i="' + i + '" style="flex:1;">Save</button>' +
          '<button class="btn" data-act="canceledit" style="flex:1;">Cancel</button></div></div>';
        return;
      }
      var stale = daysSince(p.updated);
      var flag = (stale !== null && stale >= 4) ? '<div class="flag">Ignored ' + stale + ' days — check in</div>' : "";
      html += '<div class="proj"><div class="top"><div class="name">' + esc(p.name) + '</div>' +
        '<div><span class="tag ' + p.prio + '">' + (p.prio || "—") + '</span> ' +
        '<button class="btn" data-act="editproj" data-i="' + i + '" style="padding:4px 10px;font-size:12px;">Edit</button> ' +
        '<button class="rm" data-act="delproj" data-i="' + i + '" aria-label="Remove">×</button></div></div>' +
        (p.goal ? '<div class="kv"><b>Goal</b><span>' + esc(p.goal) + '</span></div>' : "") +
        (p.status ? '<div class="kv"><b>Status</b><span>' + esc(p.status) + '</span></div>' : "") +
        (p.milestone ? '<div class="kv"><b>Next</b><span>' + esc(p.milestone) + '</span></div>' : "") +
        (p.risks ? '<div class="kv"><b>Risks</b><span>' + esc(p.risks) + '</span></div>' : "") +
        flag + '</div>';
    });
    html += '<div class="proj"><div class="name" style="margin-bottom:10px;">Add a project</div>' +
      '<input class="field" id="np_name" placeholder="Project name">' +
      '<input class="field" id="np_goal" placeholder="Business goal">' +
      '<input class="field" id="np_status" placeholder="Current status">' +
      '<input class="field" id="np_mile" placeholder="Next milestone">' +
      '<select class="field" id="np_prio"><option value="">Priority…</option><option>High</option><option>Medium</option><option>Low</option></select>' +
      '<button class="btn primary" id="np_add" style="width:100%;">Add project</button></div>';
    html += '<div style="display:flex;gap:8px;margin-top:14px;">' +
      '<button class="btn" id="exportBtn" style="flex:1;">Export backup</button>' +
      '<button class="btn" id="importBtn" style="flex:1;">Import backup</button>' +
      '<button class="btn" id="aiExportBtn" style="flex:1;">AI review export</button></div>' +
      '<input type="file" id="importFile" accept="application/json" style="display:none;">';
    $("#projects").innerHTML = html;
  }

  function renderRecurring() {
    var html = "";
    DB.recurring.forEach(function (r, i) {
      var since = daysSince(r.last), due = (since === null) || (since >= freqDays(r.freq));
      html += '<div class="rec"><div><div>' + esc(r.name) + '</div>' +
        '<span class="freq">' + esc(r.freq) + '</span>' +
        (due ? '<span class="due">Due now</span>' : '<span class="freq">done ' + since + 'd ago</span>') +
        '</div><div style="display:flex;gap:6px;align-items:center;">' +
        '<button class="btn" data-act="recdone" data-i="' + i + '">Done</button>' +
        '<button class="rm" data-act="recdel" data-i="' + i + '" aria-label="Remove">×</button></div></div>';
    });
    html += '<div class="proj"><div class="name" style="margin-bottom:10px;">Add recurring work</div>' +
      '<input class="field" id="nr_name" placeholder="e.g. Meta Ads review">' +
      '<select class="field" id="nr_freq"><option>Daily</option><option>2× / week</option><option>Weekly</option><option>Fortnightly</option><option>Monthly</option></select>' +
      '<button class="btn primary" id="nr_add" style="width:100%;">Add</button></div>';
    $("#recurring").innerHTML = html;
  }

  /* ---------- TIME tab ---------- */
  var PROJ_COLOR = { "English Partner": "#6f9bb8", "Avanzar Health": "#cf6b54", "Vasantha": "#d8853f", "Other": "#7ba05b" };
  var PROJ_SOFT = { "English Partner": "#1d2a33", "Avanzar Health": "#371f18", "Vasantha": "#3a2a18", "Other": "#26301c" };
  var FALLBACK = ["#b07ab8", "#8a9b5b", "#b89a6f", "#6fb8a8", "#b86f8a"];
  function projColor(n) { if (PROJ_COLOR[n]) return PROJ_COLOR[n]; var h = 0; for (var i = 0; i < (n || "").length; i++) h = (h * 31 + n.charCodeAt(i)) % FALLBACK.length; return FALLBACK[h]; }
  function sumBy(filterFn) {
    var out = {};
    DB.log.forEach(function (e) { if (filterFn(e)) out[e.project] = (out[e.project] || 0) + e.seconds; });
    return out;
  }
  function weekAgoKey() { var d = new Date(); d.setDate(d.getDate() - 6); return dayKey(d); }
  /* aggregate logged time by task text, newest window, return sorted desc */
  function tasksRanked(filterFn) {
    var byTask = {};
    DB.log.forEach(function (e) {
      if (!filterFn(e)) return;
      if (!byTask[e.task]) byTask[e.task] = { task: e.task, project: e.project, seconds: 0 };
      byTask[e.task].seconds += e.seconds;
    });
    return Object.keys(byTask).map(function (k) { return byTask[k]; })
      .sort(function (a, b) { return b.seconds - a.seconds; });
  }
  function taskRankList(filterFn) {
    var rows = tasksRanked(filterFn);
    if (!rows.length) return '<div class="empty">No task time logged yet.</div>';
    var max = rows[0].seconds;
    return '<div class="chart">' + rows.map(function (r) {
      var pct = Math.round(r.seconds / max * 100);
      return '<div class="trank">' +
        '<div class="trank-top"><span class="trank-name">' + esc(r.task) + '</span>' +
        '<span class="trank-val">' + fmtHours(r.seconds) + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + (projColor(r.project)) + ';"></div></div>' +
        '<div class="trank-proj">' + esc(r.project) + '</div></div>';
    }).join("") + '</div>';
  }
  function barChart(map) {
    var keys = Object.keys(map);
    if (!keys.length) return '<div class="empty">No time logged yet. Hit ▶ on any task to start.</div>';
    var max = Math.max.apply(null, keys.map(function (k) { return map[k]; }));
    return '<div class="chart">' + keys.sort(function (a, b) { return map[b] - map[a]; }).map(function (k) {
      var pct = Math.round(map[k] / max * 100);
      return '<div class="bar-row"><div class="bar-label">' + esc(k) + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + (projColor(k)) + ';"></div></div>' +
        '<div class="bar-val">' + fmtHours(map[k]) + '</div></div>';
    }).join("") + '</div>';
  }
  /* detect repeated tasks + their cadence from the full work log (no AI, pure logic) */
  function detectPatterns() {
    var byTask = {};
    DB.log.forEach(function (e) {
      if (!byTask[e.task]) byTask[e.task] = { task: e.task, project: e.project, dates: [], seconds: 0 };
      byTask[e.task].dates.push(e.date);
      byTask[e.task].seconds += e.seconds;
    });
    var out = [];
    Object.keys(byTask).forEach(function (k) {
      var r = byTask[k];
      var days = r.dates.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(); /* unique days */
      if (days.length < 3) return;  /* need at least 3 occurrences to call it a pattern */
      var gaps = [];
      for (var i = 1; i < days.length; i++) {
        gaps.push(Math.round((new Date(days[i]) - new Date(days[i - 1])) / 86400000));
      }
      var avg = gaps.reduce(function (s, g) { return s + g; }, 0) / gaps.length;
      var cadence = avg <= 1.4 ? "≈ daily" : avg <= 3.5 ? "every few days" : avg <= 8 ? "≈ weekly" : "≈ " + Math.round(avg) + "-day cycle";
      out.push({ task: r.task, project: r.project, count: days.length, cadence: cadence, seconds: r.seconds });
    });
    return out.sort(function (a, b) { return b.count - a.count; });
  }
  function patternsBlock() {
    var rows = detectPatterns();
    if (!rows.length) return '<div class="empty">Not enough history yet. After you log the same task on 3+ days, repeating patterns appear here automatically.</div>';
    return rows.map(function (r) {
      return '<div class="pat"><div class="pat-top"><span class="pat-name">' + esc(r.task) + projTag(r.project) + '</span>' +
        '<span class="pat-cad">' + r.cadence + '</span></div>' +
        '<div class="pat-sub">' + r.count + ' days logged · ' + fmtHours(r.seconds) + ' total</div></div>';
    }).join("");
  }
  function renderTime() {
    var live = isActive(DB.timer.activeList, DB.timer.activeI);
    var running = "";
    if (DB.timer.activeList !== null) {
      var arr = path(DB, DB.timer.activeList), it = arr && arr[DB.timer.activeI];
      if (it) running = '<div class="running"><span class="pulse"></span> Running: <b>' + esc(it.t) + '</b> · <span id="liveClock">' + fmt(liveSeconds()) + '</span>' +
        ' <button class="btn" data-act="pause" style="margin-left:8px;">Pause</button></div>';
    }
    var today = sumBy(function (e) { return e.date === dayKey(); });
    var week = sumBy(function (e) { return e.date >= weekAgoKey(); });
    var todayTotal = Object.keys(today).reduce(function (s, k) { return s + today[k]; }, 0);
    var weekTotal = Object.keys(week).reduce(function (s, k) { return s + week[k]; }, 0);

    $("#time").innerHTML =
      running +
      '<div class="block"><h2>Today · ' + fmtHours(todayTotal) + ' total</h2>' + barChart(today) + '</div>' +
      '<div class="block"><h2>Last 7 days · ' + fmtHours(weekTotal) + ' total</h2>' + barChart(week) + '</div>' +
      '<div class="block"><h2>Biggest time-eaters · last 7 days</h2>' + taskRankList(function (e) { return e.date >= weekAgoKey(); }) + '</div>' +
      '<div class="block"><h2>Repeating patterns · all history</h2>' + patternsBlock() + '</div>' +
      '<div class="note">Time is tracked per task and rolled up to its project. Checking a task off banks its time. Only one timer runs at a time, so your hours never double-count.' +
      ' <button class="btn" id="clearLog" style="margin-top:8px;">Clear all time logs</button></div>';
  }

  /* ---------- calendar (unchanged) ---------- */
  function renderCalendar() {
    var hasId = !!(window.OPS_CONFIG && window.OPS_CONFIG.GOOGLE_CLIENT_ID);
    var html = '<div class="cal-card"><h3>Google Calendar</h3>';
    if (!hasId) {
      html += '<div class="cal-status">Not configured yet. Open <b>SETUP.md</b> and follow "Google Calendar" to create a free Client ID, paste it into <b>index.html</b>, then redeploy. Until then everything else works normally.</div>';
    } else if (!GCAL.ready) {
      html += '<div class="cal-status">Ready to connect.</div><button class="btn primary" id="gcalConnect">Connect Google Calendar</button>';
    } else {
      html += '<div class="cal-status">Connected. Push your routines as recurring events with email + popup reminders.</div>' +
        '<ul class="cal-list"><li>Daily ad work — 9:00 AM</li><li>Evening review — 6:00 PM</li><li>Weekly review — Friday 5:00 PM</li></ul>' +
        '<button class="btn primary" id="gcalPush">Add these to my calendar</button>';
    }
    html += '</div><div class="note">Reminders fire from Google Calendar itself (email + popup), so this app needs no background process.</div>';
    $("#calendar").innerHTML = html;
  }
  var GCAL = {
    ready: false, token: null, tokenClient: null,
    init: function (cb) {
      var id = window.OPS_CONFIG && window.OPS_CONFIG.GOOGLE_CLIENT_ID;
      if (!id) { cb && cb(false); return; }
      loadScript("https://accounts.google.com/gsi/client", function () {
        GCAL.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: id, scope: "https://www.googleapis.com/auth/calendar.events",
          callback: function (resp) { if (resp && resp.access_token) { GCAL.token = resp.access_token; GCAL.ready = true; renderCalendar(); toast("Calendar connected"); } }
        });
        cb && cb(true);
      });
    },
    connect: function () { if (GCAL.tokenClient) GCAL.tokenClient.requestAccessToken(); },
    addEvent: function (ev) {
      return fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST", headers: { Authorization: "Bearer " + GCAL.token, "Content-Type": "application/json" }, body: JSON.stringify(ev)
      }).then(function (r) { return r.json(); });
    }
  };
  function loadScript(src, cb) {
    if (document.querySelector('script[src="' + src + '"]')) { cb(); return; }
    var s = document.createElement("script"); s.src = src; s.onload = cb; document.head.appendChild(s);
  }
  function rfcAt(h, m) { var d = new Date(); d.setHours(h, m || 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d.toISOString(); }
  function pushDefaults() {
    var events = [
      { summary: "English Partner — recharge + ad check", start: { dateTime: rfcAt(9, 0) }, end: { dateTime: rfcAt(9, 30) }, recurrence: ["RRULE:FREQ=DAILY"], reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }, { method: "email", minutes: 30 }] } },
      { summary: "Evening review — log what got done", start: { dateTime: rfcAt(18, 0) }, end: { dateTime: rfcAt(18, 20) }, recurrence: ["RRULE:FREQ=DAILY"], reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] } },
      { summary: "Weekly review", start: { dateTime: rfcAt(17, 0) }, end: { dateTime: rfcAt(17, 45) }, recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=FR"], reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }, { method: "email", minutes: 60 }] } }
    ];
    toast("Adding events…");
    Promise.all(events.map(GCAL.addEvent)).then(function () { toast("Added to your calendar"); }).catch(function () { toast("Something went wrong — reconnect"); });
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(DB, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "ops-hq-backup-" + dayKey() + ".json"; a.click(); URL.revokeObjectURL(url); toast("Backup downloaded");
  }
  /* Build an AI-friendly text report to paste into ChatGPT / Claude for review + planning */
  function aiReviewText() {
    var L = [];
    L.push("OPERATIONS HQ — STATUS REPORT");
    L.push("Generated: " + new Date().toLocaleString());
    L.push("");
    L.push("=== PROJECTS ===");
    DB.projects.forEach(function (p) {
      var stale = daysSince(p.updated);
      L.push("• " + p.name + "  [priority: " + (p.prio || "—") + (stale !== null ? ", last updated " + stale + "d ago" : "") + "]");
      if (p.goal) L.push("   Goal: " + p.goal);
      if (p.status) L.push("   Status: " + p.status);
      if (p.milestone) L.push("   Next milestone: " + p.milestone);
      if (p.risks) L.push("   Risks: " + p.risks);
    });
    L.push("");
    L.push("=== SPRINT (current) ===");
    DB.sprint.current.forEach(function (it) { L.push("   [" + (it.d ? "x" : " ") + "] " + it.t + (it.o ? " (" + it.o + ")" : "") + (it.p ? " — " + it.p : "")); });
    L.push("");
    L.push("=== TODAY'S PLAN ===");
    [["Critical", "critical"], ["Deep work", "deep"], ["Quick wins", "quick"], ["Follow-ups", "follow"], ["Monitoring", "mon"], ["Strategic", "strat"]].forEach(function (s) {
      var arr = DB.daily[s[1]]; if (!arr.length) return;
      L.push(s[0] + ":");
      arr.forEach(function (it) { L.push("   [" + (it.d ? "x" : " ") + "] " + it.t + (it.p ? " — " + it.p : "")); });
    });
    L.push("");
    L.push("=== RECURRING (due status) ===");
    DB.recurring.forEach(function (r) {
      var since = daysSince(r.last), due = (since === null) || (since >= freqDays(r.freq));
      L.push("   " + r.name + " [" + r.freq + "] — " + (due ? "DUE NOW" : "done " + since + "d ago"));
    });
    L.push("");
    L.push("=== TIME — LAST 7 DAYS (per project) ===");
    var wk = sumBy(function (e) { return e.date >= weekAgoKey(); });
    Object.keys(wk).sort(function (a, b) { return wk[b] - wk[a]; }).forEach(function (k) { L.push("   " + k + ": " + fmtHours(wk[k])); });
    L.push("");
    L.push("=== REPEATING PATTERNS ===");
    var pats = detectPatterns();
    if (!pats.length) L.push("   (not enough history yet)");
    pats.forEach(function (r) { L.push("   " + r.task + " — " + r.cadence + " (" + r.count + " days, " + fmtHours(r.seconds) + ")"); });
    L.push("");
    L.push("=== ASK ===");
    L.push("Based on the above, what should I prioritise, what's at risk of being neglected, and what's my best plan for the next few days?");
    return L.join("\n");
  }
  function aiExport() {
    var text = aiReviewText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("AI report copied — paste into ChatGPT/Claude"); }).catch(function () { aiExportFallback(text); });
    } else { aiExportFallback(text); }
  }
  function aiExportFallback(text) {
    var blob = new Blob([text], { type: "text/plain" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "ai-review-" + dayKey() + ".txt"; a.click(); URL.revokeObjectURL(url); toast("AI report downloaded");
  }
  function importData(file) {
    var rd = new FileReader();
    rd.onload = function () { try { DB = JSON.parse(rd.result); if (!DB.timer) DB.timer = { activeList: null, activeI: null, startedAt: null }; if (!DB.log) DB.log = []; save(); renderAll(); toast("Backup restored"); } catch (e) { toast("That file could not be read"); } };
    rd.readAsText(file);
  }

  function path(obj, p) { if (!p) return null; var k = p.split("."); return obj[k[0]] ? obj[k[0]][k[1]] : null; }

  document.addEventListener("click", function (e) {
    var t = e.target, act = t.getAttribute && t.getAttribute("data-act");
    if (act === "play") { startTimer(t.dataset.list, +t.dataset.i); return; }
    if (act === "pause") { pauseTimer(); return; }
    if (act === "toggle") {
      var a = path(DB, t.dataset.list), i = +t.dataset.i;
      if (isActive(t.dataset.list, i)) bankActive();   /* finishing a running task banks its time */
      a[i].d = !a[i].d; save(); renderAll(); return;
    }
    if (act === "del") {
      if (isActive(t.dataset.list, +t.dataset.i)) bankActive();
      path(DB, t.dataset.list).splice(+t.dataset.i, 1); save(); renderAll(); return;
    }
    if (act === "delproj") { DB.projects.splice(+t.dataset.i, 1); save(); renderProjects(); return; }
    if (act === "editproj") { editingProj = +t.dataset.i; renderProjects(); return; }
    if (act === "canceledit") { editingProj = null; renderProjects(); return; }
    if (act === "saveproj") {
      var idx = +t.dataset.i, P = DB.projects[idx];
      P.name = $("#ep_name").value.trim() || P.name;
      P.goal = $("#ep_goal").value.trim();
      P.status = $("#ep_status").value.trim();
      P.milestone = $("#ep_mile").value.trim();
      P.risks = $("#ep_risks").value.trim();
      P.prio = $("#ep_prio").value;
      P.updated = nowISO();
      editingProj = null; save(); renderProjects(); toast("Project updated"); return;
    }
    if (act === "recdone") { DB.recurring[+t.dataset.i].last = nowISO(); save(); renderRecurring(); toast("Marked done"); return; }
    if (act === "recdel") { DB.recurring.splice(+t.dataset.i, 1); save(); renderRecurring(); return; }

    var addbtn = t.getAttribute && t.getAttribute("data-addbtn");
    if (addbtn) { var inp = $('[data-addinput="' + addbtn + '"]'); var sel = $('[data-addproj="' + addbtn + '"]'); if (inp && inp.value.trim()) { path(DB, addbtn).push({ t: inp.value.trim(), d: false, p: sel ? sel.value : "" }); inp.value = ""; save(); renderAll(); } return; }

    if (t.id === "np_add") {
      var n = $("#np_name").value.trim(); if (!n) { toast("Name needed"); return; }
      DB.projects.push({ name: n, goal: $("#np_goal").value.trim(), status: $("#np_status").value.trim(), milestone: $("#np_mile").value.trim(), prio: $("#np_prio").value, risks: "", updated: nowISO() });
      save(); renderProjects(); toast("Project added"); return;
    }
    if (t.id === "nr_add") { var rn = $("#nr_name").value.trim(); if (!rn) return; DB.recurring.push({ name: rn, freq: $("#nr_freq").value, last: "" }); save(); renderRecurring(); return; }
    if (t.id === "exportBtn") { exportData(); return; }
    if (t.id === "aiExportBtn") { aiExport(); return; }
    if (t.id === "importBtn") { $("#importFile").click(); return; }
    if (t.id === "clearLog") { if (confirm("Clear all logged time? This cannot be undone.")) { bankActive(); DB.log = []; save(); renderTime(); toast("Time logs cleared"); } return; }
    if (t.id === "gcalConnect") { GCAL.connect(); return; }
    if (t.id === "gcalPush") { pushDefaults(); return; }
  });
  document.addEventListener("change", function (e) { if (e.target.id === "importFile" && e.target.files[0]) importData(e.target.files[0]); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var inp = e.target, key = inp.getAttribute && inp.getAttribute("data-addinput");
    if (key && inp.value.trim()) { var sel = $('[data-addproj="' + key + '"]'); path(DB, key).push({ t: inp.value.trim(), d: false, p: sel ? sel.value : "" }); inp.value = ""; save(); renderAll(); }
  });

  $$(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      $$(".tab").forEach(function (x) { x.setAttribute("aria-selected", "false"); });
      tab.setAttribute("aria-selected", "true");
      $$('section[role="tabpanel"]').forEach(function (s) { s.classList.remove("active"); });
      $("#" + tab.dataset.tab).classList.add("active");
    });
  });

  function renderAll() { renderDaily(); renderSprint(); renderProjects(); renderRecurring(); renderTime(); renderCalendar(); }

  /* live clock tick — updates running readouts every second without full re-render */
  setInterval(function () {
    if (DB.timer.activeList === null) return;
    var live = $(".time.run"); if (live) live.textContent = fmt(loggedFor((path(DB, DB.timer.activeList) || [])[DB.timer.activeI] ? path(DB, DB.timer.activeList)[DB.timer.activeI].t : "", true) + liveSeconds());
    var lc = $("#liveClock"); if (lc) lc.textContent = fmt(liveSeconds());
  }, 1000);

  /* save running timer if user closes tab */
  window.addEventListener("beforeunload", function () { if (DB.timer.activeList !== null) { bankActive(); save(); } });

  load(); renderAll();
  if (window.OPS_CONFIG && window.OPS_CONFIG.GOOGLE_CLIENT_ID) { $("#dot").classList.remove("off"); $("#syncTxt").textContent = "Calendar available"; GCAL.init(); }
  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(function () {}); }
})();
