/* Shared logic for the admin auth pages (login / forgot / verify / reset).
   Premium animated UI helpers + the same secure API flows as before. */
(function () {
  'use strict';

  var page = window.__ADMIN_PAGE__ || 'login';

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(message, type) {
    var box = $('#toasts');
    if (!box) return;
    var el = document.createElement('div');
    var ico = (type === 'error' ? '✕' : type === 'warn' ? '⚠' : '✓');
    el.className = 'toast ' + (type || 'ok');
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="t-ico">' + ico + '</span><span>' + escapeHtml(message) + '</span>';
    box.appendChild(el);
    setTimeout(function () {
      el.classList.add('hide');
      setTimeout(function () { el.remove(); }, 300);
    }, 4200);
  }

  function shakeCard() {
    var card = $('.auth-card');
    if (!card) return;
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  }

  function setBusy(btn, busy) {
    if (!btn) return;
    if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', btn.innerHTML);
    btn.disabled = busy;
    btn.innerHTML = busy
      ? '<span class="spinner in-btn"></span> Please wait…'
      : btn.getAttribute('data-label');
  }

  async function api(path, opts) {
    var init = Object.assign({ credentials: 'same-origin' }, opts || {});
    init.headers = Object.assign({ 'Content-Type': 'application/json' }, init.headers || {});
    var res;
    try {
      res = await fetch(path, init);
    } catch (_) {
      throw { status: 0, message: 'Network error. Is the server running?' };
    }
    var data = null;
    try { data = await res.json(); } catch (_) { /* noop */ }
    if (!res.ok) {
      var err = new Error((data && data.message) || 'Request failed (' + res.status + ').');
      err.status = res.status;
      err.code = data && data.code;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function submit(path, body) {
    var btn = $('#submitBtn');
    var form = $('form');
    var busy = false;
    if (form) {
      busy = !form.checkValidity();
      if (busy) { form.reportValidity(); return null; }
    }
    setBusy(btn, true);
    try {
      return await api(path, { method: 'POST', body: JSON.stringify(body) });
    } finally {
      setBusy(btn, false);
    }
  }

  function markInvalid(field) {
    if (!field) return;
    field.classList.add('is-invalid');
  }

  // --------------------------------------------------------------- login --
  if (page === 'login') {
    api('/api/admin/auth/me')
      .then(function (d) {
        if (d && d.success) window.location.replace('/vinit-control/dashboard');
      })
      .catch(function () { /* not signed in - stay on login */ });

    var form = $('#loginForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      var email = $('#email').value.trim();
      var password = $('#password').value;
      if (!email || !password) {
        if (!email) markInvalid($('#email'));
        if (!password) markInvalid($('#password'));
        toast('Please enter your email and password.', 'error');
        shakeCard();
        return;
      }
      try {
        var data = await submit('/api/admin/auth/login', { email, password });
        if (data && data.success) {
          toast('Signed in. Redirecting…', 'ok');
          setTimeout(function () { window.location.href = '/vinit-control/dashboard'; }, 450);
        }
      } catch (err) {
        if (err.status === 403 && err.code === 'verification_required') {
          toast('Verification required. Redirecting…', 'warn');
          setTimeout(function () {
            window.location.href = '/vinit-control/verify?sent=1&email=' + encodeURIComponent(email);
          }, 400);
          return;
        } else {
          toast(err.status === 429 ? 'Too many attempts. Please wait and try again.' : (err.message || 'Sign in failed.'), 'error');
        }
        shakeCard();
      }
    });

    // password show / hide (eye) toggle
    var pwInput = $('#password');
    var pwToggle = $('#pwToggle');
    if (pwInput && pwToggle) {
      pwToggle.addEventListener('click', function () {
        var show = pwInput.type === 'password';
        pwInput.type = show ? 'text' : 'password';
        pwToggle.setAttribute('aria-pressed', String(show));
        pwToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        var wrap = pwInput.closest('.pw-wrap');
        if (wrap) wrap.classList.toggle('show', show);
        pwInput.focus();
      });
    }
  }

  // -------------------------------------------------------------- forgot --
  if (page === 'forgot') {
    var fForm = $('#forgotForm');
    fForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      var email = $('#email').value.trim();
      if (!email) { markInvalid($('#email')); toast('Enter your admin email.', 'error'); return; }
      try {
        var data = await submit('/api/admin/auth/forgot-password', { email });
        toast(data && data.success
          ? 'If that email is registered, a reset link has been sent.'
          : 'Something went wrong. Please try again.',
          data && data.success ? 'ok' : 'error');
      } catch (err) {
        toast(err.status === 429 ? 'Too many requests. Please wait a moment.' : err.message, 'error');
      }
    });
  }

  // -------------------------------------------------------------- verify --
  if (page === 'verify') {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token') || '';
    var email = params.get('email') || '';
    var sent = params.get('sent') === '1';

    if (sent && !token) {
      $('#statusText').textContent = 'A verification email has been sent. Open the link inside it to finish verifying your address.';
      $('#statusText').classList.add('ok-text');
      $('#spinner').style.display = 'none';
      $('#actionArea').innerHTML =
        '<button class="btn btn-block btn-primary" id="resendBtn" style="margin-top:14px">Resend verification email</button>' +
        '<p class="muted" style="text-align:center;font-size:12px;margin-top:8px">The link is valid for 60 minutes.</p>';
      var rbtn = $('#resendBtn');
      rbtn.addEventListener('click', async () => {
        setBusy(rbtn, true);
        $('#actionArea').innerHTML += '<div class="upload-progress active"><div class="bar" style="width:0%"></div></div>';
        var bar = $('.upload-progress .bar');
        var p = 0;
        var iv = setInterval(function () { p = Math.min(p + Math.random() * 22, 88); bar.style.width = p + '%'; }, 160);
        try {
          var rd = await api('/api/admin/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
          });
          clearInterval(iv);
          bar.style.width = '100%';
          setTimeout(function () { var el = $('.upload-progress'); if (el) el.remove(); }, 400);
          toast(rd && rd.message ? rd.message : 'Verification email sent.', 'ok');
        } catch (err2) {
          clearInterval(iv);
          var el2 = $('.upload-progress'); if (el2) el2.remove();
          toast(err2.status === 429 ? 'Too many requests. Please wait a moment.' : err2.message, 'error');
        } finally {
          setBusy(rbtn, false);
        }
      });
      return;
    }

    if (!token) {
      $('#statusText').textContent = 'This verification link is missing its token. Use the link from your email, or ask for a new one.';
      $('#spinner').style.display = 'none';
      return;
    }

    (async function () {
      try {
        var data = await api('/api/admin/auth/verify', { method: 'POST', body: JSON.stringify({ token }) });
        if (data && data.success) {
          $('#statusText').textContent = 'Email verified successfully. You can now sign in.';
          $('#statusText').classList.add('ok-text');
          $('#spinner').style.display = 'none';
          var el = document.createElement('div');
          el.style.marginTop = '16px';
          el.innerHTML = '<a class="btn btn-primary btn-block" href="/vinit-control/login">Go to sign in</a>';
          $('#actionArea').appendChild(el);
        }
      } catch (err) {
        $('#spinner').style.display = 'none';
        $('#statusText').textContent = err.message || 'Verification failed.';
        if (err.code === 'expired') {
          $('#actionArea').innerHTML = '<button class="btn btn-block" id="resendBtn" style="margin-top:14px">Request a new verification email</button><p class="muted" style="text-align:center;font-size:12px;margin-top:8px">Resending will email ' + (email ? escapeHtml(email) : 'your address') + ' a fresh link (60 min validity).</p>';
          var b2 = $('#resendBtn');
          b2.addEventListener('click', async () => {
            setBusy(b2, true);
            try {
              var d2 = await api('/api/admin/auth/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email })
              });
              toast(d2 && d2.message ? d2.message : 'Verification email sent.', 'ok');
            } catch (err2) {
              toast(err2.status === 429 ? 'Too many requests. Please wait a moment.' : err2.message, 'error');
            } finally {
              setBusy(b2, false);
            }
          });
        }
        shakeCard();
      }
    });
  }

  // -------------------------------------------------------------- reset --
  if (page === 'reset') {
    var rParams = new URLSearchParams(window.location.search);
    var rToken = rParams.get('token') || '';

    if (!rToken) {
      $('#resetForm').outerHTML =
        '<div class="empty"><div class="big">🔗</div>This reset link is missing its token. Use the link from your email and try again.</div>';
      return;
    }

    var rForm = $('#resetForm');
    rForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      var password = $('#password').value;
      var confirm = $('#confirm').value;
      if (password !== confirm) {
        markInvalid($('#confirm'));
        toast('Passwords do not match.', 'error');
        shakeCard();
        return;
      }
      if (password.length < 8) {
        markInvalid($('#password'));
        toast('Password must be at least 8 characters.', 'error');
        return;
      }
      try {
        var data = await submit('/api/admin/auth/reset-password', { token: rToken, password });
        if (data && data.success) {
          toast('Password updated. Redirecting to sign in…', 'ok');
          setTimeout(function () { window.location.href = '/vinit-control/login'; }, 900);
        }
      } catch (err) {
        toast(err.status === 429 ? 'Too many requests. Please wait a moment.' : err.message, 'error');
        shakeCard();
      }
    });
  }
})();