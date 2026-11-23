/* form.js - booking form. Reads ?nation&depart&return&travelers from home.js,
   validates, then hands a summary (never card details) to confirmation.html. */
(function () {
  'use strict';
  var NATIONS = {
    Mondstadt: { n: '3 Days / 2 Nights', p: 12500, d: 'Experience the romantic charm of windmills, rolling green hills, and historic stone architecture. Perfect for travelers looking for a relaxing nature getaway.' },
    Liyue: { n: '4 Days / 3 Nights', p: 15000, d: 'A bustling port city tour blending breathtaking mountain ranges, ancient folklore, and world-class culinary adventures.' },
    Inazuma: { n: '4 Days / 3 Nights', p: 18000, d: 'Discover a culturally rich archipelago featuring striking purple foliage, traditional shrines, and serene coastal views.' },
    Sumeru: { n: '3 Days / 3 Nights', p: 14000, d: 'A dual-environment journey taking you from the majestic halls of learning to the dense, mystical canopies of the rainforest.' },
    Natlan: { n: '4 Days / 3 Nights', p: 16500, d: 'An energetic adventure featuring dramatic volcanic landscapes, therapeutic thermal springs, and vibrant tribal festivals.' },
    Fontaine: { n: '5 Days / 4 Nights', p: 20000, d: 'Step into a picturesque hub of art, fashion, and advanced clockwork engineering surrounded by pristine waters.' },
    Snezhnaya: { n: '5 Days / 4 Nights', p: 22000, d: 'A majestic winter expedition exploring frosted architectural marvels, grand palaces, and cozy alpine chalets under the aurora.' }
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
  function syncReturnMin() {
    f.ret.min = f.depart.value ? addDays(f.depart.value, 1) : today;
    if (f.ret.value && f.depart.value && f.ret.value <= f.depart.value) f.ret.value = '';
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
  function showPayFields() { $('card-fields').hidden = method() !== 'Credit Card'; $('paypal-fields').hidden = method() !== 'PayPal'; }
  form.addEventListener('change', function (e) { if (e.target.name === 'pay') showPayFields(); });

  // input masks
  f.card.addEventListener('input', function () { f.card.value = f.card.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})(?=.)/g, '$1 '); });
  f.exp.addEventListener('input', function () { var d = f.exp.value.replace(/\D/g, '').slice(0, 4); f.exp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; });
  f.cvc.addEventListener('input', function () { f.cvc.value = f.cvc.value.replace(/\D/g, '').slice(0, 4); });

  function phoneOk(v) {
    var value = v.trim(), digits = value.replace(/\D/g, '');
    return /^\+?(?:\d|\(\d)[\d\s()-]*\d$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }
  f.phone.addEventListener('input', function () {
    var value = f.phone.value.replace(/[^\d\s()+-]/g, '').replace(/(?!^)\+/g, '');
    if (f.phone.value !== value) f.phone.value = value;
  });

  var rules = {
    depart: function (v) { return !v ? 'Pick a departure date.' : v < today ? 'Departure can\u2019t be in the past.' : ''; },
    ret: function (v) { return !v ? 'Pick a return date.' : v <= f.depart.value ? 'Return must be after departure.' : ''; },
    name: function (v) { v = v.trim(); return !v ? 'Please enter your name.' : !/^[\p{L}][\p{L}\p{M}\s.'\u2019-]+$/u.test(v) ? 'Use letters only.' : ''; },
    email: function (v) { v = v.trim(); return !v ? 'Please enter your email.' : !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v) ? 'Enter a valid email address.' : ''; },
    phone: function (v) { return !v.trim() ? 'Please enter your phone number.' : phoneOk(v) ? '' : 'Enter a valid phone number (7 to 15 digits).'; },
    notes: function () { return ''; },
    paypal: function (v) { var d = v.replace(/\D/g, ''); return !v.trim() ? 'Enter your PayPal number.' : (!/^\+?[\d\s()-]+$/.test(v.trim()) || d.length < 7 || d.length > 15) ? 'Enter a valid PayPal number.' : ''; },
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
    try { sessionStorage.setItem('wpgBooking', JSON.stringify(booking)); } catch (err) { /* confirmation falls back to sample data */ }
    location.href = 'confirmation.html';
  });

  showPayFields();
  render();
})();
