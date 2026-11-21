/* confirmation.js - fills the confirmation card from the booking saved by form.js.
   Opened directly (no saved booking), it shows the sample from the design. */
(function () {
  'use strict';
  var b = null;
  try { b = JSON.parse(sessionStorage.getItem('wpgBooking')); } catch (e) { /* use sample */ }
  if (!b) return;
  var v = {
    first: b.name.split(' ')[0], email: b.email, ref: '#' + b.ref, amount: b.amount, nation: b.nation,
    dates: b.dates, travelers: b.travelers + (b.travelers === 1 ? ' Traveler' : ' Travelers'), method: b.method
  };
  [].forEach.call(document.querySelectorAll('[data-f]'), function (el) {
    if (v[el.getAttribute('data-f')] != null) el.textContent = v[el.getAttribute('data-f')];
  });
})();
