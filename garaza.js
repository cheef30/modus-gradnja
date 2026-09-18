/* ==========================================================================
   MODUS GRADNJA - izbor garaznog mesta

   Jedna shema garaze u SVG-u, u modalnom prozoru na stranici stana.
   Polozaj mesta dolazi iz data.js (MODUS.garaza) - preuzet iz projekta.
   Mesto na hover pozeleni ako je slobodno, pocrveni ako je zauzeto;
   klik bira slobodno mesto.

   Nema zavisnosti - cist DOM, isti pristup kao ostatak sajta.
   ========================================================================== */
(function () {
  'use strict';

  var M = window.MODUS;
  if (!M || !M.garaza) return;

  var G = M.garaza;
  var PAD = 26;                       // margina oko crteza
  var modal = null, izabrano = null, vratiFokus = null;

  /* ========================================================== crtanje === */
  function shemaSVG() {
    var W = G.sirina + PAD * 2, H = G.visina + PAD * 2;

    /* crtez je uspravan - visinu ogranicava ekran, a sirina prati odnos
       stranica, da sa strane ne ostanu prazni pojasevi */
    var s = '<svg class="gsvg" viewBox="0 0 ' + W + ' ' + H + '" ' +
      'style="max-width:min(100%, calc(var(--g-h) * ' + (W / H).toFixed(3) + '))" ' +
      'role="group" aria-label="Shema garaže sa ' + G.mesta.length + ' mesta">';

    /* obris garaze - stepenast, iz projekta */
    if (G.obris) {
      s += '<polygon class="g-obris" points="' +
        G.obris.map(function (t) { return (t[0] + PAD) + ',' + (t[1] + PAD); }).join(' ') +
        '"/>';
    }

    /* stepeniste, lift i stubovi - ne mogu da se biraju */
    (G.elementi || []).forEach(function (e) {
      s += '<g class="g-el">' +
        '<rect x="' + (e.x + PAD) + '" y="' + (e.y + PAD) + '" ' +
        'width="' + e.w + '" height="' + e.h + '" rx="3"/>' +
        (e.naziv
          ? '<text x="' + (e.x + PAD + e.w / 2) + '" y="' + (e.y + PAD + e.h / 2) + '" ' +
            'text-anchor="middle" dominant-baseline="central">' + e.naziv + '</text>'
          : '') +
        '</g>';
    });

    /* ulazi na levoj ivici */
    (G.ulazi || []).forEach(function (u) {
      var y = u.y + PAD;
      s += '<g class="g-ulaz-m">' +
        '<path d="M' + (PAD - 20) + ' ' + y + ' h16 m-6 -6 l6 6 l-6 6" />' +
        '<text x="' + (PAD - 24) + '" y="' + y + '" text-anchor="end" ' +
        'dominant-baseline="central">' + u.naziv + '</text>' +
        '</g>';
    });

    G.mesta.forEach(function (m) {
      var info = M.garMesto(m.n);
      var slob = info && info.slobodno;
      var x = m.x + PAD, y = m.y + PAD;

      s += '<g class="gm ' + (slob ? 'slobodno' : 'zauzeto') + '" data-mesto="' + m.n + '" ' +
        'tabindex="0" role="button"' + (slob ? '' : ' aria-disabled="true"') + ' ' +
        'aria-label="Garažno mesto ' + m.n + ', ' + (slob ? 'slobodno' : 'zauzeto') + '">' +
        '<rect x="' + x + '" y="' + y + '" width="' + m.w + '" height="' + m.h + '" rx="3"/>' +
        '<text x="' + (x + m.w / 2) + '" y="' + (y + m.h / 2) + '" ' +
        'text-anchor="middle" dominant-baseline="central">' + m.n + '</text>' +
        '</g>';
    });

    return s + '</svg>';
  }

  /* ======================================================== sadrzaj ===== */
  function telo() {
    var st = M.garStats();
    return '<div class="g-plan">' + shemaSVG() + '</div>' +
      '<div class="g-legenda">' +
        '<span><i class="sl"></i>Slobodno · ' + st.slobodnih + '</span>' +
        '<span><i class="za"></i>Zauzeto · ' + st.zauzetih + '</span>' +
        '<span class="g-hint">Klikni na mesto da ga izabereš</span>' +
      '</div>' +
      '<div class="g-izbor" id="gIzbor">' + tekstIzbora() + '</div>';
  }

  function tekstIzbora() {
    if (!izabrano) return '<span class="g-prazno">Nijedno mesto nije izabrano.</span>';
    var K = M.kontakt;
    return '<div class="g-odabrano"><b>Mesto ' + izabrano + '</b>' +
      '<span>slobodno</span></div>' +
      '<a class="btn btn-primary" href="' + K.tel1Href + '">Pozovi ' + K.tel1 + '</a>';
  }

  /* ========================================================== modal ===== */
  function otvori(trigger) {
    if (modal) return;
    vratiFokus = trigger || document.activeElement;

    modal = document.createElement('div');
    modal.className = 'g-modal';
    modal.innerHTML =
      '<div class="g-backdrop" data-zatvori="1"></div>' +
      '<div class="g-panel" role="dialog" aria-modal="true" aria-labelledby="gNaslov">' +
        '<div class="g-head">' +
          '<div>' +
            '<p class="eyebrow">Garaža</p>' +
            '<h2 id="gNaslov">Izaberi garažno mesto</h2>' +
          '</div>' +
          '<button class="g-x" data-zatvori="1" aria-label="Zatvori">✕</button>' +
        '</div>' +
        '<div class="g-body" id="gBody">' + telo() + '</div>' +
      '</div>';

    document.body.appendChild(modal);
    document.body.classList.add('g-open');

    modal.addEventListener('click', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-zatvori')) zatvori();
    });
    veziMesta();
    requestAnimationFrame(function () { modal.classList.add('in'); });

    var prvi = modal.querySelector('.g-x');
    if (prvi) prvi.focus();
  }

  function zatvori() {
    if (!modal) return;
    var m = modal;
    modal = null;
    m.classList.remove('in');
    document.body.classList.remove('g-open');
    setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 200);
    if (vratiFokus && vratiFokus.focus) vratiFokus.focus();
  }

  function veziMesta() {
    [].forEach.call(modal.querySelectorAll('.gm'), function (el) {
      var n = +el.getAttribute('data-mesto');
      var info = M.garMesto(n);
      if (!info || !info.slobodno) return;          // zauzeto se ne bira
      el.onclick = function () { izaberi(n); };
      el.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); izaberi(n); }
      };
    });
  }

  function izaberi(n) {
    izabrano = (izabrano === n) ? null : n;
    [].forEach.call(modal.querySelectorAll('.gm'), function (el) {
      el.classList.toggle('izabrano', +el.getAttribute('data-mesto') === izabrano);
    });
    var iz = modal.querySelector('#gIzbor');
    if (iz) iz.innerHTML = tekstIzbora();
  }

  document.addEventListener('keydown', function (e) {
    if (!modal) return;
    if (e.key === 'Escape') { zatvori(); return; }
    /* fokus ostaje u prozoru dok je otvoren */
    if (e.key !== 'Tab') return;
    var f = modal.querySelectorAll('button, a[href], [tabindex="0"]');
    if (!f.length) return;
    var prvi = f[0], zadnji = f[f.length - 1];
    if (e.shiftKey && document.activeElement === prvi) { e.preventDefault(); zadnji.focus(); }
    else if (!e.shiftKey && document.activeElement === zadnji) { e.preventDefault(); prvi.focus(); }
  });

  /* dugme koje otvara prozor postavlja stan.js */
  window.MODUS_GARAZA = { otvori: otvori };
})();
