/**
 * PyGoat — lab-control.js
 * Place at: introduction/static/js/lab-control.js
 * Load in:  base.html — one line before </body>
 *
 *   <script defer src="{% static 'js/lab-control.js' %}"></script>
 *
 * Requires globals already in base.html: getCookie(), updateLabStatus()
 *
 * Per-template: only 2 changes needed (see ssrf.html for example)
 *   1. <div id="lab-controls" data-lab="ssrf_lab"></div>  next to <h3>
 *   2. Access Lab <button onclick="..."> → <a class="lab-access-btn" data-path="/ssrf_lab">
 *
 * Status badge is auto-injected into #lab-status if present, otherwise
 * inserted directly before the heading that precedes #lab-controls.
 */
(function () {
  'use strict';

  var el = document.getElementById('lab-controls');
  if (!el) return;

  var LAB_ID = el.dataset.lab;
  if (!LAB_ID) return;

  var MAX_LABS = 3;

  /* ── Inject styles ── */
  var style = document.createElement('style');
  style.textContent = [
    '#pyg-badge.badge-success {',
    '  animation: pyg-pulse 2s ease-in-out infinite;',
    '}',
    '@keyframes pyg-pulse {',
    '  0%,100% { box-shadow: 0 0 0 0 rgba(40,167,69,0.5); }',
    '  50%      { box-shadow: 0 0 0 5px rgba(40,167,69,0);  }',
    '}',
    /* Status badge wrapper — block under heading text, left-aligned */
    '#pyg-status-wrap {',
    '  display: block;',
    '  margin-top: 5px;',
    '}',
    /* #lab-controls needs relative so limit msg can be absolute */
    '#lab-controls {',
    '  position: relative;',
    '}',
    /* Limit warning — floats below buttons without shifting them */
    '#pyg-limit-msg {',
    '  display: none;',
    '  position: absolute;',
    '  top: calc(100% + 6px);',
    '  right: 0;',
    '  white-space: nowrap;',
    '  padding: 7px 12px;',
    '  background: #fdf2f2;',
    '  border-left: 4px solid #c0392b;',
    '  border-radius: 4px;',
    '  font-size: 12px;',
    '  color: #5c1a1a;',
    '  z-index: 10;',
    '  box-shadow: 0 2px 6px rgba(0,0,0,0.1);',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  /* ── Find or create the status badge mount point ──
     Appends a <div> INSIDE the nearest preceding heading so the badge
     sits flush-left under the heading text and never disrupts the
     flex row that contains #lab-controls.                              ── */
  function getOrCreateStatusMount() {
    var explicit = document.getElementById('lab-status');
    if (explicit) return explicit;

    /* Walk backwards through siblings to find the closest heading */
    var sibling = el.previousElementSibling;
    while (sibling) {
      if (/^H[1-4]$/.test(sibling.tagName)) {
        var wrap = document.createElement('div');
        wrap.id = 'pyg-status-wrap';
        sibling.appendChild(wrap);   /* inside the heading, not after it */
        return wrap;
      }
      sibling = sibling.previousElementSibling;
    }

    /* Fallback: insert right before #lab-controls */
    var wrap = document.createElement('div');
    wrap.id = 'pyg-status-wrap';
    el.parentNode.insertBefore(wrap, el);
    return wrap;
  }

  /* ── Inject status badge (left / under heading) ── */
  var statusMount = getOrCreateStatusMount();
  statusMount.innerHTML =
    '<span id="pyg-badge" class="badge badge-secondary"' +
    ' style="font-size:12px;padding:4px 10px;">' +
      '<i class="fas fa-circle" style="font-size:8px;margin-right:5px;"></i>' +
      '<span id="pyg-badge-text">Stopped</span>' +
    '</span>';

  /* ── Inject start/stop buttons + limit warning (right side, original position) ── */
  el.innerHTML =
    '<div>' +
      '<button id="pyg-start" class="btn btn-sm btn-success">' +
        '<i class="fas fa-play"></i> Start Lab' +
      '</button>' +
      '<button id="pyg-stop" class="btn btn-sm btn-danger"' +
      ' style="display:none;margin-left:6px;">' +
        '<i class="fas fa-stop"></i> Stop Lab' +
      '</button>' +
    '</div>' +
    '<div id="pyg-limit-msg">' +
      '<i class="fas fa-exclamation-circle" style="margin-right:6px;color:#c0392b;"></i>' +
      '<strong>Lab limit reached &mdash; maximum 3 active labs allowed.</strong>' +
    '</div>';

  var startBtn = document.getElementById('pyg-start');
  var stopBtn  = document.getElementById('pyg-stop');
  var limitMsg = document.getElementById('pyg-limit-msg');

  /* ── Lock / unlock <a class="lab-access-btn" data-path="..."> ── */
  function setAccessButtons(labUrl) {
    document.querySelectorAll('a.lab-access-btn').forEach(function (a) {
      if (labUrl) {
        a.href                = labUrl + (a.dataset.path || '');
        a.style.pointerEvents = 'auto';
        a.style.opacity       = '1';
      } else {
        a.href                = '#';
        a.style.pointerEvents = 'none';
        a.style.opacity       = '0.5';
      }
    });
  }

  /* ── UI state helpers ── */
  function applyRunning(labUrl) {
    limitMsg.style.display = 'none';
    var badge = document.getElementById('pyg-badge');
    badge.className = 'badge badge-success';
    document.getElementById('pyg-badge-text').textContent = 'Running';
    startBtn.style.display = 'none';
    stopBtn.style.display  = 'inline-block';
    stopBtn.disabled       = false;
    stopBtn.innerHTML      = '<i class="fas fa-stop"></i> Stop Lab';
    setAccessButtons(labUrl);
    if (typeof updateLabStatus === 'function') updateLabStatus();
  }

  function applyStarting() {
    limitMsg.style.display = 'none';
    var badge = document.getElementById('pyg-badge');
    badge.className = 'badge badge-warning';
    document.getElementById('pyg-badge-text').textContent = 'Starting\u2026';
    startBtn.disabled  = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting\u2026';
    setAccessButtons(null);
  }

  function applyStopped() {
    limitMsg.style.display = 'none';
    var badge = document.getElementById('pyg-badge');
    badge.className = 'badge badge-secondary';
    document.getElementById('pyg-badge-text').textContent = 'Stopped';
    startBtn.style.display = 'inline-block';
    startBtn.disabled      = false;
    startBtn.innerHTML     = '<i class="fas fa-play"></i> Start Lab';
    stopBtn.style.display  = 'none';
    setAccessButtons(null);
    if (typeof updateLabStatus === 'function') updateLabStatus();
  }

  /* ── Fetch running labs info ── */
  async function getRunningLabs() {
    try {
      var res  = await fetch('/challenge/list-labs/');
      var data = await res.json();
      if (data.status !== 'success') return { count: 0, thisRunning: false, url: '' };
      var labs = data.labs || [];
      var thisLab = labs.find(function (l) {
        return l.name && l.name.endsWith('-' + LAB_ID) && l.status === 'running';
      });
      return {
        count:       labs.filter(function (l) { return l.status === 'running'; }).length,
        thisRunning: !!thisLab,
        url:         thisLab ? (thisLab.url || '') : ''
      };
    } catch (e) {
      return { count: 0, thisRunning: false, url: '' };
    }
  }

  /* ── Start button ── */
  startBtn.addEventListener('click', async function () {
    var info = await getRunningLabs();
    if (info.count >= MAX_LABS) {
      limitMsg.style.display = 'block';
      return;
    }
    applyStarting();
    try {
      var res  = await fetch('/challenge/start-lab/' + LAB_ID + '/');
      var data = await res.json();
      if (data.status === 'ready' || data.status === 'created') {
        applyRunning(data.url || '');
      } else {
        applyStopped();
        console.error('[PyGoat] start-lab error:', data.message);
      }
    } catch (e) {
      applyStopped();
    }
  });

  /* ── Stop button ── */
  stopBtn.addEventListener('click', async function () {
    stopBtn.disabled  = true;
    stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Stopping\u2026';
    try {
      await fetch('/challenge/stop-lab/' + LAB_ID + '/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          'Content-Type': 'application/json'
        }
      });
      applyStopped();
    } catch (e) {
      stopBtn.disabled  = false;
      stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Lab';
    }
  });

  /* ── Page load: reflect real container state ── */
  (async function init() {
    var info = await getRunningLabs();
    if (info.thisRunning) {
      try {
        var res  = await fetch('/challenge/start-lab/' + LAB_ID + '/');
        var data = await res.json();
        applyRunning(data.url || '');
      } catch (e) {
        applyRunning('');
      }
    } else {
      applyStopped();
    }
  }());

}());