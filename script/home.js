/* home.js - expedition search panel (home.html #nations)
   - Destination empty: calendar greys out dates where ALL destinations are unavailable.
   - Destination selected: calendar greys out dates unavailable for that specific destination.
   - Return / Check-out: auto-calculated from departure + destination days (or cleared if multi-destination).
   - Travelers: read-only display of available slots for the chosen date & destination.
   - Clicking a card when a date is selected previews that destination's slots/return date on the first click,
     and navigates to its nation page on the second click. */
(function () {
  'use strict';
  var NATIONS = ['Mondstadt', 'Liyue', 'Inazuma', 'Sumeru', 'Natlan', 'Fontaine', 'Snezhnaya'];
  // Trip durations in days (matching "X Days" on each card)
  var NATION_DAYS = {
    Mondstadt: 3,
    Liyue: 4,
    Inazuma: 4,
    Sumeru: 3,
    Natlan: 4,
    Fontaine: 5,
    Snezhnaya: 5
  };
  // Available traveler slots per nation (default capacity or per-date overrides)
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

  // Departure-return windows from README.md (and shared dates so multiple destinations can appear on the same departure date)
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

  var form = document.getElementById('search');
  if (!form) return;
  var dest = form.elements.destination, dIn = form.elements.depart, dOut = form.elements.ret, trav = form.elements.travelers;
  var err = document.getElementById('s-error'), empty = document.getElementById('nations-empty');
  var track = document.querySelector('.nations__track');
  var cards = [].slice.call(document.querySelectorAll('.nation-card'));

  function iso(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
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

  var today = iso(new Date());
  var selectedDepartIso = '';
  var selectedReturnIso = '';
  var previewNation = ''; // Tracks the card clicked when filtering by date

  var WINDOWS = {};
  NATIONS.forEach(function (nation) {
    WINDOWS[nation] = [];
    Object.keys(SCHEDULE[nation]).forEach(function (label) {
      var bits = label.split(' '), month = MONTHS[bits[0]], year = +bits[1];
      SCHEDULE[nation][label].forEach(function (range) {
        var parts = range.split('-'), start = +parts[0], end = +parts[1];
        var startIso = iso(new Date(year, month - 1, start));
        var endIso = addDays(startIso, NATION_DAYS[nation]);
        WINDOWS[nation].push([startIso, endIso]);
      });
    });
  });

  function exactNationMatch() {
    var q = dest.value.trim().toLowerCase();
    return NATIONS.filter(function (n) { return n.toLowerCase() === q; })[0] || '';
  }

  function getSlots(nation, dateIso) {
    if (!nation || !dateIso) return 0;
    if (DATE_SLOT_OVERRIDES[dateIso] && typeof DATE_SLOT_OVERRIDES[dateIso][nation] === 'number') {
      return DATE_SLOT_OVERRIDES[dateIso][nation];
    }
    return DEFAULT_SLOTS[nation] || 0;
  }

  function nationsForDate(dateIso) {
    if (!dateIso || dateIso < today) return [];
    return NATIONS.filter(function (n) {
      return WINDOWS[n].some(function (w) { return w[0] === dateIso; }) && getSlots(n, dateIso) > 0;
    });
  }

  function isDateAvailable(dateIso) {
    if (!dateIso || dateIso < today) return false;
    var exact = exactNationMatch();
    if (exact) {
      return WINDOWS[exact].some(function (w) { return w[0] === dateIso; }) && getSlots(exact, dateIso) > 0;
    }
    return nationsForDate(dateIso).length > 0;
  }

  function fmtSlots(n) {
    return n + (n === 1 ? ' Slot Available' : ' Slots Available');
  }

  function syncOutputs() {
    var activeNation = exactNationMatch() || previewNation;
    dIn.value = fmtDisplay(selectedDepartIso);

    if (!selectedDepartIso) {
      selectedReturnIso = '';
      dOut.value = '';
      trav.value = activeNation ? fmtSlots(DEFAULT_SLOTS[activeNation]) : 'Select a date';
      return;
    }

    if (activeNation) {
      selectedReturnIso = addDays(selectedDepartIso, NATION_DAYS[activeNation]);
      dOut.value = fmtDisplay(selectedReturnIso);
      var slots = getSlots(activeNation, selectedDepartIso);
      trav.value = slots > 0 ? fmtSlots(slots) : '0 Slots Available';
    } else {
      selectedReturnIso = '';
      dOut.value = '';
      var availNations = nationsForDate(selectedDepartIso);
      trav.value = availNations.length
        ? 'Select a card (' + availNations.length + ' available)'
        : 'No slots available';
    }
  }

  // Destination combobox
  var clr = form.querySelector('.clearable__btn');
  var destList = document.getElementById('s-dest-list'), destBtn = dest.parentElement.querySelector('.combo__btn');
  function syncClear() { clr.hidden = !dest.value; }
  function setDestOpen(o) { destList.hidden = !o; dest.setAttribute('aria-expanded', String(o)); }

  NATIONS.forEach(function (n) {
    var option = document.createElement('li');
    option.setAttribute('role', 'option'); option.dataset.nation = n; option.textContent = n;
    destList.appendChild(option);
  });

  function filterDestOptions() {
    var q = dest.value.trim().toLowerCase(), any = false;
    [].forEach.call(destList.children, function (option) {
      var show = !q || option.dataset.nation.toLowerCase().indexOf(q) > -1;
      option.hidden = !show;
      if (show) any = true;
    });
    return any;
  }

  destList.addEventListener('mousedown', function (e) {
    var option = e.target.closest('li[data-nation]'); if (!option) return;
    e.preventDefault();
    dest.value = option.dataset.nation;
    previewNation = '';
    setDestOpen(false);
    err.textContent = '';
    syncClear();
    // If the currently picked date is not available for this specific destination, clear it so unavailable dates stay disabled
    if (selectedDepartIso && !isDateAvailable(selectedDepartIso)) {
      selectedDepartIso = '';
    }
    syncOutputs();
    renderCalendar();
    liveUpdate();
  });

  destBtn.addEventListener('mousedown', function (e) {
    e.preventDefault();
    if (destList.hidden) { filterDestOptions(); dest.focus(); setDestOpen(true); }
    else setDestOpen(false);
  });
  dest.addEventListener('focus', function () { filterDestOptions(); setDestOpen(true); });
  dest.addEventListener('blur', function () { setDestOpen(false); });
  dest.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setDestOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); filterDestOptions(); setDestOpen(true); }
  });

  // Custom Departure Calendar Picker
  var dpickWrap = dIn.parentElement;
  var dpickPop = document.getElementById('s-dpick');
  var dpickBtn = dpickWrap.querySelector('.dpick__btn');
  var viewYear = 2026, viewMonth = 11; // December 2026 (0-indexed month 11)
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function setCalOpen(o) {
    if (o) {
      if (selectedDepartIso) {
        var sd = parseIso(selectedDepartIso);
        viewYear = sd.getFullYear();
        viewMonth = sd.getMonth();
      } else {
        // Jump to the first month that has an available date
        var firstAvail = null;
        var pool = exactNationMatch() ? [exactNationMatch()] : NATIONS;
        pool.forEach(function (n) {
          WINDOWS[n].forEach(function (w) {
            if (w[0] >= today && (!firstAvail || w[0] < firstAvail)) firstAvail = w[0];
          });
        });
        if (firstAvail) {
          var fd = parseIso(firstAvail);
          viewYear = fd.getFullYear();
          viewMonth = fd.getMonth();
        }
      }
      renderCalendar();
    }
    dpickPop.hidden = !o;
    dIn.setAttribute('aria-expanded', String(o));
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
        '<span>' + (exactNationMatch() ? exactNationMatch() + ' dates' : 'All destinations') + '</span>' +
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
      previewNation = '';
      err.textContent = '';
      syncOutputs();
      renderCalendar();
      liveUpdate();
      return;
    }
    var dayBtn = e.target.closest('[data-date]');
    if (dayBtn && !dayBtn.disabled) {
      e.stopPropagation();
      selectedDepartIso = dayBtn.dataset.date;
      previewNation = '';
      err.textContent = '';
      setCalOpen(false);
      syncOutputs();
      liveUpdate();
    }
  });

  dIn.addEventListener('click', function (e) {
    e.stopPropagation();
    setDestOpen(false);
    setCalOpen(dpickPop.hidden);
  });
  dpickBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    setDestOpen(false);
    setCalOpen(dpickPop.hidden);
  });
  document.addEventListener('click', function (e) {
    if (!dpickWrap.contains(e.target)) setCalOpen(false);
  });

  // Card badges & two-click behavior when filtering by date
  cards.forEach(function (card, idx) {
    var nation = NATIONS[idx];
    var badge = document.createElement('span');
    badge.className = 'nation-card__badge';
    badge.hidden = true;
    card.appendChild(badge);

    var link = card.querySelector('.nation-card__link');
    link.addEventListener('click', function (e) {
      // When a departure date is selected (and destination input is not locked to a single nation),
      // first click selects/previews the card's slots & return date; second click enters the nation page.
      if (selectedDepartIso && !exactNationMatch()) {
        if (previewNation !== nation) {
          e.preventDefault();
          previewNation = nation;
          syncOutputs();
          updateCardHighlights();
          note(nation + ' selected (' + fmtSlots(getSlots(nation, selectedDepartIso)) + '). Click the card again to view details.', true);
          return;
        }
      }
      // Pass selected date context to the nation page URL
      if (selectedDepartIso) {
        var url = new URL(link.getAttribute('href'), location.href);
        url.searchParams.set('depart', selectedDepartIso);
        url.searchParams.set('return', addDays(selectedDepartIso, NATION_DAYS[nation]));
        link.href = url.pathname.split('/').pop() + url.search;
      }
    });
  });

  function updateCardHighlights() {
    cards.forEach(function (card, idx) {
      var nation = NATIONS[idx];
      var badge = card.querySelector('.nation-card__badge');
      card.classList.toggle('is-selected', previewNation === nation);
      if (selectedDepartIso && isDateAvailableForNation(nation, selectedDepartIso)) {
        badge.textContent = fmtSlots(getSlots(nation, selectedDepartIso));
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    });
  }

  function isDateAvailableForNation(nation, dateIso) {
    return WINDOWS[nation].some(function (w) { return w[0] === dateIso; }) && getSlots(nation, dateIso) > 0;
  }

  // arriving from a nation page's "Book Now": ?nation=Liyue pre-fills the destination
  var wanted = (new URLSearchParams(location.search).get('nation') || '').toLowerCase();
  NATIONS.forEach(function (n) { if (n.toLowerCase() === wanted) dest.value = n; });
  syncClear();
  syncOutputs();

  function showCards(list) {
    cards.forEach(function (c, k) { c.hidden = list.indexOf(NATIONS[k]) === -1; });
    track.hidden = false; empty.hidden = true;
    updateCardHighlights();
    fitCards();
  }

  function validate() {
    if (!selectedDepartIso) return 'Pick an available departure date.';
    if (selectedDepartIso < today) return 'Pick a departure date from today onward.';
    if (!exactNationMatch() && !previewNation) return 'Select an available destination card or choose a destination.';
    return '';
  }

  function datesMatch(nation) {
    if (!selectedDepartIso) return true;
    return isDateAvailableForNation(nation, selectedDepartIso);
  }

  function currentHits() {
    var q = dest.value.trim().toLowerCase();
    return NATIONS.filter(function (n) {
      return datesMatch(n) && (!q || n.toLowerCase().indexOf(q) > -1);
    });
  }

  function paint(hits) {
    if (!hits.length) {
      cards.forEach(function (c) { c.hidden = true; });
      track.hidden = true; empty.hidden = false;
      return;
    }
    showCards(hits);
  }

  function liveUpdate() {
    if (!dest.value.trim() && !selectedDepartIso) {
      previewNation = '';
      showCards(NATIONS);
      return;
    }
    var hits = currentHits();
    if (previewNation && hits.indexOf(previewNation) === -1) {
      previewNation = '';
      syncOutputs();
    }
    paint(hits);
  }

  function clearFilter() {
    dest.value = '';
    selectedDepartIso = '';
    selectedReturnIso = '';
    previewNation = '';
    err.textContent = '';
    syncClear();
    syncOutputs();
    filterDestOptions();
    renderCalendar();
    showCards(NATIONS);
  }

  function note(msg, withClear) {
    err.textContent = msg;
    if (!withClear) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'search__link'; b.textContent = 'Clear filter';
    b.addEventListener('click', function () { clearFilter(); dest.focus(); });
    err.appendChild(document.createTextNode(' ')); err.appendChild(b);
  }

  dest.addEventListener('input', function () {
    err.textContent = '';
    previewNation = '';
    syncClear();
    if (selectedDepartIso && !isDateAvailable(selectedDepartIso)) {
      selectedDepartIso = '';
    }
    syncOutputs();
    filterDestOptions();
    renderCalendar();
    liveUpdate();
  });

  clr.addEventListener('click', function () {
    dest.value = '';
    previewNation = '';
    err.textContent = '';
    syncClear();
    syncOutputs();
    filterDestOptions();
    renderCalendar();
    liveUpdate();
    dest.focus();
  });

  document.getElementById('view-all').addEventListener('click', function () { clearFilter(); dest.focus(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = validate();
    note(msg, !!selectedDepartIso || !!dest.value.trim());
    if (msg) return;
    var targetNation = exactNationMatch() || previewNation;
    var hits = currentHits();
    if (!hits.length) { paint(hits); return; }
    paint(hits);
    note(targetNation + ' is available (' + fmtSlots(getSlots(targetNation, selectedDepartIso)) + '). Click the card to open its page.', true);
  });

  // size the cards so the section fills the screen height (no empty strip below them)
  var section = document.getElementById('nations');
  function fitCards() {
    if (window.innerWidth < 1300) { section.style.removeProperty('--card-zoom'); return; }
    if (track.hidden) return;
    var cs = getComputedStyle(track);
    var bar = track.offsetHeight - track.clientHeight;
    var room = window.innerHeight - track.offsetTop - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - bar;
    section.style.setProperty('--card-zoom', Math.max(0.55, Math.min(1, room / 574)).toFixed(3));
  }
  fitCards();
  window.addEventListener('resize', fitCards);
  window.addEventListener('load', fitCards);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCards);

  // Horizontal scrolling for the cards
  track.addEventListener('wheel', function (e) {
    if (window.innerWidth < 1300 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    var max = track.scrollWidth - track.clientWidth;
    if ((e.deltaY > 0 && track.scrollLeft >= max - 1) || (e.deltaY < 0 && track.scrollLeft <= 0)) return;
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
  track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
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

  openBtn.addEventListener('click', function (e) { e.preventDefault(); reset(); dlg.showModal(); });
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