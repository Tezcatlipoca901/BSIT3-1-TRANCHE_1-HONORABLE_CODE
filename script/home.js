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