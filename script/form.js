/* form.js - booking form. Reads ?nation&depart&return&travelers,
   enforces the same departure calendar schedule and traveler slot presets as home.js,
   validates, then shows the confirmation modal (never card details). */
(function () {
  'use strict';
  var NATIONS = {
    Mondstadt: { n: '3 Days / 2 Nights', days: 3, p: 12500, d: 'Experience the romantic charm of windmills, rolling green hills, and historic stone architecture. Perfect for travelers looking for a relaxing nature getaway.' },
    Liyue:     { n: '4 Days / 3 Nights', days: 4, p: 15000, d: 'A bustling port city tour blending breathtaking mountain ranges, ancient folklore, and world-class culinary adventures.' },
    Inazuma:   { n: '4 Days / 3 Nights', days: 4, p: 18000, d: 'Discover a culturally rich archipelago featuring striking purple foliage, traditional shrines, and serene coastal views.' },
    Sumeru:    { n: '3 Days / 3 Nights', days: 3, p: 14000, d: 'A dual-environment journey taking you from the majestic halls of learning to the dense, mystical canopies of the rainforest.' },
    Natlan:    { n: '4 Days / 3 Nights', days: 4, p: 16500, d: 'An energetic adventure featuring dramatic volcanic landscapes, therapeutic thermal springs, and vibrant tribal festivals.' },
    Fontaine:  { n: '5 Days / 4 Nights', days: 5, p: 20000, d: 'Step into a picturesque hub of art, fashion, and advanced clockwork engineering surrounded by pristine waters.' },
    Snezhnaya: { n: '5 Days / 4 Nights', days: 5, p: 22000, d: 'A majestic winter expedition exploring frosted architectural marvels, grand palaces, and cozy alpine chalets under the aurora.' }
  };

  // Available traveler slots per nation (matching home.js presets)
  var DEFAULT_SLOTS = {
    Mondstadt: 12,
    Liyue: 10,
    Inazuma: 8,
    Sumeru: 10,
    Natlan: 9,
    Fontaine: 6,
    Snezhnaya: 8
  };
  var DATE_SLOT_OVERRIDES = {
    '2026-12-04': { Liyue: 7, Fontaine: 4 },
    '2026-12-05': { Mondstadt: 9, Natlan: 6 },
    '2026-12-11': { Liyue: 5, Fontaine: 3 },
    '2026-12-12': { Mondstadt: 8, Natlan: 5 },
    '2026-12-18': { Liyue: 4, Fontaine: 2 },
    '2026-12-19': { Mondstadt: 6, Natlan: 4 },
    '2026-12-25': { Liyue: 3, Fontaine: 2 },
    '2026-12-26': { Mondstadt: 5, Natlan: 3 }
  };

  // Departure-return schedule windows (matching home.js)
  var MONTHS = { December: 12, January: 1, February: 2 };
  var SCHEDULE = {
    Mondstadt: { 'December 2026': ['5-8', '12-15', '19-22', '26-29'], 'January 2027': ['2-5', '9-12', '16-19', '23-26', '30-2'], 'February 2027': ['6-9', '13-16', '20-23', '27-2'] },
    Liyue:     { 'December 2026': ['4-8', '11-15', '18-22', '25-29'], 'January 2027': ['1-5', '8-12', '15-19', '22-26', '29-2'], 'February 2027': ['5-9', '12-16', '19-23', '26-2'] },
    Inazuma:   { 'December 2026': ['3-7', '5-9', '10-14', '17-21', '24-28'], 'January 2027': ['7-11', '14-18', '21-25', '28-1'], 'February 2027': ['4-8', '11-15', '18-22', '25-1'] },
    Sumeru:    { 'December 2026': ['4-7', '6-9', '13-16', '20-23', '27-30'], 'January 2027': ['3-6', '10-13', '17-20', '24-27', '31-3'], 'February 2027': ['7-10', '14-17', '21-24', '28-3'] },
    Natlan:    { 'December 2026': ['5-9', '12-16', '19-23', '26-30'], 'January 2027': ['2-6', '9-13', '16-20', '23-27', '30-3'], 'February 2027': ['6-10', '13-17', '20-24', '27-3'] },
    Fontaine:  { 'December 2026': ['4-9', '11-16', '18-23', '25-30'], 'January 2027': ['1-6', '8-13', '15-20', '22-27', '29-3'], 'February 2027': ['5-10', '12-17', '19-24', '26-3'] },
    Snezhnaya: { 'December 2026': ['3-8', '10-15', '17-22', '24-29'], 'January 2027': ['7-12', '14-19', '21-26', '28-2'], 'February 2027': ['4-9', '11-16', '18-23', '25-2'] }
  };

  var $ = function (id) { return document.getElementById(id); };
  var form = $('res-form'), qs = new URLSearchParams(location.search);
  var key = 'Mondstadt';
  Object.keys(NATIONS).forEach(function (k) { if (k.toLowerCase() === (qs.get('nation') || '').toLowerCase()) key = k; });
  var nation = NATIONS[key];
  var f = form.elements;

  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parseIso(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function fmtDisplay(s) {
    var d = parseIso(s);
    if (!d) return '';
    return ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2) + '/' + d.getFullYear();
  }
  function addDays(s, n) {
    var d = parseIso(s);
    return d ? iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)) : '';
  }
  function long(s) {
    var d = parseIso(s);
    return d ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  }
  function peso(n) { return '\u20B1' + n.toLocaleString('en-US'); }

  var today = iso(new Date());

  // Build available departure windows for the active nation
  var AVAILABLE_DATES = [];
  Object.keys(SCHEDULE[key]).forEach(function (label) {
    var bits = label.split(' '), month = MONTHS[bits[0]], year = +bits[1];
    SCHEDULE[key][label].forEach(function (range) {
      var start = +range.split('-')[0];
      var startIso = iso(new Date(year, month - 1, start));
      if (startIso >= today) AVAILABLE_DATES.push(startIso);
    });
  });

  function getMaxSlots(dateIso) {
    if (dateIso && DATE_SLOT_OVERRIDES[dateIso] && typeof DATE_SLOT_OVERRIDES[dateIso][key] === 'number') {
      return DATE_SLOT_OVERRIDES[dateIso][key];
    }
    return DEFAULT_SLOTS[key] || 1;
  }

  function isDateAvailable(dateIso) {
    return !!dateIso && dateIso >= today && AVAILABLE_DATES.indexOf(dateIso) > -1 && getMaxSlots(dateIso) > 0;
  }

  // Initialize selected date from URL query if valid for this destination
  var qDepart = qs.get('depart') || '';
  var selectedDepartIso = isDateAvailable(qDepart) ? qDepart : '';
  var selectedReturnIso = selectedDepartIso ? addDays(selectedDepartIso, nation.days) : '';

  var maxSlots = getMaxSlots(selectedDepartIso);
  var trav = Math.min(maxSlots, Math.max(1, parseInt(qs.get('travelers'), 10) || 2));

  $('t-name').textContent = key;
  $('t-dur').textContent = nation.n;
  $('t-desc').textContent = nation.d;
  $('t-img').src = '../assets/' + key.toLowerCase() + '/itinerary.jpg';
  $('t-img').alt = key;

  function datesText() {
    return long(selectedDepartIso) && long(selectedReturnIso)
      ? long(selectedDepartIso) + ' - ' + long(selectedReturnIso)
      : '';
  }

  function syncDatesAndSlots() {
    maxSlots = getMaxSlots(selectedDepartIso);
    if (trav > maxSlots) trav = maxSlots;
    if (trav < 1) trav = 1;

    f.depart.value = fmtDisplay(selectedDepartIso);
    selectedReturnIso = selectedDepartIso ? addDays(selectedDepartIso, nation.days) : '';
    f.ret.value = fmtDisplay(selectedReturnIso);
  }

  function render() {
    syncDatesAndSlots();
    $('t-trav').textContent = trav;
    $('t-dates').textContent = datesText();
    $('f-rate').textContent = peso(nation.p) + ' x ' + trav + (trav === 1 ? ' traveler' : ' travelers');
    $('f-total').textContent = peso(nation.p * trav);
    $('t-minus').disabled = trav <= 1;
    $('t-plus').disabled = trav >= maxSlots;
    $('t-slots').textContent = trav >= maxSlots
      ? 'Max ' + maxSlots + (maxSlots === 1 ? ' slot' : ' slots') + ' reached'
      : maxSlots + (maxSlots === 1 ? ' slot' : ' slots') + ' available';
  }

  $('t-minus').addEventListener('click', function () {
    trav = Math.max(1, trav - 1);
    render();
  });
  $('t-plus').addEventListener('click', function () {
    trav = Math.min(maxSlots, trav + 1);
    render();
  });

  // Custom Departure Calendar Picker
  var dpickWrap = f.depart.parentElement;
  var dpickPop = $('f-dpick');
  var dpickBtn = dpickWrap.querySelector('.dpick__btn');
  var viewYear = 2026, viewMonth = 11;
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function setCalOpen(o) {
    if (o) {
      if (selectedDepartIso) {
        var sd = parseIso(selectedDepartIso);
        viewYear = sd.getFullYear();
        viewMonth = sd.getMonth();
      } else if (AVAILABLE_DATES.length) {
        var fd = parseIso(AVAILABLE_DATES[0]);
        viewYear = fd.getFullYear();
        viewMonth = fd.getMonth();
      }
      renderCalendar();
    }
    dpickPop.hidden = !o;
    f.depart.setAttribute('aria-expanded', String(o));
  }

  function renderCalendar() {
    var firstDay = new Date(viewYear, viewMonth, 1).getDay();
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    var minYear = 2026, minMonth = 10; // Nov 2026
    var maxYear = 2027, maxMonth = 2;  // Mar 2027

    var prevDisabled = (viewYear < minYear || (viewYear === minYear && viewMonth <= minMonth));
    var nextDisabled = (viewYear > maxYear || (viewYear === maxYear && viewMonth >= maxMonth));

    var html = '' +
      '<div class="dpick__head">' +
        '<button type="button" class="dpick__nav" data-cal-nav="-1"' + (prevDisabled ? ' disabled' : '') + ' aria-label="Previous month">&lsaquo;</button>' +
        '<span>' + MONTH_NAMES[viewMonth] + ' ' + viewYear + '</span>' +
        '<button type="button" class="dpick__nav" data-cal-nav="1"' + (nextDisabled ? ' disabled' : '') + ' aria-label="Next month">&rsaquo;</button>' +
      '</div>' +
      '<div class="dpick__wk"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>' +
      '<div class="dpick__grid">';

    for (var e = 0; e < firstDay; e++) {
      html += '<span class="dpick__empty"></span>';
    }
    for (var day = 1; day <= daysInMonth; day++) {
      var dIso = iso(new Date(viewYear, viewMonth, day));
      var avail = isDateAvailable(dIso);
      var isSel = dIso === selectedDepartIso;
      html += '<button type="button" class="dpick__day' + (isSel ? ' is-selected' : '') + (!avail ? ' is-unavailable' : '') + '"' +
              ' data-date="' + dIso + '"' + (!avail ? ' disabled' : '') + '>' + day + '</button>';
    }
    html += '</div>' +
      '<div class="dpick__foot">' +
        '<span>' + key + ' dates</span>' +
        (selectedDepartIso ? '<button type="button" class="dpick__clear" data-cal-clear>Clear date</button>' : '') +
      '</div>';

    dpickPop.innerHTML = html;
  }

  dpickPop.addEventListener('click', function (e) {
    var nav = e.target.closest('[data-cal-nav]');
    if (nav) {
      e.stopPropagation();
      var delta = +nav.dataset.calNav;
      viewMonth += delta;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderCalendar();
      return;
    }
    var clrDate = e.target.closest('[data-cal-clear]');
    if (clrDate) {
      e.stopPropagation();
      selectedDepartIso = '';
      render();
      if (f.depart.closest('.fld').classList.contains('is-invalid')) check('depart');
      if (f.ret.closest('.fld').classList.contains('is-invalid')) check('ret');
      renderCalendar();
      return;
    }
    var dayBtn = e.target.closest('[data-date]');
    if (dayBtn && !dayBtn.disabled) {
      e.stopPropagation();
      selectedDepartIso = dayBtn.dataset.date;
      setCalOpen(false);
      render();
      check('depart');
      check('ret');
    }
  });

  f.depart.addEventListener('click', function (e) {
    e.stopPropagation();
    setCalOpen(dpickPop.hidden);
  });
  dpickBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    setCalOpen(dpickPop.hidden);
  });
  document.addEventListener('click', function (e) {
    if (!dpickWrap.contains(e.target)) setCalOpen(false);
  });

  function method() { return form.querySelector('input[name="pay"]:checked').value; }
  function showPayFields() {
    $('card-fields').hidden = method() !== 'Credit Card';
    $('paypal-fields').hidden = method() !== 'PayPal';
    $('agency-fields').hidden = method() !== 'Pay at Agency';
  }
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
    depart: function () {
      return !selectedDepartIso
        ? 'Pick an available departure date.'
        : !isDateAvailable(selectedDepartIso)
          ? 'Selected departure date is unavailable for ' + key + '.'
          : '';
    },
    ret: function () {
      return !selectedReturnIso
        ? 'Select a departure date first.'
        : selectedReturnIso !== addDays(selectedDepartIso, nation.days)
          ? 'This package requires a ' + nation.days + '-day trip.'
          : '';
    },
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
    var closeBtn = backdrop.querySelector('.conf-modal__close');
    if (closeBtn) closeBtn.focus();
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) window.location.href = 'home.html#nations';
    });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onEsc); window.location.href = 'home.html#nations'; }
    });
  }
})();