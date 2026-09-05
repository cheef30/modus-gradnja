/* ==========================================================================
   MODUS GRADNJA — zajednicki UI za index.html i stan.html
   Navigacija, mobilni meni, reveal animacije, godina u futeru i slanje
   kontakt formi sa zastitom od spama. Ucitava se posle data.js.
   ========================================================================== */
(function () {
  'use strict';

  var K = (window.MODUS && window.MODUS.kontakt) || {};

  /* ======================================================== NAVIGACIJA */
  var nav = document.getElementById('nav');
  /* stan.html ima nav.solid od pocetka — tamo nema sta da se prati */
  if (nav && !nav.classList.contains('solid')) {
    var onScroll = function () { nav.classList.toggle('solid', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var burger = document.getElementById('burger');
  var links = document.getElementById('navLinks');
  if (burger && links) {
    var setOpen = function (open) {
      links.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    burger.addEventListener('click', function () {
      setOpen(!links.classList.contains('open'));
    });
    [].forEach.call(links.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
  }

  /* =========================================================== REVEAL */
  var rv = document.querySelectorAll('.rv');
  if (rv.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      [].forEach.call(rv, function (el) { io.observe(el); });
    } else {
      /* stariji browser — bez animacije, ali sadrzaj mora da se vidi */
      [].forEach.call(rv, function (el) { el.classList.add('in'); });
    }
  }

  /* =========================================================== GODINA */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ===================================================== SPAM ZASTITA
     Dva sloja, ali samo jedan sme da odbaci upit:

     1. mamac (honeypot) — polje van ekrana, van tab reda, sa iskljucenim
        autocomplete-om. Covek ga fizicki ne moze popuniti, automat koji
        popunjava sva polja popuni ga skoro uvek. Ovo JESTE osnova za
        odbacivanje — laznog pozitivnog prakticno nema.
     2. minimalno vreme — upit poslat par stotina milisekundi od
        ucitavanja je skriptovan. Ovo NE odbacuje upit, samo saceka
        ostatak minimuma pa posalje. Razlog: pravi korisnik sa autofill-om
        ume da posalje za manje od sekunde, a izgubljen upit je mnogo
        skuplji od jednog spama u sanducetu.

     Uhvacen mamcem dobija istu potvrdu kao pravi korisnik, da ne bi
     pokusavao ponovo drugom taktikom — upit se prosto ne salje.        */
  var MIN_MS = 1500;

  function addHoneypot(form) {
    var wrap = document.createElement('div');
    wrap.className = 'hp';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML =
      '<label for="_hp_' + (form.id || 'f') + '">Ovo polje ostavite prazno</label>' +
      '<input id="_hp_' + (form.id || 'f') + '" type="text" name="_honey" ' +
      'tabindex="-1" autocomplete="off">';
    form.appendChild(wrap);
    return wrap.querySelector('input');
  }

  /* ================================================== JAVNI UI HELPERI */
  window.MODUS_UI = {
    /* Postavlja mamac i pocinje merenje vremena. */
    protect: function (form) {
      var hp = addHoneypot(form);
      var t0 = Date.now();
      return {
        /* mamac popunjen — automat, upit se odbacuje */
        isBot: function () { return !!hp.value; },
        /* koliko jos treba sacekati do minimuma (0 ako je proslo) */
        hold: function () { return Math.max(0, MIN_MS - (Date.now() - t0)); }
      };
    },

    /* Slanje upita preko FormSubmit-a (bez backenda). Ceka `delay` ms
       pre slanja — vidi minimalno vreme gore. */
    send: function (payload, delay) {
      return new Promise(function (res) { setTimeout(res, delay || 0); })
        .then(function () {
          return fetch('https://formsubmit.co/ajax/' + K.mail, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
          });
        }).then(function (r) { return r.json(); }).then(function (d) {
          if (!(d && (d.success === 'true' || d.success === true))) throw new Error('formsubmit');
          return d;
        });
    },

    ok: function (note, text) { note.textContent = text; note.style.color = '#4ade80'; },
    err: function (note, text) { note.textContent = text; note.style.color = '#e0655a'; }
  };

  /* ================================================ FORMA NA POCETNOJ */
  var lead = document.getElementById('leadForm');
  if (lead) {
    var guard = window.MODUS_UI.protect(lead);
    var POTVRDA = 'Hvala! Upit je poslat — javljamo se istog radnog dana.';

    lead.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.getElementById('formNote');
      var btn = lead.querySelector('button[type=submit]');
      var ime = (lead.ime.value || '').trim();
      var tel = (lead.tel.value || '').trim();

      if (!ime || !tel) {
        window.MODUS_UI.err(note, 'Molimo unesite ime i broj telefona.');
        return;
      }

      /* mamac popunjen — pokazi potvrdu, ali nista ne salji */
      if (guard.isBot()) {
        window.MODUS_UI.ok(note, POTVRDA);
        lead.reset();
        btn.disabled = true;
        btn.textContent = 'Upit poslat ✓';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Slanje…';

      window.MODUS_UI.send({
        _subject: 'Upit sa sajta — ' + (lead.interes.value || 'stanovi'),
        _template: 'table',
        _captcha: 'false',
        'Ime i prezime': ime,
        'Telefon': tel,
        'E-mail': (lead.mail.value || '').trim(),
        'Interesuje me': lead.interes.value,
        'Poruka': (lead.poruka.value || '').trim()
      }, guard.hold()).then(function () {
        window.MODUS_UI.ok(note, POTVRDA);
        lead.reset();
        btn.textContent = 'Upit poslat ✓';
      }).catch(function () {
        window.MODUS_UI.err(note, 'Slanje trenutno nije moguće — pozovite ' + K.tel1 +
          ' ili pišite na ' + K.mail + '.');
        btn.disabled = false;
        btn.textContent = 'Pošalji upit';
      });
    });
  }
})();
