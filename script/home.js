/* home.js - expedition search panel (home.html #nations)
   Check Availability -> form.html (booking form), or the "No exact destinations found" state. */
(function () {
  'use strict';
  var NATIONS = ['Mondstadt', 'Liyue', 'Inazuma', 'Sumeru', 'Natlan', 'Fontaine', 'Snezhnaya'];
  // Adjust these day counts to match your package cards
  var NATION_DAYS = {
    Mondstadt: 3,
    Liyue: 4,
    Inazuma: 4,
    Sumeru: 3,
    Natlan: 4,
    Fontaine: 5,
    Snezhnaya: 5
  };
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
  dOut.min = today;
  dOut.readOnly = true;

  function syncReturnDate() {
    var q = dest.value.trim().toLowerCase();
    var match = NATIONS.filter(function (n) { return n.toLowerCase() === q; })[0];

    if (!match || !dIn.value || dIn.value.slice(0, 4) < '2000') {
      dOut.value = '';
      return;
    }

    var days = NATION_DAYS[match] || 1;
    dOut.min = dIn.value;
    dOut.value = addDays(dIn.value, days);
  }

  // Travelers: type any number (no upper limit) or pick a quick option from the list. Counts everyone, children included.
  var list = document.getElementById('s-trav-list'), comboBtn = form.querySelector('.combo__btn');
  function fmt(n) { return n + (n === 1 ? ' Traveler' : ' Travelers'); }
  function count() { var m = /\d+/.exec(trav.value); return m ? parseInt(m[0], 10) : NaN; }
  function setOpen(o) { list.hidden = !o; trav.setAttribute('aria-expanded', String(o)); }
  var note0 = document.createElement('li'); note0.className = 'combo__note'; note0.setAttribute('aria-hidden', 'true');
  note0.textContent = 'Total guests, children included'; list.appendChild(note0);
  for (var i = 1; i <= 10; i++) {
    var li = document.createElement('li'); li.setAttribute('role', 'option'); li.dataset.n = i; li.textContent = fmt(i); list.appendChild(li);
  }
  list.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li[data-n]'); if (!li) return;
    e.preventDefault(); trav.value = fmt(+li.dataset.n); setOpen(false); err.textContent = '';
  });
  comboBtn.addEventListener('mousedown', function (e) { e.preventDefault(); if (list.hidden) { trav.focus(); setOpen(true); } else setOpen(false); });
  trav.addEventListener('focus', function () { var c = count(); trav.value = isNaN(c) ? '' : c; trav.select(); setOpen(true); });
  trav.addEventListener('input', function () { trav.value = trav.value.replace(/\D/g, ''); err.textContent = ''; });
  trav.addEventListener('blur', function () { setOpen(false); var c = count(); if (c >= 1) trav.value = fmt(c); });
  trav.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); trav.value = Math.max(1, (count() || 1) + (e.key === 'ArrowDown' ? 1 : -1)); setOpen(true); }
    else if (e.key === 'Escape') setOpen(false);
  });

  // arriving from a nation page's "Book Now": ?nation=Liyue pre-fills the destination
  var wanted = (new URLSearchParams(location.search).get('nation') || '').toLowerCase();
  NATIONS.forEach(function (n) { if (n.toLowerCase() === wanted) dest.value = n; });
  syncReturnDate();

  function showCards(list) {
    cards.forEach(function (c, k) { c.hidden = list.indexOf(NATIONS[k]) === -1; });
    track.hidden = false; empty.hidden = true; fitCards();
  }
  function validate() {
    if (!dest.value.trim()) return 'Choose a destination.';
    if (!dIn.value) return 'Enter a valid departure date (MM/DD/YYYY).';
    if (dIn.value < today) return 'Pick a departure date from today onward.';
    if (!dOut.value) return 'Select an exact destination to calculate the return date.';
    if (dOut.value <= dIn.value) return 'Return date must be after departure.';
    var c = count(); if (isNaN(c) || c < 1) return 'Enter at least 1 traveler.';
    return '';
  }

  dIn.addEventListener('change', function () {
    if (!dIn.value || dIn.value.slice(0, 4) < '2000') {   // ignore half-typed years while the visitor is entering a date by hand
      dOut.value = '';
      return;
    }
    syncReturnDate();
  });
  // Filter clearing: the x button, emptying the field, or "View All Packages" / "Clear filter" all bring every card back
  var clr = form.querySelector('.clearable__btn');
  function syncClear() { clr.hidden = !dest.value; }
  function clearFilter() { dest.value = ''; err.textContent = ''; syncClear(); syncReturnDate(); showCards(NATIONS); }
  function note(msg, withClear) {
    err.textContent = msg;
    if (!withClear) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'search__link'; b.textContent = 'Clear filter';
    b.addEventListener('click', function () { clearFilter(); dest.focus(); });
    err.appendChild(document.createTextNode(' ')); err.appendChild(b);
  }
  dest.addEventListener('input', function () { err.textContent = ''; syncClear(); syncReturnDate(); if (!dest.value.trim() || !empty.hidden) showCards(NATIONS); });
  clr.addEventListener('click', function () { clearFilter(); dest.focus(); });
  document.getElementById('view-all').addEventListener('click', function () { clearFilter(); dest.focus(); });
  syncClear();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = validate();
    note(msg);
    if (msg) return;
    var q = dest.value.trim().toLowerCase();
    var hits = NATIONS.filter(function (n) { return n.toLowerCase() === q; });
    if (!hits.length) hits = NATIONS.filter(function (n) { return n.toLowerCase().indexOf(q) > -1; });
    if (!hits.length) { cards.forEach(function (c) { c.hidden = true; }); track.hidden = true; empty.hidden = false; return; }
    if (hits.length > 1) { showCards(hits); note(hits.length + ' packages match. Refine the destination or open one below.', true); return; }
    location.href = 'form.html?' + new URLSearchParams({ nation: hits[0], depart: dIn.value, 'return': dOut.value, travelers: count() });
  });

  // size the cards so the section fills the screen height (no empty strip below them)
  var section = document.getElementById('nations');
  function fitCards() {
    if (window.innerWidth < 1300) { section.style.removeProperty('--card-zoom'); return; }
    if (track.hidden) return;
    var cs = getComputedStyle(track);
    var bar = track.offsetHeight - track.clientHeight;   // height of the visible scrollbar
    var room = window.innerHeight - track.offsetTop - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - bar;
    section.style.setProperty('--card-zoom', Math.max(0.55, Math.min(1, room / 574)).toFixed(3));
  }
  fitCards();
  window.addEventListener('resize', fitCards);
  window.addEventListener('load', fitCards);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCards);
  // Horizontal scrolling for the cards: mouse wheel, click-and-drag swipe (touch / trackpad swipe already work natively)
  track.addEventListener('wheel', function (e) {
    if (window.innerWidth < 1300 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    var max = track.scrollWidth - track.clientWidth;
    if ((e.deltaY > 0 && track.scrollLeft >= max - 1) || (e.deltaY < 0 && track.scrollLeft <= 0)) return;   // at either end: let the page scroll
    e.preventDefault(); track.scrollLeft += e.deltaY;
  }, { passive: false });
  var drag = false, moved = false, sx = 0, sl = 0;
  track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - sx;
    if (Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
    if (moved) track.scrollLeft = sl - dx;
  });
  window.addEventListener('pointerup', function () { drag = false; track.classList.remove('is-dragging'); });
  track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);   // a drag must not open a card
  track.addEventListener('dragstart', function (e) { e.preventDefault(); });
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

  function phoneOk(v) {
    var value = v.trim(), digits = value.replace(/\D/g, '');
    return /^\+?(?:\d|\(\d)[\d\s()-]*\d$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }
  f.phone.addEventListener('input', function () {
    var value = f.phone.value.replace(/[^\d\s()+-]/g, '').replace(/(?!^)\+/g, '');
    if (f.phone.value !== value) f.phone.value = value;
  });
  function fullNameOk(v) {
    var namePart = "[\\p{L}][\\p{L}\\p{M}]*(?:[.'\\u2019-][\\p{L}\\p{M}]+)*";
    return new RegExp('^' + namePart + '(?: ' + namePart + ')*$', 'u').test(v);
  }
  function emailError(v) {
    var at = v.indexOf('@'), domain;
    if (!v) return 'Please enter your email.';
    if (v.length < 6) return 'Email address must be at least 6 characters.';
    if (v.length > 254) return 'Email address must be 254 characters or fewer.';
    if (at < 1 || at !== v.lastIndexOf('@')) return 'Enter an email address with an @ symbol.';
    domain = v.slice(at + 1);
    if (!/^[^\s@.]+(?:\.[^\s@.]+)+$/.test(domain)) return 'Enter an email address with a valid domain extension (for example, .com).';
    if (!/^[^\s@]+$/.test(v.slice(0, at))) return 'Enter a valid email address.';
    return '';
  }
  var rules = {
    full_name: function (v) { v = v.trim(); return !v ? 'Please enter your name.' : !fullNameOk(v) ? 'Use letters and single spaces only; apostrophes, periods, and hyphens must be within a name.' : ''; },
    email: function (v) { return emailError(v.trim()); },
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
  f.full_name.addEventListener('input', function () {
    var value = f.full_name.value.replace(/[^\p{L}\p{M}\s.'\u2019-]/gu, '');
    if (f.full_name.value !== value) f.full_name.value = value;
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
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); });

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