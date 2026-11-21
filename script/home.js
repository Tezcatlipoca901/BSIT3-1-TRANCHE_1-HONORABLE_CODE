/* home.js - expedition search panel (home.html #nations)
   Check Availability -> form.html (booking form), or the "No exact destinations found" state. */
(function () {
  'use strict';
  var NATIONS = ['Mondstadt', 'Liyue', 'Inazuma', 'Sumeru', 'Natlan', 'Fontaine', 'Snezhnaya'];
  var form = document.getElementById('search');
  if (!form) return;
  var dest = form.elements.destination, dIn = form.elements.depart, dOut = form.elements.ret, trav = form.elements.travelers;
  var err = document.getElementById('s-error'), empty = document.getElementById('nations-empty');
  var track = document.querySelector('.nations__track');
  var cards = [].slice.call(document.querySelectorAll('.nation-card'));

  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addDays(s, n) { var p = s.split('-'); return iso(new Date(+p[0], +p[1] - 1, +p[2] + n)); }

  var today = iso(new Date());
  dIn.min = today;
  if (!dIn.value || dIn.value < today) { dIn.value = addDays(today, 14); dOut.value = addDays(today, 21); }
  dOut.min = dIn.value;
  for (var i = 1; i <= 20; i++) {
    var o = document.createElement('option');
    o.value = i; o.textContent = i + (i === 1 ? ' Adult' : ' Adults');
    trav.appendChild(o);
  }
  trav.value = '2';

  // arriving from a nation page's "Book Now": ?nation=Liyue pre-fills the destination
  var wanted = (new URLSearchParams(location.search).get('nation') || '').toLowerCase();
  NATIONS.forEach(function (n) { if (n.toLowerCase() === wanted) dest.value = n; });

  function showCards(list) {
    cards.forEach(function (c, k) { c.hidden = list.indexOf(NATIONS[k]) === -1; });
    track.hidden = false; empty.hidden = true; fitCards();
  }
  function validate() {
    if (!dest.value.trim()) return 'Choose a destination.';
    if (!dIn.value || dIn.value < today) return 'Pick a departure date from today onward.';
    if (!dOut.value || dOut.value <= dIn.value) return 'Return date must be after departure.';
    return '';
  }

  dIn.addEventListener('change', function () {
    dOut.min = dIn.value;
    if (dOut.value && dOut.value <= dIn.value) dOut.value = addDays(dIn.value, 1);
  });
  dest.addEventListener('input', function () { err.textContent = ''; if (!empty.hidden) showCards(NATIONS); });
  document.getElementById('view-all').addEventListener('click', function () {
    dest.value = ''; err.textContent = ''; showCards(NATIONS); dest.focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = validate();
    err.textContent = msg;
    if (msg) return;
    var q = dest.value.trim().toLowerCase();
    var hits = NATIONS.filter(function (n) { return n.toLowerCase() === q; });
    if (!hits.length) hits = NATIONS.filter(function (n) { return n.toLowerCase().indexOf(q) > -1; });
    if (!hits.length) { cards.forEach(function (c) { c.hidden = true; }); track.hidden = true; empty.hidden = false; return; }
    if (hits.length > 1) { showCards(hits); err.textContent = hits.length + ' packages match. Refine the destination or open one below.'; return; }
    location.href = 'form.html?' + new URLSearchParams({ nation: hits[0], depart: dIn.value, 'return': dOut.value, travelers: trav.value });
  });

  // size the cards so the section fills the screen height (no empty strip below them)
  var section = document.getElementById('nations');
  function fitCards() {
    if (window.innerWidth < 1300) { section.style.removeProperty('--card-zoom'); return; }
    if (track.hidden) return;
    var cs = getComputedStyle(track);
    var room = window.innerHeight - track.offsetTop - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    section.style.setProperty('--card-zoom', Math.max(0.55, Math.min(1, room / 574)).toFixed(3));
  }
  fitCards();
  window.addEventListener('resize', fitCards);
  window.addEventListener('load', fitCards);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCards);
})();


/* "Ask Katheryne" inquiry modal (opened by the Ask a Question button in the FAQs).
   Validates the fields, then shows the "sent" state. Tranche 4: send `inquiry` to the server (PHP -> inquiries table) where marked. */
(function () {
  'use strict';
  var dlg = document.getElementById('ask'), openBtn = document.getElementById('ask-open');
  if (!dlg || !openBtn || typeof dlg.showModal !== 'function') return;
  var form = document.getElementById('ask-form'), f = form.elements;
  var done = document.getElementById('ask-done'), count = document.getElementById('ask-count');
  var MAX = 500;

  function phoneOk(v) { var d = v.replace(/\D/g, ''); return /^\+?[\d\s()-]+$/.test(v.trim()) && d.length >= 7 && d.length <= 15; }
  var rules = {
    full_name: function (v) { v = v.trim(); return !v ? 'Please enter your name.' : !/^[\p{L}][\p{L}\p{M}\s.'\u2019-]+$/u.test(v) ? 'Use letters only.' : ''; },
    email: function (v) { v = v.trim(); return !v ? 'Please enter your email.' : !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v) ? 'Enter a valid email address.' : ''; },
    phone: function (v) { return !v.trim() ? '' : phoneOk(v) ? '' : 'Enter a valid phone number.'; },   // optional
    message: function (v) { v = v.trim(); return !v ? 'Please type your question.' : v.length < 10 ? 'Add a little more detail (at least 10 characters).' : v.length > MAX ? 'Keep it to ' + MAX + ' characters.' : ''; }
  };
  function check(name) {
    var input = f[name], wrap = input.closest('.fld'), msg = rules[name](input.value);
    wrap.querySelector('.err').textContent = msg;
    wrap.classList.toggle('is-invalid', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !msg;
  }
  Object.keys(rules).forEach(function (n) {
    f[n].addEventListener('blur', function () { if (f[n].value) check(n); });
    f[n].addEventListener('input', function () { if (f[n].closest('.fld').classList.contains('is-invalid')) check(n); });
  });
  f.message.addEventListener('input', function () { count.textContent = f.message.value.length + '/' + MAX; });

  function reset() {
    form.reset(); form.hidden = false; done.hidden = true; dlg.classList.remove('is-sent');
    Object.keys(rules).forEach(function (n) {
      var w = f[n].closest('.fld'); w.classList.remove('is-invalid'); w.querySelector('.err').textContent = ''; f[n].removeAttribute('aria-invalid');
    });
    count.textContent = '0/' + MAX;
  }

  openBtn.addEventListener('click', function () { reset(); dlg.showModal(); });
  [].forEach.call(dlg.querySelectorAll('[data-ask-close]'), function (b) { b.addEventListener('click', function () { dlg.close(); }); });
  // click on the dimmed backdrop (outside the framed box) closes it
  dlg.addEventListener('click', function (e) {
    var r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = null;
    Object.keys(rules).forEach(function (n) { if (!check(n) && !bad) bad = f[n]; });
    if (bad) { bad.focus(); return; }
    var inquiry = {
      full_name: f.full_name.value.trim().replace(/\s+/g, ' '), email: f.email.value.trim(), phone: f.phone.value.trim(),
      package: f['package'].value === 'general' ? '' : f['package'].value, message: f.message.value.trim()
    };
    // Tranche 4: POST `inquiry` to the server here (find/create the client by email, then add an inquiries row).
    form.hidden = true; done.hidden = false; dlg.classList.add('is-sent');
    done.querySelector('.ask__close').focus();
  });
})();