/* ==========================================================================
   MODUS GRADNJA - galerija objekata

   Mreza slika u sekciji "Objekti u prodaji". Klik otvara uvecan prikaz.
   Velika verzija se ne upisuje u HTML - izvodi se iz imena male (-800 ->
   -1400), pa se adresa cuva na jednom mestu.

   Bez zavisnosti, kao i ostatak sajta.
   ========================================================================== */
(function () {
  'use strict';

  var galerije = [].slice.call(document.querySelectorAll('.gal'));
  if (!galerije.length) return;

  var box = null, slike = [], tekuca = 0, vratiFokus = null;

  function velika(src) { return src.replace('-800.jpg', '-1400.jpg'); }

  /* ---------------------------------------------------------- prikaz --- */
  function otvori(gal, i, trigger) {
    slike = [].slice.call(gal.querySelectorAll('.gal-i img')).map(function (im) {
      return { src: velika(im.getAttribute('src')), alt: im.getAttribute('alt') };
    });
    tekuca = i;
    vratiFokus = trigger;

    box = document.createElement('div');
    box.className = 'lb';
    box.innerHTML =
      '<div class="lb-bg" data-zatvori="1"></div>' +
      '<div class="lb-in" role="dialog" aria-modal="true" aria-label="Uvećan prikaz">' +
        '<img id="lbImg" alt="">' +
        '<div class="lb-cap"><span id="lbAlt"></span><b id="lbBroj"></b></div>' +
      '</div>' +
      '<button class="lb-x" data-zatvori="1" aria-label="Zatvori">✕</button>' +
      '<button class="lb-p lb-nav" aria-label="Prethodna slika">‹</button>' +
      '<button class="lb-n lb-nav" aria-label="Sledeća slika">›</button>';

    document.body.appendChild(box);
    document.body.classList.add('lb-open');

    box.addEventListener('click', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-zatvori')) zatvori();
    });
    box.querySelector('.lb-p').onclick = function () { pomeri(-1); };
    box.querySelector('.lb-n').onclick = function () { pomeri(1); };

    crtaj();
    requestAnimationFrame(function () { box.classList.add('in'); });
    box.querySelector('.lb-x').focus();
  }

  function crtaj() {
    var s = slike[tekuca];
    var im = box.querySelector('#lbImg');
    im.setAttribute('src', s.src);
    im.setAttribute('alt', s.alt);
    box.querySelector('#lbAlt').textContent = s.alt;
    box.querySelector('#lbBroj').textContent = (tekuca + 1) + ' / ' + slike.length;
    /* sledecu i prethodnu unapred ucitaj, da listanje bude trenutno */
    [tekuca + 1, tekuca - 1].forEach(function (k) {
      if (slike[k]) { var p = new Image(); p.src = slike[k].src; }
    });
  }

  function pomeri(d) {
    tekuca = (tekuca + d + slike.length) % slike.length;
    crtaj();
  }

  function zatvori() {
    if (!box) return;
    var b = box;
    box = null;
    b.classList.remove('in');
    document.body.classList.remove('lb-open');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 200);
    if (vratiFokus && vratiFokus.focus) vratiFokus.focus();
  }

  /* ------------------------------------------------------- povezivanje - */
  galerije.forEach(function (gal) {
    [].forEach.call(gal.querySelectorAll('.gal-i'), function (b, i) {
      b.onclick = function () { otvori(gal, i, b); };
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!box) return;
    if (e.key === 'Escape') zatvori();
    else if (e.key === 'ArrowRight') pomeri(1);
    else if (e.key === 'ArrowLeft') pomeri(-1);
    else if (e.key === 'Tab') {
      /* fokus ostaje u prozoru */
      var f = box.querySelectorAll('button');
      var prvi = f[0], zadnji = f[f.length - 1];
      if (e.shiftKey && document.activeElement === prvi) { e.preventDefault(); zadnji.focus(); }
      else if (!e.shiftKey && document.activeElement === zadnji) { e.preventDefault(); prvi.focus(); }
    }
  });

  /* prevlacenje prstom levo-desno */
  document.addEventListener('touchstart', function (e) {
    if (!box || e.touches.length !== 1) return;
    box._x = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!box || box._x === undefined) return;
    var dx = e.changedTouches[0].clientX - box._x;
    box._x = undefined;
    if (Math.abs(dx) > 50) pomeri(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
