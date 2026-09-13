/* Portfolio Admin - dashboard SPA (vanilla JS). */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(d) {
    if (!d) return '-';
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function snippet(text, len) {
    var s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    return s.length > (len || 90) ? s.slice(0, (len || 90) - 1) + '…' : s;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function countUp(el, to, dur) {
    if (!el) return;
    to = Math.max(0, Number(to) || 0);
    if (prefersReducedMotion()) { el.textContent = String(to); return; }
    var d = dur || 900;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / d, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(to * eased));
      if (p < 1) window.requestAnimationFrame(step);
      else el.textContent = String(to);
    }
    window.requestAnimationFrame(step);
  }

  function skeletonRows(n) {
    var out = '';
    for (var i = 0; i < (n || 5); i++) out += '<div class="skeleton skeleton-row"></div>';
    return out;
  }

  var ADMIN = { email: 'admin', verified: false };
  var TITLES = {
    overview: 'Overview', profile: 'Profile / About', projects: 'Projects',
    certificates: 'Certificates', resume: 'Resume', skills: 'Skills',
    education: 'Education', experience: 'Experience', messages: 'Contact Messages',
    settings: 'Settings / Account'
  };

  /* ------------------------------------------------------------ api -- */
  function api(path, opts) {
    opts = opts || {};
    var init = { credentials: 'same-origin', method: opts.method || 'GET' };
    init.headers = { 'x-vadmin': '1' };

    if (opts.body instanceof FormData) {
      init.body = opts.body;
    } else if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }

    return fetch(path, init).then(function (res) {
      return res.json().then(function (data) {
        data = data || {};
        if (res.status === 401) {
          window.location.href = '/vinit-control/login';
          throw new Error('session');
        }
        if (res.status === 403 && data.code === 'verification_required') {
          window.location.href = '/vinit-control/verify?sent=1';
          throw new Error('verify');
        }
        if (!res.ok) {
          var err = new Error(data.message || 'Request failed (' + res.status + ').');
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  /* ----------------------------------------------------------- toast -- */
  function toast(message, type) {
    var box = $('#toasts');
    if (!box) return;
    var el = document.createElement('div');
    var ico = (type === 'error' ? '✕' : type === 'warn' ? '⚠' : '✓');
    el.className = 'toast ' + (type || 'ok');
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="t-ico">' + ico + '</span><span>' + esc(message) + '</span>';
    box.appendChild(el);
    setTimeout(function () { el.classList.add('hide'); setTimeout(function () { el.remove(); }, 300); }, 4200);
  }

  /* ----------------------------------------------------------- modal --- */
  function openModal(title, bodyHtml, onMount, footerHtml) {
    var overlay = $('#modalOverlay');
    var box = $('#modalBox');
    box.innerHTML =
      '<div class="modal-head"><h3>' + esc(title) + '</h3><button class="modal-x" id="modalClose" aria-label="Close">×</button></div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      (footerHtml ? '<div class="modal-foot">' + footerHtml + '</div>' : '');
    overlay.classList.add('open');
    var close = function () { overlay.classList.remove('open'); box.innerHTML = ''; };
    $('#modalClose').addEventListener('click', close);
    overlay.addEventListener('click', function onclick(e) {
      if (e.target === overlay) close();
      overlay.removeEventListener('click', onclick);
    });
    if (onMount) onMount(box, close);
    return { close: close, box: box };
  }

  function confirmDialog(message, danger) {
    return new Promise(function (resolve) {
      var overlay = $('#confirmOverlay');
      var box = $('#confirmBox');
      box.innerHTML =
        '<div class="modal-head"><h3>Please confirm</h3></div>' +
        '<p class="muted" style="margin:0 0 18px">' + esc(message) + '</p>' +
        '<div class="modal-foot">' +
        '<button class="btn btn-ghost" id="cfNo">Cancel</button>' +
        '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" id="cfYes">Confirm</button>' +
        '</div>';
      overlay.classList.add('open');
      var done = function (v) { overlay.classList.remove('open'); box.innerHTML = ''; resolve(v); };
      $('#cfNo').addEventListener('click', function () { done(false); });
      $('#cfYes').addEventListener('click', function () { done(true); });
      overlay.addEventListener('click', function onclick(e) {
        if (e.target === overlay) done(false);
        overlay.removeEventListener('click', onclick);
      });
    });
  }

  function setButtonBusy(btn, busy, label) {
    if (!btn) return;
    if (!btn.getAttribute('data-orig')) btn.setAttribute('data-orig', btn.innerHTML);
    btn.disabled = busy;
    btn.innerHTML = busy
      ? '<span class="spinner in-btn"></span> Saving…'
      : (label || btn.getAttribute('data-orig'));
  }

  /* XHR upload with progress events (needed for real upload %, fetch has none). */
  function uploadWithProgress(url, fd, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('x-vadmin', '1');
      xhr.withCredentials = true;
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = function () {
        var data = null;
        try { data = JSON.parse(xhr.responseText); } catch (_) { /* noop */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error((data && data.message) || 'Upload failed (' + xhr.status + ').'));
      };
      xhr.onerror = function () { reject(new Error('Network error during upload.')); };
      xhr.send(fd);
    });
  }

  /* ------------------------------------------------ navigation --------- */
  function navigate(section) {
    current = section;
    $$('.nav-item').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-section') === section); });
    $('#pageTitle').textContent = TITLES[section] || 'Dashboard';
    var content = $('#content');
    var renderer = SECTIONS[section] || SECTIONS.overview;
    if (!renderer || typeof renderer.render !== 'function') {
      content.innerHTML = '<div class="section"><div class="empty"><div class="big">⚠️</div>' +
        '<p>Section “' + esc(section) + '” could not be loaded. Please reload the page.</p></div></div>';
      $('#sidebar').classList.remove('open');
      $('#scrim').classList.remove('open');
      return;
    }
    content.innerHTML = '<div class="section"><div class="empty" style="padding:60px 16px"><span class="spinner"></span></div></div>';
    content.classList.remove('section');
    void content.offsetWidth;
    rAF(function () { renderer.render(content); });
    $('#sidebar').classList.remove('open');
    $('#scrim').classList.remove('open');
  }

  /* ------------------------------------------------- shell + boot ----- */
  function loadShell() {
    var email = ADMIN.email;
    $('#adminEmail').textContent = email;
    $('#adminAvatar').textContent = email ? email.slice(0, 2).toUpperCase() : 'VN';
    $('#adminName').textContent = 'Admin';
  }

  function renderToasts() { /* noop */ }

  function boot() {
    api('/api/admin/auth/me').then(function (d) {
      ADMIN = d.data || ADMIN;
      loadShell();
      navigate('overview');
    }).catch(function (_e) { /* redirect handled by api() */ });
  }

  /* ================================================================
     Generic CRUD section builder for list-based collections.
     ================================================================ */
  function crudSection(config) {
    var rows = [];
    var orderMap = {};

    function load() {
      return api(config.apiBase).then(function (d) { rows = (d.data || []).slice(); });
    }

    function sorted() {
      return rows.slice().sort(function (a, b) {
        var o = (Number(a.order) || 0) - (Number(b.order) || 0);
        return o || String(a._id).localeCompare(String(b._id));
      });
    }

    function fieldHtml(f) {
      var val = '';
      var opts = '';
      if (f.type === 'select' && f.options) {
        opts = f.options.map(function (o) {
          var ov = typeof o === 'object' ? o.value : o;
          var ol = typeof o === 'object' ? o.label : o;
          return '<option value="' + esc(ov) + '">' + esc(ol) + '</option>';
        }).join('');
      }
      var tag =
        f.type === 'textarea'
          ? '<textarea class="field-input" id="f_' + esc(f.name) + '" placeholder="' + esc(f.placeholder || '') + '" rows="' + (f.rows || 3) + '"' + (f.required ? ' required' : '') + '></textarea>'
          : f.type === 'select'
            ? '<select class="field-input" id="f_' + esc(f.name) + '">' + opts + '</select>'
            : f.type === 'checkbox'
              ? '<label class="check"><input type="checkbox" id="f_' + esc(f.name) + '" />' + esc(f.label) + '</label>'
              : '<input class="field-input" type="' + (f.type === 'number' ? 'number' : 'text') + '" id="f_' + esc(f.name) + '" placeholder="' + esc(f.placeholder || '') + '"' + (f.required ? ' required' : '') + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + ' />';
      return '<div class="field"><label for="f_' + esc(f.name) + '">' + esc(f.label) + '</label>' + tag + (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '</div>';
    }

    function buildForm(editor) {
      var groups = {};
      (config.fields || []).forEach(function (f) { (groups[f.group || ''] = groups[f.group || ''] || []).push(f); });
      var html = Object.keys(groups).map(function (g) {
        var block = groups[g].map(fieldHtml).join('');
        if (g && (config.groupTitles || {})[g]) return '<div class="panel"><div class="panel-title">' + esc((config.groupTitles || {})[g]) + '</div><div style="margin-top:10px">' + block + '</div></div>';
        return block;
      }).join('');

      var modalId = 'm' + (++_idCounter);
      var modal = openModal(editor._id ? 'Edit ' + config.label : 'Add ' + config.label, html, function (box, close) {
        var saveBtn = $('#' + modalId + '-save', box);
        $('#' + modalId + '-cancel', box).addEventListener('click', close);

        (config.fields || []).forEach(function (f) {
          var input = $('#f_' + f.name, box);
          if (!input) return;
          var cur = editor[f.name];
          if (f.type === 'checkbox') { input.checked = !!cur; return; }
          var val = cur;
          if (f.type === 'number') { input.value = val == null ? '' : val; return; }
          if (f.type === 'tags' && Array.isArray(val)) { input.value = val.join(', '); return; }
          if (f.type === 'select') {
            if (val) { var opt = Array.prototype.find.call(input.options, function (o) { return o.value === String(val); }); if (opt) input.selectedIndex = opt.index; }
            return;
          }
          input.value = val == null ? '' : String(val);
        });

        saveBtn.addEventListener('click', function () {
          var payload = {};
          var valid = true;
          (config.fields || []).forEach(function (f) {
            if (f.type === 'checkbox') { payload[f.name] = $('#f_' + f.name, box).checked; return; }
            var input = $('#f_' + f.name, box);
            if (!input) return;
            var raw = input.value.trim();
            if (f.required && !raw) { valid = false; input.classList.add('is-invalid'); return; }
            var out = f.map ? f.map(raw) : raw;
            payload[f.name] = out;
          });
          if (!valid) { toast('Please fill all required fields.', 'error'); return; }
          payload = config.toPayload ? config.toPayload(payload, editor) : payload;
          if (!editor._id && payload.order === undefined) payload.order = sorted().length;

          setButtonBusy(saveBtn, true);
          var req = editor._id
            ? api(config.apiBase + '/' + editor._id, { method: 'PUT', body: payload })
            : api(config.apiBase, { method: 'POST', body: payload });
          req.then(function () {
            toast((editor._id ? 'Updated' : 'Added') + ' ' + config.label.toLowerCase() + '.', 'ok');
            close();
            return refresh();
          }).catch(function (e) { setButtonBusy(saveBtn, false); toast(e.message, 'error'); });
        });
      }, '<button class="btn btn-ghost" id="' + modalId + '-cancel">Cancel</button><button class="btn btn-primary" id="' + modalId + '-save">Save</button>');
      return modal;
    }

    function rowHtml(row, i) {
      var title = (config.titleOf || function (r) { return r.name || r.title || r.degree || r.category; })(row);
      var sub = (config.subOf || function (r) { return r.provider || r.organization || r.institution || r.category || ''; })(row);
      return '<tr>' +
        '<td class="title-cell">' + esc(title) + (config.detailOf ? '<div class="sub-cell">' + esc(config.detailOf(row)) + '</div>' : '') + '</td>' +
        (config.subCell ? '<td class="sub-cell">' + esc(sub) + '</td>' : '') +
        '<td class="actions">' +
        '<span class="badge">#' + (i + 1) + '</span>' +
        '<button class="btn btn-sm btn-ghost row-up" data-i="' + i + '" title="Move up">↑</button>' +
        '<button class="btn btn-sm btn-ghost row-down" data-i="' + i + '" title="Move down">↓</button>' +
        (config.extraActions ? config.extraActions(row) : '') +
        '<button class="btn btn-sm btn-ghost row-edit" data-id="' + esc(row._id) + '">Edit</button>' +
        '<button class="btn btn-sm btn-danger row-del" data-id="' + esc(row._id) + '">Delete</button>' +
        '</td></tr>';
    }

    function fileModal(row) {
      var modalId = 'fm' + (++_idCounter);
      var html =
        '<form id="' + modalId + '-form">' +
        '<dl class="kv" style="margin:0 0 14px"><dt>Certificate</dt><dd>' + esc((row.title || '')) + '</dd>' +
        (row.file ? '<dt>Current PDF</dt><dd><a href="' + esc(row.file) + '" target="_blank" rel="noopener">' + esc(row.file) + '</a></dd>' : '') +
        '</dl>' +
        '<label class="dropzone" id="' + modalId + '-dz" for="' + modalId + '-file">' +
        '<div class="dz-icon">📎</div><div>Drop a PDF here or <strong>click to browse</strong></div>' +
        '<div class="hint" style="margin-top:4px">Max 15 MB. The certificate card will open this PDF in a new tab.</div>' +
        '</label>' +
        '<input class="field-input" type="file" id="' + modalId + '-file" accept="application/pdf,.pdf" required style="display:none" />' +
        '<div class="upload-progress" id="' + modalId + '-prog"><div class="bar"></div></div>' +
        '</form>';
      return openModal('Attach PDF', html, function (box, close) {
        var form = $('#' + modalId + '-form', box);
        var file = $('#' + modalId + '-file', box);
        var dz = $('#' + modalId + '-dz', box);
        var prog = $('#' + modalId + '-prog', box);
        var bar = $('.bar', prog);
        file.addEventListener('change', function () {
          if (file.files[0]) { dz.classList.add('drag'); dz.querySelector('.dz-icon').textContent = '📄'; }
        });
        ['dragenter', 'dragover'].forEach(function (evt) {
          dz.addEventListener(evt, function (e) { e.preventDefault(); dz.classList.add('drag'); });
        });
        ['dragleave', 'drop'].forEach(function (evt) {
          dz.addEventListener(evt, function (e) {
            e.preventDefault();
            if (evt === 'drop') { var dt = e.dataTransfer; if (dt && dt.files && dt.files.length) { file.files = dt.files; file.dispatchEvent(new Event('change')); } }
            dz.classList.remove('drag');
          });
        });
        $('#' + modalId + '-cancel2', box).addEventListener('click', close);
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var f = file.files[0];
          if (!f) { toast('Choose a PDF first.', 'error'); return; }
          if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files are allowed.', 'error'); return; }
          if (f.size > 15 * 1024 * 1024) { toast('File is too large (max 15 MB).', 'error'); return; }
          var fd = new FormData();
          fd.append('pdf', f);
          var go = $('#' + modalId + '-go', box);
          go.disabled = true;
          prog.classList.add('active');
          uploadWithProgress(config.apiBase + '/' + row._id + '/file', fd, function (pct) { bar.style.width = pct + '%'; })
            .then(function () {
              bar.style.width = '100%';
              toast('PDF attached to the certificate.', 'ok');
              setTimeout(function () { close(); return refresh(); }, 350);
            })
            .catch(function (e2) { go.disabled = false; prog.classList.remove('active'); bar.style.width = '0%'; toast(e2.message, 'error'); });
        });
      }, '<button class="btn btn-ghost" id="' + modalId + '-cancel2" type="button">Cancel</button><button class="btn btn-primary" form="' + modalId + '-form" type="submit" id="' + modalId + '-go">Upload PDF</button>');
    }

    function refresh() {
      return load().then(function () { renderList(); });
    }

    function renderList() {
      render(config.renderTop ? config.renderTop(sorted()) : '');
      var listEl = $('#list', contentCache);
      if (!listEl) return;
      var items = sorted();
      if (!items.length) {
        listEl.innerHTML = '<div class="empty"><div class="big">🗂️</div>No ' + config.label.toLowerCase() + ' yet. Click “Add ' + config.label.toLowerCase() + '” to create the first one.</div>';
        return;
      }

      listEl.innerHTML =
        '<div class="table-wrap"><table class="tbl"><thead><tr>' +
        '<th>' + esc(config.label) + '</th>' +
        (config.subCell ? '<th>' + esc(config.subLabel || '') + '</th>' : '') +
        '<th style="width:150px;text-align:right">Actions</th>' +
        '</tr></thead><tbody>' +
        items.map(function (row, i) { return rowHtml(row, i); }).join('') +
        '</tbody></table></div>';

      // attach actions
      $$('.row-edit', listEl).forEach(function (btn) {
        btn.addEventListener('click', function () { buildForm(rows.find(function (r) { return String(r._id) === btn.getAttribute('data-id'); }) || {}); });
      });
      $$('.row-del', listEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          confirmDialog('Delete this ' + config.label.toLowerCase() + '? This cannot be undone.', true).then(function (yes) {
            if (!yes) return;
            var id = btn.getAttribute('data-id');
            api(config.apiBase + '/' + id, { method: 'DELETE' }).then(function () {
              toast(config.label + ' deleted.', 'ok');
              return refresh();
            }).catch(function (e) { toast(e.message, 'error'); });
          });
        });
      });
      $$('.row-up', listEl).forEach(function (btn) { btn.addEventListener('click', function () { moveRow(Number(btn.getAttribute('data-i')), -1); }); });
      $$('.row-down', listEl).forEach(function (btn) { btn.addEventListener('click', function () { moveRow(Number(btn.getAttribute('data-i')), 1); }); });
      $$('.row-pdf', listEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var row = rows.find(function (r) { return String(r._id) === btn.getAttribute('data-id'); });
          if (row) fileModal(row);
        });
      });
      $$('.row-pdf-del', listEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          confirmDialog('Remove the attached PDF from this certificate?', true).then(function (ok) {
            if (!ok) return;
            api(config.apiBase + '/' + id + '/file', { method: 'DELETE' }).then(function () { toast('PDF removed.', 'ok'); return refresh(); }).catch(function (e) { toast(e.message, 'error'); });
          });
        });
      });
    }

    function moveRow(i, dir) {
      var list = sorted();
      var j = i + dir;
      if (j < 0 || j >= list.length) return;
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
      var payload = list.map(function (r, k) { return { id: r._id, order: k }; });
      return api(config.apiBase + '/reorder', { method: 'PUT', body: { items: payload } }).then(function () {
        rows = list;
        renderList();
      }).catch(function (e) { toast(e.message, 'error'); });
    }

    var _idCounter = 0;
    var contentCache = null;

    function render(topHtml) {
      var btnId = 'add' + (++_idCounter);
      var c = contentCache;
      if (!c) return;
      c.innerHTML =
        '<div class="section">' +
        '<div class="page-head"><div style="flex:1"><h3>' + esc(config.label) + '</h3><p>' + esc(config.desc || '') + '</p></div>' +
        '<button class="btn btn-primary" id="' + btnId + '">＋ Add ' + esc(config.label.toLowerCase()) + '</button></div>' +
        (topHtml || '') +
        '<div id="list"><div class="table-wrap"><table class="tbl"><thead><tr>' +
        '<th>' + esc(config.label) + '</th>' +
        (config.subCell ? '<th>' + esc(config.subLabel || '') + '</th>' : '') +
        '<th style="width:150px;text-align:right">Actions</th>' +
        '</tr></thead><tbody id="skeletonBody">' +
        (config.subCell
          ? '<tr><td colspan="3">' + skeletonRows(5) + '</td></tr>'
          : '<tr><td colspan="2">' + skeletonRows(5) + '</td></tr>') +
        '</tbody></table></div></div>' +
        '</div>';
      $('#' + btnId, c).addEventListener('click', function () { buildForm(config.newDefaults ? config.newDefaults() : {}); });
    }

    return {
      render: function (content) {
        contentCache = content;
        refresh();
      }
    };
  }

  /* field helpers shared by list sections */
  function urlField(name, label, placeholder) { return { name: name, label: label, placeholder: placeholder || 'https://…', map: function (v) { return /^https?:\/\//i.test(v) ? v : ''; } }; }
  function tagsField(name, label) { return { name: name, label: label, type: 'tags', map: function (v) { return v.split(/[,;\n]/).map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 40); } }; }

  /* ================================================================ */
  /* SECTIONS                                                          */
  /* ================================================================ */

  var SECTIONS = {};
  var current = 'overview';
  function rAF(fn) { window.requestAnimationFrame(function () { fn(); }); }

  /* ----------------------------------------------------- overview ---- */
  SECTIONS.overview = {
    render: function (content) {
      var html = '<div class="section"><div class="page-head"><div><h3>Overview</h3><p>Everything is live — changes here appear on the public portfolio right away.</p></div></div><div class="stat-grid" id="stats"></div><div class="dash-grid"><div class="panel" id="activity"></div><div class="panel" id="recent"></div></div><div class="dash-grid"><div class="panel" id="recentProjects"></div><div class="panel" id="recentCerts"></div></div></div>';
      content.innerHTML = html;
      var stats = $('#stats', content);
      var activity = $('#activity', content);
      var recent = $('#recent', content);
      var recentProjects = $('#recentProjects', content);
      var recentCerts = $('#recentCerts', content);
      stats.innerHTML = '<div style="grid-column:1/-1">' + skeletonRows(4) + '</div>';
      activity.innerHTML = '<div class="panel-title">Recent activity</div>' + skeletonRows(5);
      recent.innerHTML = '<div class="panel-title">Recent messages</div>' + skeletonRows(4) + '<div class="skeleton" style="width:40%"></div>';
      recentProjects.innerHTML = '<div class="panel-title">Recent projects</div>' + skeletonRows(3);
      recentCerts.innerHTML = '<div class="panel-title">Recent certificates</div>' + skeletonRows(3);

      Promise.all([
        api('/api/admin/projects').catch(function () { return { data: [] }; }),
        api('/api/admin/certificates').catch(function () { return { data: [] }; }),
        api('/api/admin/skills').catch(function () { return { data: [] }; }),
        api('/api/admin/experience').catch(function () { return { data: [] }; }),
        api('/api/admin/education').catch(function () { return { data: [] }; }),
        api('/api/admin/messages').catch(function () { return { data: [], meta: { unread: 0 } }; })
      ]).then(function (res) {
        var projects = (res[0].data || []).slice();
        var certs = (res[1].data || []).slice();
        var skills = (res[2].data || []).slice();
        var experiences = (res[3].data || []).slice();
        var education = (res[4].data || []).slice();
        var msgs = (res[5].data || []).slice();

        var defs = [
          { num: projects.length, lbl: 'Projects', ico: '🚀' },
          { num: certs.length, lbl: 'Certificates', ico: '📜' },
          { num: skills.length, lbl: 'Skills', ico: '⚡' },
          { num: experiences.length, lbl: 'Experience', ico: '💼' },
          { num: education.length, lbl: 'Education', ico: '🎓' },
          { num: msgs.length, lbl: 'Messages', ico: '✉️' }
        ];
        stats.innerHTML = defs.map(function (s, i) {
          return '<div class="stat-card" style="animation-delay:' + (i * 0.06) + 's">' +
            '<span class="stat-icon">' + s.ico + '</span>' +
            '<div class="num" data-to="' + s.num + '">0</div>' +
            '<div class="lbl">' + esc(s.lbl) + (s.lbl === 'Messages' && (res[5].meta || {}).unread ? ' · <span class="badge badge-warn">' + ((res[5].meta || {}).unread) + ' unread</span>' : '') + '</div>' +
            '</div>';
        }).join('');
        $$('.stat-card .num', stats).forEach(function (el) {
          countUp(el, Number(el.getAttribute('data-to')), 1000);
        });

        /* recent activity - merge any collection item by updatedAt */
        var kinds = [
          { items: projects, ico: '🚀', t: 'project', name: function (r) { return r.name; }, sub: function (r) { return r.subtitle; } },
          { items: certs, ico: '📜', t: 'certificate', name: function (r) { return r.title; }, sub: function (r) { return r.provider; } },
          { items: skills, ico: '⚡', t: 'skill', name: function (r) { return r.name; }, sub: function (r) { return r.category; } },
          { items: experiences, ico: '💼', t: 'experience', name: function (r) { return r.title; }, sub: function (r) { return r.organization; } },
          { items: education, ico: '🎓', t: 'education', name: function (r) { return r.degree; }, sub: function (r) { return r.institution; } }
        ];
        var feed = [];
        kinds.forEach(function (k) {
          k.items.forEach(function (r) {
            feed.push({ when: new Date(r.updatedAt || r.createdAt || 0).getTime(), ico: k.ico, t: k.t, name: k.name(r) || '', sub: k.sub(r) || '' });
          });
        });
        feed.sort(function (a, b) { return b.when - a.when; });
        feed = feed.slice(0, 8);
        activity.innerHTML =
          '<div class="panel-title">Recent activity</div>' +
          (feed.length
            ? '<div class="activity-list">' + feed.map(function (f, i) {
              return '<div class="activity-item" style="animation-delay:' + (i * 0.05) + 's"><span class="activity-ico">' + f.ico + '</span>' +
                '<div class="activity-txt"><div class="activity-title">' + esc(f.name) + '</div>' +
                '<div class="activity-sub">' + esc(f.t) + (f.sub ? ' · ' + esc(f.sub) : '') + '</div></div>' +
                '<div class="activity-when">' + esc(fmtDate(f.when)) + '</div></div>';
            }).join('') + '</div>'
            : '<div class="empty" style="padding:16px 0">No activity yet.</div>');

        /* recent projects panel */
        recentProjects.innerHTML =
          '<div class="panel-title"><a href="#projects">Recent projects</a></div>' +
          (projects.length
            ? '<div class="mini-list">' + projects.slice(0, 4).map(function (p, i) {
              return '<a class="mini-item" data-section-link="projects" href="#projects" style="animation-delay:' + (i * 0.05) + 's">' +
                '<span class="mini-ico">🚀</span>' +
                '<div class="mini-txt"><div class="mini-title">' + esc(p.name) + '</div>' +
                '<div class="mini-sub">' + esc(p.subtitle || '') + (p.featured ? ' · <span class="badge">★ featured</span>' : '') + '</div></div>' +
                '</a>';
            }).join('') + '</div>'
            : '<div class="empty" style="padding:16px 0">No projects yet.</div>');

        /* recent certificates panel */
        recentCerts.innerHTML =
          '<div class="panel-title"><a href="#certificates">Recent certificates</a></div>' +
          (certs.length
            ? '<div class="mini-list">' + certs.slice(0, 4).map(function (c, i) {
              return '<a class="mini-item" data-section-link="certificates" href="#certificates" style="animation-delay:' + (i * 0.05) + 's">' +
                '<span class="mini-ico">📜</span>' +
                '<div class="mini-txt"><div class="mini-title">' + esc(c.title) + '</div>' +
                '<div class="mini-sub">' + esc(c.provider || '') + (c.file ? ' · <span class="badge">PDF</span>' : '') + '</div></div>' +
                '</a>';
            }).join('') + '</div>'
            : '<div class="empty" style="padding:16px 0">No certificates yet.</div>');

        /* recent messages panel */
        var totalMsgs = msgs.length;
        recent.innerHTML =
          '<div class="panel-title">Recent messages</div>' +
          '<div class="panel-sub">' + (msgs.length ? 'Latest ' + Math.min(msgs.length, 4) + ' of ' + totalMsgs + ' total.' : 'No messages yet.') + '</div>' +
          (msgs.length
            ? '<div class="mini-list">' + msgs.slice(0, 4).map(function (m, i) {
              return '<div class="mini-item" style="animation-delay:' + (i * 0.05) + 's">' +
                '<span class="mini-ico">✉️</span>' +
                '<div class="mini-txt"><div class="mini-title">' + esc(m.name) + ' <span class="muted">· ' + esc(m.email) + '</span></div>' +
                '<div class="mini-sub">' + esc(snippet(m.message, 70)) + '</div></div>' +
                '<div class="activity-when">' + esc(fmtDate(m.createdAt)) + '</div>' +
                '</div>';
            }).join('') + '</div>'
            : '<div class="empty" style="padding:16px 0">No contact messages yet.</div>');

        /* clicking a recent-item switches section */
        $$('[data-section-link]', content).forEach(function (el) {
          el.addEventListener('click', function (e) {
            e.preventDefault();
            navigate(el.getAttribute('data-section-link'));
          });
        });
      }).catch(function (e) {
        stats.innerHTML = '';
        activity.innerHTML = '<div class="panel-title">Recent activity</div>';
        recent.innerHTML = '<div class="panel-title">Recent messages</div>';
        recentProjects.innerHTML = '<div class="panel-title">Recent projects</div>';
        recentCerts.innerHTML = '<div class="panel-title">Recent certificates</div>';
        content.querySelector('.page-head').insertAdjacentHTML('beforeend',
          '<div class="alert"><strong>Overview could not load its data.</strong> ' + esc(e.message || 'Something went wrong.') + ' <button class="btn btn-sm btn-ghost" onclick="location.reload()">Reload</button></div>');
      });
    }
  };

  /* ------------------------------------------------------ profile ---- */
  SECTIONS.profile = {
    render: function (content) {
      content.innerHTML = '<div class="section"><div class="page-head"><div><h3>Profile / About</h3><p>Hero, about and contact details shown on the public site.</p></div></div><div class="panel" id="profileForm">' + skeletonRows(7) + '</div></div>';
      var panel = $('#profileForm', content);
      api('/api/admin/profile').then(function (d) {
        var p = d.data || {};
        var social = p.socials || {};
        var fields =
          { name: p.name || '', title: p.title || '', titleAccent: p.titleAccent || '', role: p.role || '', tagline: p.tagline || '', summary: p.summary || '', availability: p.availability || '', email: p.email || '', photo: p.photo || '', gh: social.github || '', li: social.linkedin || '' };
        panel.innerHTML =
          '<form id="profileEdit" novalidate>' +
          '<div class="field-row">' +
          '<div class="field"><label>Full name</label><input class="field-input" id="p_name" value="' + esc(fields.name) + '" required /></div>' +
          '<div class="field"><label>Email</label><input class="field-input" id="p_email" value="' + esc(fields.email) + '" required /></div>' +
          '</div>' +
          '<div class="field-row">' +
          '<div class="field"><label>Title</label><input class="field-input" id="p_title" value="' + esc(fields.title) + '" /></div>' +
          '<div class="field"><label>Title accent</label><input class="field-input" id="p_titleAccent" value="' + esc(fields.titleAccent) + '" /></div>' +
          '</div>' +
          '<div class="field"><label>Hero role / tag line (quoted in hero)</label><input class="field-input" id="p_role" value="' + esc(fields.role) + '" /></div>' +
          '<div class="field"><label>Availability badge</label><input class="field-input" id="p_availability" value="' + esc(fields.availability) + '" /></div>' +
          '<div class="field"><label>About / summary (used near About heading)</label><textarea class="field-input" id="p_tagline" rows="3">' + esc(fields.tagline) + '</textarea></div>' +
          '<div class="field"><label>Profile image path</label><input class="field-input" id="p_photo" value="' + esc(fields.photo) + '" /><div class="hint">Relative path from public/, e.g. images/profile/profile.jpg</div></div>' +
          '<div class="field-row">' +
          '<div class="field"><label>GitHub URL</label><input class="field-input" id="p_gh" value="' + esc(fields.gh) + '" /></div>' +
          '<div class="field"><label>LinkedIn URL</label><input class="field-input" id="p_li" value="' + esc(fields.li) + '" /></div>' +
          '</div>' +
          '<div class="field"><label>Summary (long about text)</label><textarea class="field-input" id="p_summary" rows="5">' + esc(fields.summary) + '</textarea></div>' +
          '<div class="btn-row"><button class="btn btn-ghost" type="button" id="profileReset">Cancel / Reset</button>' +
          '<button class="btn btn-primary" type="submit" id="profileSave">Save profile</button></div>' +
          '</form>';
        $('#profileEdit', content).addEventListener('submit', function (e) {
          e.preventDefault();
          var b = {
            name: $('#p_name', panel).value.trim(),
            email: $('#p_email', panel).value.trim(),
            title: $('#p_title', panel).value.trim(),
            titleAccent: $('#p_titleAccent', panel).value.trim(),
            role: $('#p_role', panel).value.trim(),
            availability: $('#p_availability', panel).value.trim(),
            tagline: $('#p_tagline', panel).value,
            summary: $('#p_summary', panel).value,
            photo: $('#p_photo', panel).value.trim(),
            socials: { github: $('#p_gh', panel).value.trim(), linkedin: $('#p_li', panel).value.trim() }
          };
          var btn = $('#profileSave', panel);
          setButtonBusy(btn, true, 'Save profile');
          api('/api/admin/profile', { method: 'PUT', body: b }).then(function () {
            toast('Profile updated. It is live on the public site.', 'ok');
            loadShell();
            SECTIONS.profile.render(content);
          }).catch(function (err) { setButtonBusy(btn, false, 'Save profile'); toast(err.message, 'error'); });
        });
        $('#profileReset', panel).addEventListener('click', function () {
          SECTIONS.profile.render(content);
          toast('Changes discarded. Form reset to the saved profile.', 'ok');
        });
      }).catch(function (e) { panel.innerHTML = '<div class="empty">Could not load profile: ' + esc(e.message) + '</div>'; });
    }
  };

  /* ----------------------------------------------------- projects ---- */
  SECTIONS.projects = crudSection({
    label: 'Project',
    apiBase: '/api/admin/projects',
    desc: 'Projects are rendered from MongoDB and stay in sync with the public site.',
    subLabel: 'Details',
    subCell: true,
    newDefaults: function () { return { featured: false }; },
    titleOf: function (r) { return r.name; },
    subOf: function (r) { return r.subtitle || r.tagline || ''; },
    subLabel: 'Subtitle',
    fields: [
      { name: 'name', label: 'Project name', required: true, maxlength: 120 },
      { name: 'subtitle', label: 'Subtitle', maxlength: 200 },
      { name: 'badge', label: 'Badge', maxlength: 80, placeholder: 'e.g. Featured', group: 'meta' },
      { name: 'tags', label: 'Technologies (comma separated)', type: 'tags', group: 'meta' },
      { name: 'featured', label: 'Featured project', type: 'checkbox', group: 'meta' },
      { name: 'tagline', label: 'Tagline (card headline)', type: 'textarea', rows: 2 },
      { name: 'description', label: 'Description', type: 'textarea', rows: 5 },
      urlField('github', 'GitHub URL', 'https://github.com/…'),
      urlField('liveUrl', 'Live demo URL', 'https://…')
    ],
    groupTitles: { meta: 'Details' },
    toPayload: function (p, editor) {
      var payload = {
        name: p.name, subtitle: p.subtitle || '', badge: p.badge || '',
        tags: p.tags || [], featured: !!p.featured,
        tagline: p.tagline || '', description: p.description || '',
        github: p.github || '', liveUrl: p.liveUrl || ''
      };
      if (editor._id) payload.id = editor._id;
      return payload;
    }
  });

  /* -------------------------------------------------- certificates ---- */
  SECTIONS.certificates = crudSection({
    label: 'Certificate',
    apiBase: '/api/admin/certificates',
    desc: 'Add, edit, reorder - and attach a PDF that public cards open in a new tab.',
    subLabel: 'Issuer',
    subCell: true,
    newDefaults: function () { return {}; },
    titleOf: function (r) { return r.title; },
    subOf: function (r) { return r.provider || ''; },
    subLabel: 'Issuer',
    extraActions: function (row) {
      var id = ' data-id="' + esc(row._id) + '"';
      if (row.file) {
        return '<a class="btn btn-sm btn-ghost" href="' + esc(row.file) + '" target="_blank" rel="noopener">PDF ↗</a>' +
          '<button class="btn btn-sm btn-ghost row-pdf"' + id + '>Replace</button>' +
          '<button class="btn btn-sm btn-danger row-pdf-del"' + id + '>Remove PDF</button>';
      }
      return '<button class="btn btn-sm btn-ghost row-pdf"' + id + '>＋ Upload PDF</button>';
    },
    fields: [
      { name: 'title', label: 'Certificate title', required: true, maxlength: 200 },
      { name: 'provider', label: 'Issuer / provider', maxlength: 120 },
      { name: 'category', label: 'Category', maxlength: 80 },
      { name: 'icon', label: 'Icon key', maxlength: 60, hint: 'Any label shown as a keyboard glyph. Optional.' },
      { name: 'issuedAt', label: 'Issued date', maxlength: 60, placeholder: 'e.g. Jan 2025' },
      { name: 'certificateId', label: 'Certificate ID', maxlength: 120 },
      urlField('credentialUrl', 'Credential URL', 'https://…')
    ],
    toPayload: function (p) {
      return { title: p.title, provider: p.provider || '', category: p.category || '', icon: p.icon || '', issuedAt: p.issuedAt || '', certificateId: p.certificateId || '', credentialUrl: p.credentialUrl || '' };
    },
    renderTop: function (rows) { return ''; }
  });

  /* ------------------------------------------------------ resume ----- */
  SECTIONS.resume = {
    render: function (content) {
      content.innerHTML = '<div class="section"><div class="page-head"><div><h3>Resume</h3><p>The public “Download Resume” button always points to the active file.</p></div></div><div class="panel" id="resumePanel">' + skeletonRows(4) + '</div></div>';
      var panel = $('#resumePanel', content);
      api('/api/admin/resume').then(function (d) {
        var m = d.data || {};
        panel.innerHTML =
          '<div class="panel-title">Active resume</div>' +
          '<dl class="kv" style="margin:12px 0">' +
          '<dt>File</dt><dd><a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.fileName || m.url) + '</a></dd>' +
          '<dt>Size</dt><dd>' + (m.size ? (Math.round(m.size / 1024 * 10) / 10) + ' KB' : 'unknown') + '</dd>' +
          '<dt>Last uploaded</dt><dd>' + esc(fmtDate(m.uploadedAt)) + '</dd>' +
          '</dl>' +
          '<div style="border:none;border-top:1px solid var(--border);margin:16px 0"></div>' +
          '<div class="panel-title">Replace resume</div>' +
          '<div class="panel-sub">Uploading replaces the active file while preserving the public URL. The previous version is archived automatically.</div>' +
          '<form id="resumeForm">' +
          '<label class="dropzone" id="resumeDropzone" for="resumeFile">' +
          '<div class="dz-icon">📄</div><div>Drop a PDF here or <strong>click to browse</strong></div>' +
          '<div class="hint" style="margin-top:4px">Max 10 MB</div>' +
          '</label>' +
          '<input class="field-input" type="file" id="resumeFile" accept="application/pdf,.pdf" required style="display:none" />' +
          '<div class="field" style="margin-top:8px"><span class="progress-note" id="resumeFileNote" style="display:none"></span></div>' +
          '<div class="upload-progress" id="resumeProgress"><div class="bar"></div></div>' +
          '<button class="btn btn-primary" type="submit" id="resumeUploadBtn" style="margin-top:8px">Upload &amp; replace</button>' +
          '</form>';
        var fileInput = $('#resumeFile', panel);
        var dz = $('#resumeDropzone', panel);
        var note = $('#resumeFileNote', panel);
        fileInput.addEventListener('change', function () {
          var f = fileInput.files[0];
          note.style.display = f ? 'flex' : 'none';
          note.textContent = f ? f.name + ' · ' + (Math.round(f.size / 1024)) + ' KB' : '';
          if (dz) dz.classList.toggle('drag', !!f);
        });
        ['dragenter', 'dragover'].forEach(function (evt) {
          dz.addEventListener(evt, function (e) { e.preventDefault(); dz.classList.add('drag'); });
        });
        ['dragleave', 'drop'].forEach(function (evt) {
          dz.addEventListener(evt, function (e) { e.preventDefault(); if (evt === 'drop') { var dt = e.dataTransfer; if (dt && dt.files && dt.files.length) { fileInput.files = dt.files; fileInput.dispatchEvent(new Event('change')); } } dz.classList.remove('drag'); });
        });
        $('#resumeForm', panel).addEventListener('submit', function (e) {
          e.preventDefault();
          var file = fileInput.files[0];
          if (!file) { toast('Choose a PDF first.', 'error'); return; }
          if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { toast('Only PDF files are allowed.', 'error'); return; }
          if (file.size > 10 * 1024 * 1024) { toast('File is too large (max 10 MB).', 'error'); return; }
          confirmDialog('Replace the active resume with “' + file.name + '”? The old version is archived.', false).then(function (ok) {
            if (!ok) return;
            var fd = new FormData();
            fd.append('pdf', file);
            var btn = $('#resumeUploadBtn', panel);
            var prog = $('#resumeProgress', panel);
            var bar = $('.bar', prog);
            var p = 0;
            setButtonBusy(btn, true, 'Upload &amp; replace');
            prog.classList.add('active');
            uploadWithProgress('/api/admin/resume', fd, function (pct) { bar.style.width = pct + '%'; p = pct; })
              .then(function () {
                bar.style.width = '100%';
                toast('Resume replaced. Download Resume now serves the new file.', 'ok');
                setTimeout(function () { SECTIONS.resume.render(content); }, 400);
              })
              .catch(function (err) { setButtonBusy(btn, false, 'Upload'); prog.classList.remove('active'); bar.style.width = '0%'; toast(err.message, 'error'); });
          });
        });
      }).catch(function (e) { panel.innerHTML = '<div class="empty">Could not load resume info: ' + esc(e.message) + '</div>'; });
    }
  };

  /* --------------------------------------------------------- skills --- */
  SECTIONS.skills = crudSection({
    label: 'Skill',
    apiBase: '/api/admin/skills',
    desc: 'Skills group under categories. Edit category to re-organize.',
    subLabel: 'Category',
    subCell: true,
    newDefaults: function () { return {}; },
    titleOf: function (r) { return r.name; },
    subOf: function (r) { return r.category || ''; },
    subLabel: 'Category',
    fields: [
      { name: 'category', label: 'Category', required: true, maxlength: 80, placeholder: 'e.g. Languages' },
      { name: 'name', label: 'Skill name', required: true, maxlength: 120 },
      { name: 'icon', label: 'Icon key', maxlength: 60 }
    ],
    toPayload: function (p) { return { category: p.category, name: p.name, icon: p.icon || '' }; }
  });

  /* ------------------------------------------------------- education -- */
  SECTIONS.education = crudSection({
    label: 'Education',
    apiBase: '/api/admin/education',
    desc: 'Your B.Tech and any other education records.',
    subLabel: 'Institution',
    subCell: true,
    newDefaults: function () { return {}; },
    titleOf: function (r) { return r.degree; },
    subOf: function (r) { return r.institution || ''; },
    subLabel: 'Institution',
    fields: [
      { name: 'degree', label: 'Degree', required: true, maxlength: 200 },
      { name: 'field', label: 'Field / specialization', maxlength: 200 },
      { name: 'institution', label: 'Institution', maxlength: 200 },
      { name: 'period', label: 'Period', maxlength: 80, placeholder: 'e.g. 2022 – 2026' },
      { name: 'detail', label: 'Details', type: 'textarea', rows: 3 }
    ],
    toPayload: function (p) { return { degree: p.degree, field: p.field || '', institution: p.institution || '', period: p.period || '', detail: p.detail || '' }; }
  });

  /* ------------------------------------------------------- experience -- */
  SECTIONS.experience = crudSection({
    label: 'Experience',
    apiBase: '/api/admin/experience',
    desc: 'Internships and roles (kept separate from Projects).',
    subLabel: 'Organization',
    subCell: true,
    newDefaults: function () { return { type: 'Internship' }; },
    titleOf: function (r) { return r.title; },
    subOf: function (r) { return r.organization || ''; },
    subLabel: 'Organization',
    fields: [
      { name: 'title', label: 'Title', required: true, maxlength: 200 },
      { name: 'organization', label: 'Organization', maxlength: 200 },
      { name: 'type', label: 'Type', type: 'select', options: ['Internship', 'Full-time', 'Contract', 'Freelance', 'Volunteer'] },
      { name: 'period', label: 'Period', maxlength: 80, placeholder: 'e.g. Jun 2025 – Sep 2025' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
      { name: 'tags', label: 'Tags (comma separated)', type: 'tags' }
    ],
    toPayload: function (p) { return { title: p.title, organization: p.organization || '', type: p.type || 'Internship', period: p.period || '', description: p.description || '', tags: p.tags || [] }; }
  });

  /* -------------------------------------------------------- messages -- */
  SECTIONS.messages = {
    render: function (content) {
      content.innerHTML = '<div class="section"><div class="page-head"><div><h3>Contact Messages</h3><p>Messages submitted through the public contact form (also sent to Gmail as before).</p></div></div><div id="msgList"><span class="spinner"></span></div></div>';
      var list = $('#msgList', content);
      api('/api/admin/messages').then(function (d) {
        var msgs = d.data || [];
        var unread = (d.meta || {}).unread || 0;
        $('#msgCount').textContent = unread ? String(unread) : '';
        list.innerHTML =
          '<div class="panel"><div class="panel-title">' + (unread ? unread + ' unread message' + (unread > 1 ? 's' : '') : 'All caught up') + '</div></div>' +
          (msgs.length
            ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>From</th><th>Subject</th><th>Message</th><th>Date</th><th>Status</th><th style="width:150px;text-align:right">Actions</th></tr></thead><tbody>' +
              msgs.map(function (m) {
                return '<tr data-id="' + esc(m._id) + '" style="' + (m.read ? 'opacity:0.65' : '') + '">' +
                  '<td class="title-cell">' + esc(m.name) + '<div class="sub-cell">' + esc(m.email) + '</div></td>' +
                  '<td class="sub-cell">' + esc(m.subject || '-') + '</td>' +
                  '<td class="sub-cell">' + esc(snippet(m.message, 70)) + '</td>' +
                  '<td class="sub-cell">' + esc(fmtDate(m.createdAt)) + '</td>' +
                  '<td>' + (m.read ? '<span class="badge">read</span>' : '<span class="badge badge-warn">unread</span>') + '</td>' +
                  '<td class="actions">' +
                  '<button class="btn btn-sm btn-ghost" data-act="open">Open</button>' +
                  '<button class="btn btn-sm btn-ghost" data-act="toggle">' + (m.read ? 'Mark unread' : 'Mark read') + '</button>' +
                  '<button class="btn btn-sm btn-danger" data-act="del">Delete</button>' +
                  '</td></tr>';
              }).join('') + '</tbody></table></div>'
            : '<div class="empty"><div class="big">📭</div>No contact messages yet.</div>');

        $$('tr[data-id]', list).forEach(function (tr) {
          var id = tr.getAttribute('data-id');
          $$('.actions button', tr).forEach(function (btn) {
            btn.addEventListener('click', function () {
              var act = btn.getAttribute('data-act');
              if (act === 'open') {
                var m = msgs.find(function (x) { return String(x._id) === id; });
                if (!m) return;
                openModal('Message from ' + m.name, '<dl class="kv">' +
                  '<dt>Name</dt><dd>' + esc(m.name) + '</dd>' +
                  '<dt>Email</dt><dd>' + esc(m.email) + '</dd>' +
                  '<dt>Date</dt><dd>' + esc(fmtDate(m.createdAt)) + '</dd>' +
                  '<dt>Subject</dt><dd>' + esc(m.subject || '-') + '</dd>' +
                  '<dt>Message</dt><dd style="white-space:pre-wrap">' + esc(m.message) + '</dd></dl>');
                if (!m.read) api('/api/admin/messages/' + id, { method: 'PATCH', body: { read: true } }).then(function () { $('#msgCount').textContent = ''; });
              } else if (act === 'toggle') {
                var cur = msgs.find(function (x) { return String(x._id) === id; });
                api('/api/admin/messages/' + id, { method: 'PATCH', body: { read: !(cur && cur.read) } }).then(function () { SECTIONS.messages.render(content); });
              } else if (act === 'del') {
                confirmDialog('Delete this message permanently?', true).then(function (ok) {
                  if (!ok) return;
                  api('/api/admin/messages/' + id, { method: 'DELETE' }).then(function () { toast('Message deleted.', 'ok'); SECTIONS.messages.render(content); }).catch(function (e) { toast(e.message, 'error'); });
                });
              }
            });
          });
        });
      }).catch(function (e) { list.innerHTML = '<div class="empty">Could not load messages: ' + esc(e.message) + '</div>'; });
    }
  };

  /* -------------------------------------------------------- settings -- */
  SECTIONS.settings = {
    render: function (content) {
      content.innerHTML = '<div class="section"><div class="page-head"><div><h3>Settings / Account</h3><p>Admin account details and password management.</p></div></div><div class="panel" id="settingsPanel">' + skeletonRows(5) + '</div></div>';
      var panel = $('#settingsPanel', content);
      api('/api/admin/auth/me').then(function (d) {
        var a = d.data || {};
        panel.innerHTML =
          '<div class="panel-title">Admin account</div>' +
          '<dl class="kv" style="margin:12px 0 18px">' +
          '<dt>Email</dt><dd>' + esc(a.email) + '</dd>' +
          '<dt>Status</dt><dd>' + (a.verified ? '<span class="badge badge-ok">✓ Verified</span>' : '<span class="badge badge-warn">Verification pending</span>') + '</dd>' +
          '<dt>Last login</dt><dd>' + esc(fmtDate(a.lastLoginAt)) + '</dd>' +
          '<dt>Verified since</dt><dd>' + esc(fmtDate(a.verifiedAt)) + '</dd>' +
          '</dl>' +
          '<div style="border:none;border-top:1px solid var(--border);margin:0 0 18px"></div>' +
          '<div class="panel-title">Change password</div>' +
          '<div class="panel-sub">You will stay signed in. Use a strong password (8+ characters).</div>' +
          '<form id="pwForm" novalidate autocomplete="off">' +
          '<div class="field"><label for="pw_current">Current password</label><input class="field-input" type="password" id="pw_current" autocomplete="current-password" required maxlength="72" /></div>' +
          '<div class="field-row">' +
          '<div class="field"><label for="pw_new">New password</label><input class="field-input" type="password" id="pw_new" autocomplete="new-password" required minlength="8" maxlength="72" /></div>' +
          '<div class="field"><label for="pw_confirm">Confirm new password</label><input class="field-input" type="password" id="pw_confirm" autocomplete="new-password" required minlength="8" maxlength="72" /></div>' +
          '</div>' +
          '<button class="btn btn-primary" type="submit" id="pwSave">Update password</button>' +
          '</form>';
        $('#pwForm', panel).addEventListener('submit', function (e) {
          e.preventDefault();
          var cur = $('#pw_current', panel).value;
          var next = $('#pw_new', panel).value;
          var conf = $('#pw_confirm', panel).value;
          if (next !== conf) {
            $('#pw_confirm', panel).classList.add('is-invalid');
            toast('New passwords do not match.', 'error');
            return;
          }
          if (next.length < 8) {
            $('#pw_new', panel).classList.add('is-invalid');
            toast('New password must be at least 8 characters.', 'error');
            return;
          }
          var btn = $('#pwSave', panel);
          setButtonBusy(btn, true, 'Update password');
          api('/api/admin/auth/change-password', { method: 'POST', body: { currentPassword: cur, newPassword: next } })
            .then(function () {
              toast('Password updated.', 'ok');
              $('#pw_current', panel).value = '';
              $('#pw_new', panel).value = '';
              $('#pw_confirm', panel).value = '';
            })
            .catch(function (err) { setButtonBusy(btn, false, 'Update password'); toast(err.message, 'error'); });
        });
      }).catch(function (e) { panel.innerHTML = '<div class="empty">Could not load account: ' + esc(e.message) + '</div>'; });
    }
  };

  /* ------------------------------------------------------------ boot -- */
  $$('.nav-item').forEach(function (item) {
    item.addEventListener('click', function () { navigate(item.getAttribute('data-section')); });
  });
  $('#menuBtn').addEventListener('click', function () {
    $('#sidebar').classList.toggle('open');
    $('#scrim').classList.toggle('open');
  });
  $('#scrim').addEventListener('click', function () {
    $('#sidebar').classList.remove('open');
    $('#scrim').classList.remove('open');
  });
  $('#logoutBtn').addEventListener('click', function () {
    api('/api/admin/auth/logout', { method: 'POST' }).then(function () {
      window.location.href = '/vinit-control/login';
    }).catch(function () { window.location.href = '/vinit-control/login'; });
  });

  boot();

  /* Signal to the watchdog that dashboard.js loaded and executed successfully. */
  window.dashboardReady = true;
})();