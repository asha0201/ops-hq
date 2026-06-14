/* Operations HQ — local-first chief-of-staff app.
   Data is stored in this browser (localStorage). No server, no tracking.
   Google Calendar is optional and connects directly from your browser. */

(function () {
  "use strict";

  var KEY = "ops_hq_v1";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- seed data (your three projects) ---------- */
  function todayLabel() {
    return new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  }
  function nowISO() { return new Date().toISOString(); }

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
        { name: "Vasantha Advanced Systems", goal: "Generate offshore OEM/EMS customers via LinkedIn, email, SEO, events", status: "Not started — directing 1 full-time associate", milestone: "Phase 1 website positioning (months 1–2)", prio: "High", risks: "Associate is learning — needs bounded tasks, examples, deadlines, and review on every output", updated: nowISO() }
      ],
      recurring: [
        { name: "English Partner — daily recharge", freq: "Daily", last: "" },
        { name: "English Partner — ad check (Meta + Google)", freq: "Daily", last: "" },
        { name: "English Partner — expense + portal check", freq: "Weekly", last: "" },
        { name: "Vasantha — review associate output + reassign", freq: "Daily", last: "" },
        { name: "Vasantha — 3 educational LinkedIn posts", freq: "Weekly", last: "" },
        { name: "Vasantha — 2 facility showcase posts", freq: "Weekly", last: "" },
        { name: "Vasantha — 1 long-form article", freq: "Monthly", last: "" }
      ]
    };
  }

  var DB;
  function load() {
    try { var raw = localStorage.getItem(KEY); DB = raw ? JSON.parse(raw) : seed(); }
    catch (e) { DB = seed(); }
  }
  function save() {
    DB.meta.updated = nowISO();
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast("Could not save — storage full or blocked"); }
  }

  function esc(s) { return (s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function freqDays(f) { return { Daily: 1, "2× / week": 3, Weekly: 7, Fortnightly: 14, Monthly: 30 }[f] || 9999; }
  function daysSince(iso) { if (!iso) return null; return Math.floor((Date.now() - new Date(iso)) / 86400000); }

  var toastTimer;
  function toast(msg) {
    var el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  /* ---------- daily ---------- */
  var DAILY_SECTIONS = [
    ["crit", "critical", "Top 3 critical outcomes"],
    ["", "deep", "Deep work"],
    ["quick", "quick", "Quick wins · under 15 min"],
    ["follow", "follow", "Follow-ups"],
    ["mon", "mon", "Monitoring"],
    ["", "strat", "Strategic"]
  ];
  function ownerTag(o) {
    if (o === "you") return '<span class="owner you">You</span>';
    if (o === "assoc") return '<span class="owner assoc">Assoc</span>';
    return "";
  }
  function taskRows(arr, listName) {
    if (!arr.length) return '<div class="empty">Nothing here yet.</div>';
    return arr.map(function (it, i) {
      return '<div class="row">' +
        '<button class="box ' + (it.d ? "on" : "") + '" data-act="toggle" data-list="' + listName + '" data-i="' + i + '" aria-label="Toggle">' + (it.d ? "✓" : "") + '</button>' +
        '<div class="txt ' + (it.d ? "on" : "") + '">' + esc(it.t) + ownerTag(it.o) + '</div>' +
        '<button class="rm" data-act="del" data-list="' + listName + '" data-i="' + i + '" aria-label="Remove">×</button>' +
        '</div>';
    }).join("");
  }
  function renderDaily() {
    var html = '<p class="daystamp">' + todayLabel() + '</p>';
    DAILY_SECTIONS.forEach(function (s) {
      var cls = s[0] ? " " + s[0] : "", key = "daily." + s[1];
      html += '<div class="block' + cls + '"><h2>' + s[2] + '</h2>' +
        taskRows(DB.daily[s[1]], key) +
        '<div class="add"><input placeholder="Add…" data-addinput="' + key + '"><button data-addbtn="' + key + '">Add</button></div></div>';
    });
    $("#daily").innerHTML = html;
  }

  /* ---------- sprint ---------- */
  function sprintCol(title, key) {
    var arr = DB.sprint[key], open = arr.filter(function (x) { return !x.d; }).length;
    return '<div class="block"><h2>' + title + ' <span class="count">(' + open + ')</span></h2>' +
      taskRows(arr, "sprint." + key) +
      '<div class="add"><input placeholder="Add…" data-addinput="sprint.' + key + '"><button data-addbtn="sprint.' + key + '">Add</button></div></div>';
  }
  function renderSprint() {
    $("#sprint").innerHTML = '<div class="cols">' +
      sprintCol("Current sprint", "current") +
      sprintCol("Upcoming", "upcoming") +
      sprintCol("Backlog", "backlog") + '</div>';
  }

  /* ---------- projects ---------- */
  function renderProjects() {
    var html = '<div class="note">A project untouched for <b>4+ days</b> gets flagged below, so nothing quietly stalls.</div>';
    DB.projects.forEach(function (p, i) {
      var stale = daysSince(p.updated);
      var flag = (stale !== null && stale >= 4) ? '<div class="flag">Ignored ' + stale + ' days — check in</div>' : "";
      html += '<div class="proj"><div class="top"><div class="name">' + esc(p.name) + '</div>' +
        '<div><span class="tag ' + p.prio + '">' + (p.prio || "—") + '</span> ' +
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
      '<button class="btn" id="importBtn" style="flex:1;">Import backup</button></div>' +
      '<input type="file" id="importFile" accept="application/json" style="display:none;">';
    $("#projects").innerHTML = html;
  }

  /* ---------- recurring ---------- */
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

  /* ---------- calendar (Google, optional) ---------- */
  function renderCalendar() {
    var hasId = !!(window.OPS_CONFIG && window.OPS_CONFIG.GOOGLE_CLIENT_ID);
    var html = '<div class="cal-card"><h3>Google Calendar</h3>';
    if (!hasId) {
      html += '<div class="cal-status">Not configured yet. Open <b>SETUP.md</b> and follow “Google Calendar” to create a free Client ID, paste it into <b>index.html</b>, then redeploy. Until then everything else works normally.</div>';
    } else if (!GCAL.ready) {
      html += '<div class="cal-status">Ready to connect.</div>' +
        '<button class="btn primary" id="gcalConnect">Connect Google Calendar</button>';
    } else {
      html += '<div class="cal-status">Connected. Pick what to push as calendar events with email + popup reminders.</div>' +
        '<ul class="cal-list">' +
        '<li>Daily ad work — 9:00 AM, repeats daily</li>' +
        '<li>Evening review — 6:00 PM, repeats daily</li>' +
        '<li>Weekly review — Friday 5:00 PM</li>' +
        '</ul>' +
        '<button class="btn primary" id="gcalPush">Add these to my calendar</button>';
    }
    html += '</div>';
    html += '<div class="note">Reminders fire from Google Calendar itself (email to your inbox + popup on your laptop), which is why this app does not need to run in the background.</div>';
    $("#calendar").innerHTML = html;
  }

  /* Minimal Google Identity + Calendar wrapper. Loads scripts only when used. */
  var GCAL = {
    ready: false, token: null, tokenClient: null,
    init: function (cb) {
      var id = window.OPS_CONFIG && window.OPS_CONFIG.GOOGLE_CLIENT_ID;
      if (!id) { cb && cb(false); return; }
      loadScript("https://accounts.google.com/gsi/client", function () {
        GCAL.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: id,
          scope: "https://www.googleapis.com/auth/calendar.events",
          callback: function (resp) {
            if (resp && resp.access_token) { GCAL.token = resp.access_token; GCAL.ready = true; renderCalendar(); toast("Calendar connected"); }
          }
        });
        cb && cb(true);
      });
    },
    connect: function () { if (GCAL.tokenClient) GCAL.tokenClient.requestAccessToken(); },
    addEvent: function (ev) {
      return fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: "Bearer " + GCAL.token, "Content-Type": "application/json" },
        body: JSON.stringify(ev)
      }).then(function (r) { return r.json(); });
    }
  };
  function loadScript(src, cb) {
    if (document.querySelector('script[src="' + src + '"]')) { cb(); return; }
    var s = document.createElement("script"); s.src = src; s.onload = cb; document.head.appendChild(s);
  }
  function rfcAt(hour, min) {
    var d = new Date(); d.setHours(hour, min || 0, 0, 0);
    if (d < new Date()) d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  function pushDefaults() {
    var s = rfcAt(9, 0), e = rfcAt(9, 30);
    var events = [
      { summary: "English Partner — recharge + ad check", start: { dateTime: s }, end: { dateTime: e }, recurrence: ["RRULE:FREQ=DAILY"], reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }, { method: "email", minutes: 30 }] } },
      { summary: "Evening review — log what got done", start: { dateTime: rfcAt(18, 0) }, end: { dateTime: rfcAt(18, 20) }, recurrence: ["RRULE:FREQ=DAILY"], reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] } },
      { summary: "Weekly review", start: { dateTime: rfcAt(17, 0) }, end: { dateTime: rfcAt(17, 45) }, recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=FR"], reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }, { method: "email", minutes: 60 }] } }
    ];
    toast("Adding events…");
    Promise.all(events.map(GCAL.addEvent)).then(function () { toast("Added to your calendar"); })
      .catch(function () { toast("Something went wrong — try reconnecting"); });
  }

  /* ---------- export / import ---------- */
  function exportData() {
    var blob = new Blob([JSON.stringify(DB, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "ops-hq-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click(); URL.revokeObjectURL(url); toast("Backup downloaded");
  }
  function importData(file) {
    var rd = new FileReader();
    rd.onload = function () { try { DB = JSON.parse(rd.result); save(); renderAll(); toast("Backup restored"); } catch (e) { toast("That file could not be read"); } };
    rd.readAsText(file);
  }

  /* ---------- event handling ---------- */
  function path(obj, p) { var k = p.split("."); return obj[k[0]][k[1]]; }
  document.addEventListener("click", function (e) {
    var t = e.target;
    var act = t.getAttribute && t.getAttribute("data-act");
    if (act === "toggle") { var a = path(DB, t.dataset.list); a[+t.dataset.i].d = !a[+t.dataset.i].d; save(); renderAll(); return; }
    if (act === "del") { path(DB, t.dataset.list).splice(+t.dataset.i, 1); save(); renderAll(); return; }
    if (act === "delproj") { DB.projects.splice(+t.dataset.i, 1); save(); renderProjects(); return; }
    if (act === "recdone") { DB.recurring[+t.dataset.i].last = nowISO(); save(); renderRecurring(); toast("Marked done"); return; }
    if (act === "recdel") { DB.recurring.splice(+t.dataset.i, 1); save(); renderRecurring(); return; }

    var addbtn = t.getAttribute && t.getAttribute("data-addbtn");
    if (addbtn) { var inp = $('[data-addinput="' + addbtn + '"]'); if (inp && inp.value.trim()) { path(DB, addbtn).push({ t: inp.value.trim(), d: false }); inp.value = ""; save(); renderAll(); } return; }

    if (t.id === "np_add") {
      var n = $("#np_name").value.trim(); if (!n) { toast("Name needed"); return; }
      DB.projects.push({ name: n, goal: $("#np_goal").value.trim(), status: $("#np_status").value.trim(), milestone: $("#np_mile").value.trim(), prio: $("#np_prio").value, risks: "", updated: nowISO() });
      save(); renderProjects(); toast("Project added"); return;
    }
    if (t.id === "nr_add") { var rn = $("#nr_name").value.trim(); if (!rn) return; DB.recurring.push({ name: rn, freq: $("#nr_freq").value, last: "" }); save(); renderRecurring(); return; }
    if (t.id === "exportBtn") { exportData(); return; }
    if (t.id === "importBtn") { $("#importFile").click(); return; }
    if (t.id === "gcalConnect") { GCAL.connect(); return; }
    if (t.id === "gcalPush") { pushDefaults(); return; }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "importFile" && e.target.files[0]) importData(e.target.files[0]);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var inp = e.target, key = inp.getAttribute && inp.getAttribute("data-addinput");
    if (key && inp.value.trim()) { path(DB, key).push({ t: inp.value.trim(), d: false }); inp.value = ""; save(); renderAll(); }
  });

  /* ---------- tabs ---------- */
  $$(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      $$(".tab").forEach(function (x) { x.setAttribute("aria-selected", "false"); });
      tab.setAttribute("aria-selected", "true");
      $$('section[role="tabpanel"]').forEach(function (s) { s.classList.remove("active"); });
      $("#" + tab.dataset.tab).classList.add("active");
    });
  });

  function renderAll() { renderDaily(); renderSprint(); renderProjects(); renderRecurring(); renderCalendar(); }

  /* ---------- boot ---------- */
  load(); renderAll();
  if (window.OPS_CONFIG && window.OPS_CONFIG.GOOGLE_CLIENT_ID) {
    $("#dot").classList.remove("off"); $("#syncTxt").textContent = "Calendar available";
    GCAL.init();
  }
  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(function () {}); }
})();
