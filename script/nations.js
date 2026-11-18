/* ==========================================================
   nations.js — booking modal + form validation
   Used by every nation page (template/<nation>.html).

   Flow:  "Book Now" (footer CTA)  ->  booking form modal
          -> validation passes     ->  "Thank you" modal  ->  Close
   ========================================================== */
(function () {
  'use strict';

  var modal = document.getElementById('booking');
  if (!modal) return;

  var formDialog   = modal.querySelector('[data-view="form"]');
  var thanksDialog = modal.querySelector('[data-view="thanks"]');
  var form         = document.getElementById('booking-form');
  var closeBtn     = document.getElementById('booking-close');
  var lastOpener   = null;

  /* ---------- validation rules ----------
     Each rule returns an error message, or '' when the value is fine. */
  var LIMITS = { travelersMin: 1, travelersMax: 20, plansMin: 10, plansMax: 1000 };
  var NATIONS = ['Mondstadt', 'Liyue', 'Inazuma', 'Sumeru', 'Natlan', 'Fontaine', 'Snezhnaya'];

  var rules = {
    name: function (v) {
      v = v.trim().replace(/\s+/g, ' ');
      if (!v) return 'Please enter your name.';
      if (v.length < 2) return 'Name is too short.';
      if (v.length > 60) return 'Name is too long (60 max).';
      if (!/^[\p{L}][\p{L}\p{M}\s.'’-]*$/u.test(v)) return 'Use letters only.';
      return '';
    },
    email: function (v) {
      v = v.trim();
      if (!v) return 'Please enter your email.';
      if (v.length > 254 || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v)) return 'Enter a valid email address.';
      return '';
    },
    travelers: function (v) {
      v = v.trim();
      if (!v) return 'Enter the number of travelers.';
      if (!/^\d+$/.test(v)) return 'Numbers only.';
      var n = parseInt(v, 10);
      if (n < LIMITS.travelersMin || n > LIMITS.travelersMax) {
        return 'Choose ' + LIMITS.travelersMin + ' to ' + LIMITS.travelersMax + ' travelers.';
      }
      return '';
    },
    nation: function (v) {
      if (!v) return 'Please select a nation.';
      if (NATIONS.indexOf(v) === -1) return 'Please select one of the seven nations.';
      return '';
    },
    plans: function (v) {
      v = v.trim();
      if (!v) return 'Tell us a little about your plans.';
      if (v.length < LIMITS.plansMin) return 'Add a few more details (min ' + LIMITS.plansMin + ' characters).';
      if (v.length > LIMITS.plansMax) return 'Please keep it under ' + LIMITS.plansMax + ' characters.';
      return '';
    }
  };

  var fields = {};
  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    fields[name] = {
      input: input,
      wrap: input.closest('.booking__field'),
      error: document.getElementById('bk-' + name + '-error')
    };
  });

  function setError(name, message) {
    var f = fields[name];
    f.error.textContent = message;
    f.wrap.classList.toggle('is-invalid', !!message);
    if (message) {
      f.input.setAttribute('aria-invalid', 'true');
    } else {
      f.input.removeAttribute('aria-invalid');
    }
  }

  function validateField(name) {
    var message = rules[name](fields[name].input.value);
    setError(name, message);
    return !message;
  }

  /* ---------- open / close ---------- */
  function focusables(root) {
    return Array.prototype.slice.call(
      root.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
  }

  function show(view) {
    formDialog.hidden = view !== 'form';
    thanksDialog.hidden = view !== 'thanks';
  }

  function openModal(opener) {
    lastOpener = opener || document.activeElement;
    show('form');
    modal.hidden = false;
    document.documentElement.classList.add('booking-open');
    fields.name.input.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.documentElement.classList.remove('booking-open');
    if (lastOpener && lastOpener.focus) lastOpener.focus();
  }

  function resetForm() {
    form.reset();
    Object.keys(fields).forEach(function (name) { setError(name, ''); });
    fields.nation.input.classList.remove('is-filled');
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open-booking]');
    if (opener) {
      e.preventDefault();
      openModal(opener);
      return;
    }
    if (!modal.hidden && e.target.closest('[data-close-booking]')) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    var dialog = formDialog.hidden ? thanksDialog : formDialog;
    var items = focusables(dialog);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- live validation ---------- */
  Object.keys(fields).forEach(function (name) {
    var input = fields[name].input;

    input.addEventListener('blur', function () {
      if (input.value !== '' || fields[name].wrap.classList.contains('is-invalid')) validateField(name);
    });

    // once a field has shown an error, re-check as the person fixes it
    var evt = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(evt, function () {
      if (name === 'travelers') input.value = input.value.replace(/\D/g, '');
      if (name === 'nation') input.classList.toggle('is-filled', !!input.value);
      if (fields[name].wrap.classList.contains('is-invalid')) validateField(name);
    });
  });

  /* ---------- submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var firstInvalid = null;
    Object.keys(fields).forEach(function (name) {
      if (!validateField(name) && !firstInvalid) firstInvalid = fields[name].input;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }

    var data = {
      name: fields.name.input.value.trim().replace(/\s+/g, ' '),
      email: fields.email.input.value.trim(),
      travelers: parseInt(fields.travelers.input.value, 10),
      nation: fields.nation.input.value,
      plans: fields.plans.input.value.trim()
    };
    // data is valid here — send it to your backend / email service when one exists.
    void data;

    resetForm();
    show('thanks');
    closeBtn.focus();
  });
})();
