/* form.js - booking form. Reads ?nation&depart&return&travelers from home.js,
   validates, then shows the confirmation modal (never card details). */
(function () {
  'use strict';
  var NATIONS = {
    Mondstadt: { n: '3 Days / 2 Nights', days: 3, p: 12500, d: 'Experience the romantic charm of windmills, rolling green hills, and historic stone architecture. Perfect for travelers looking for a relaxing nature getaway.' },
    Liyue: { n: '4 Days / 3 Nights', days: 4, p: 15000, d: 'A bustling port city tour blending breathtaking mountain ranges, ancient folklore, and world-class culinary adventures.' },
    Inazuma: { n: '4 Days / 3 Nights', days: 4, p: 18000, d: 'Discover a culturally rich archipelago featuring striking purple foliage, traditional shrines, and serene coastal views.' },
    Sumeru: { n: '3 Days / 3 Nights', days: 3, p: 14000, d: 'A dual-environment journey taking you from the majestic halls of learning to the dense, mystical canopies of the rainforest.' },
    Natlan: { n: '4 Days / 3 Nights', days: 4, p: 16500, d: 'An energetic adventure featuring dramatic volcanic landscapes, therapeutic thermal springs, and vibrant tribal festivals.' },
    Fontaine: { n: '5 Days / 4 Nights', days: 5, p: 20000, d: 'Step into a picturesque hub of art, fashion, and advanced clockwork engineering surrounded by pristine waters.' },
    Snezhnaya: { n: '5 Days / 4 Nights', days: 5, p: 22000, d: 'A majestic winter expedition exploring frosted architectural marvels, grand palaces, and cozy alpine chalets under the aurora.' }
  };
  var $ = function (id) { return document.getElementById(id); };
  var form = $('res-form'), qs = new URLSearchParams(location.search);
  var key = 'Mondstadt';
  Object.keys(NATIONS).forEach(function (k) { if (k.toLowerCase() === (qs.get('nation') || '').toLowerCase()) key = k; });
  var nation = NATIONS[key];
  var trav = Math.max(1, parseInt(qs.get('travelers'), 10) || 2);
  var f = form.elements;

  $('t-name').textContent = key; $('t-dur').textContent = nation.n; $('t-desc').textContent = nation.d;
  $('t-img').src = '../assets/' + key.toLowerCase() + '/itinerary.jpg'; $('t-img').alt = key;
  f.depart.value = qs.get('depart') || '';
  f.ret.value = qs.get('return') || '';

  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addDays(s, n) { var p = s.split('-'); return iso(new Date(+p[0], +p[1] - 1, +p[2] + n)); }
  function long(s) { var p = s.split('-'); return p.length < 3 || !p[0] ? '' : new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  function peso(n) { return '\u20B1' + n.toLocaleString('en-US'); }
  function datesText() { return long(f.depart.value) && long(f.ret.value) ? long(f.depart.value) + ' - ' + long(f.ret.value) : ''; }
  var today = iso(new Date());
  f.depart.min = today;
  f.ret.readOnly = true;
  function syncReturnMin() {
    if (!f.depart.value || f.depart.value.slice(0, 4) < '2000') {
      f.ret.value = '';
      f.ret.min = today;
      f.ret.max = '';
      return;
    }
    var expectedReturn = addDays(f.depart.value, nation.days);
    f.ret.min = expectedReturn;
    f.ret.max = expectedReturn;
    f.ret.value = expectedReturn;
  }
  syncReturnMin();

  function render() {
    $('t-trav').textContent = trav;
    $('t-dates').textContent = datesText();
    $('f-rate').textContent = peso(nation.p) + ' x ' + trav + (trav === 1 ? ' traveler' : ' travelers');
    $('f-total').textContent = peso(nation.p * trav);
    $('t-minus').disabled = trav <= 1;
  }
  $('t-minus').addEventListener('click', function () { trav = Math.max(1, trav - 1); render(); });
  $('t-plus').addEventListener('click', function () { trav += 1; render(); });
  f.depart.addEventListener('change', function () { syncReturnMin(); render(); });
  f.ret.addEventListener('change', render);

  function method() { return form.querySelector('input[name="pay"]:checked').value; }
  function showPayFields() { $('card-fields').hidden = method() !== 'Credit Card'; $('paypal-fields').hidden = method() !== 'PayPal'; $('agency-fields').hidden = method() !== 'Pay at Agency'; }
  form.addEventListener('change', function (e) { if (e.target.name === 'pay') showPayFields(); });

  // input masks
  f.card.addEventListener('input', function () { f.card.value = f.card.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})(?=.)/g, '$1 '); });
  f.exp.addEventListener('input', function () { var d = f.exp.value.replace(/\D/g, '').slice(0, 4); f.exp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; });
  f.cvc.addEventListener('input', function () { f.cvc.value = f.cvc.value.replace(/\D/g, '').slice(0, 4); });

  function phoneOk(v) {
    var value = v.trim(), digits = value.replace(/\D/g, '');
    return /^\+?(?:\d|\(\d)[\d\s()-]*\d$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }
  function restrictPhoneInput(input) {
    input.addEventListener('input', function () {
      var value = input.value.replace(/[^\d\s()+-]/g, '').replace(/(?!^)\+/g, '');
      if (input.value !== value) input.value = value;
    });
  }
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
    return !/^[^\s@]+$/.test(v.slice(0, at)) ? 'Enter a valid email address.' : '';
  }
  restrictPhoneInput(f.phone);
  restrictPhoneInput(f.paypal);
  f.name.addEventListener('input', function () {
    var value = f.name.value.replace(/[^\p{L}\p{M}\s.'\u2019-]/gu, '');
    if (f.name.value !== value) f.name.value = value;
  });

  var rules = {
    depart: function (v) { return !v ? 'Pick a departure date.' : v < today ? 'Departure can\u2019t be in the past.' : ''; },
    ret: function (v) { return !v ? 'Pick a return date.' : !f.depart.value || v !== addDays(f.depart.value, nation.days) ? 'This package requires a ' + nation.days + '-day trip.' : ''; },
    name: function (v) { v = v.trim(); return !v ? 'Please enter your name.' : !fullNameOk(v) ? 'Use letters and single spaces only; apostrophes, periods, and hyphens must be within a name.' : ''; },
    email: function (v) { return emailError(v.trim()); },
    phone: function (v) { return !v.trim() ? 'Please enter your phone number.' : phoneOk(v) ? '' : 'Enter a valid phone number (7 to 15 digits).'; },
    notes: function () { return ''; },
    paypal: function (v) { return !v.trim() ? 'Enter your PayPal number.' : phoneOk(v) ? '' : 'Enter a valid PayPal number (7 to 15 digits).'; },
    card: function (v) { var d = v.replace(/\D/g, ''); return !d ? 'Enter your card number.' : (d.length < 13 || d.length > 19) ? 'Card number should be 13 to 19 digits.' : ''; },
    exp: function (v) {
      var m = /^(\d{2})\/(\d{2})$/.exec(v); if (!v) return 'Enter the expiry date.';
      if (!m || +m[1] < 1 || +m[1] > 12) return 'Use MM/YY.';
      var now = new Date(); return (2000 + +m[2]) * 12 + +m[1] < now.getFullYear() * 12 + now.getMonth() + 1 ? 'This card has expired.' : '';
    },
    cvc: function (v) { return !v ? 'Enter the CVC.' : !/^\d{3,4}$/.test(v) ? 'CVC is 3 or 4 digits.' : ''; }
  };
  function check(name) {
    var input = f[name], wrap = input.closest('.fld'), msg = rules[name](input.value);
    wrap.querySelector('.err').textContent = msg; wrap.classList.toggle('is-invalid', !!msg);
    msg ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid');
    return !msg;
  }
  Object.keys(rules).forEach(function (n) {
    f[n].addEventListener('blur', function () { if (f[n].value) check(n); });
    f[n].addEventListener('input', function () { if (f[n].closest('.fld').classList.contains('is-invalid')) check(n); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var names = ['depart', 'ret', 'name', 'email', 'phone', 'notes'].concat(method() === 'Credit Card' ? ['card', 'exp', 'cvc'] : method() === 'PayPal' ? ['paypal'] : []);
    var bad = null;
    names.forEach(function (n) { if (!check(n) && !bad) bad = f[n]; });
    if (bad) { bad.focus(); return; }
    var booking = {
      ref: 'WPG-' + (1000 + Math.floor(Math.random() * 9000)),
      name: f.name.value.trim().replace(/\s+/g, ' '), email: f.email.value.trim(),
      nation: key, dates: datesText(), travelers: trav, amount: peso(nation.p * trav), method: method()
    };
    try { sessionStorage.setItem('wpgBooking', JSON.stringify(booking)); } catch (err) { /* modal falls back gracefully */ }
    openConfModal(booking);
  });

  showPayFields();
  render();

  function openConfModal(b) {
    var backdrop = $('conf-backdrop');
    var v = {
      first: b.name.split(' ')[0],
      email: b.email,
      ref: '#' + b.ref,
      amount: b.amount,
      nation: b.nation,
      dates: b.dates,
      travelers: b.travelers + (b.travelers === 1 ? ' Traveler' : ' Travelers'),
      method: b.method
    };
    [].forEach.call(backdrop.querySelectorAll('[data-cf]'), function (el) {
      var key = el.getAttribute('data-cf');
      if (v[key] != null) el.textContent = v[key];
    });
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    // Trap focus on the modal close button
    var closeBtn = backdrop.querySelector('.conf-modal__close');
    if (closeBtn) closeBtn.focus();
    // Close on backdrop click (outside modal)
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) window.location.href = 'home.html#nations';
    });
    // Close on Escape key
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onEsc); window.location.href = 'home.html#nations'; }
    });
  }
})();