/* ==========================================================================
   MODUS GRADNJA — dinamicka stranica stana (stan.html?id=C01 ... C63)
   Podaci dolaze iz data.js (projektna dokumentacija) — jedna stranica
   opsluzuje sva 63 stana.
   ========================================================================== */
(function () {
  'use strict';
  var M = window.MODUS;

  var TEL_1 = '060/6002428';
  var TEL_1_HREF = 'tel:+381606002428';
  var TEL_2 = '064/6577756';
  var TEL_2_HREF = 'tel:+381646577756';
  var MAIL = 'office.modusgradnja@gmail.com';

  function q(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }

  var app = document.getElementById('app');
  var id = q('id');
  var u = id ? M.getUnit(id) : null;

  if (!u) {
    app.innerHTML =
      '<div class="notfound">' +
      '<p class="eyebrow" style="justify-content:center">Greška 404</p>' +
      '<h2>Stan nije pronađen.</h2>' +
      '<p class="lead" style="margin:18px auto 30px">Proverite link ili se vratite na pregled svih stanova.</p>' +
      '<a class="btn btn-primary" href="index.html#stanovi">Nazad na pregled stanova</a></div>';
    return;
  }

  document.title = 'Stan br. ' + u.num + ' · ' + u.etazaNaziv + ' — MODUS GRADNJA';

  /* --------------------------------------------- povrsine po prostorijama */
  function roomBars(unit) {
    var max = Math.max.apply(null, unit.rooms.map(function (r) { return r.a; }));
    var s = '<div class="roombars">';
    unit.rooms.forEach(function (r) {
      var pct = Math.max(6, (r.a / max) * 100);
      var name = r.n.charAt(0).toUpperCase() + r.n.slice(1);
      s += '<div class="rb-row">' +
        '<span class="rb-name">' + name + '</span>' +
        '<span class="rb-track"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
        '<span class="rb-val">' + M.a2(r.a) + ' m²</span>' +
        '</div>';
    });
    if (unit.terasa) {
      var tp = Math.max(6, (unit.terasa / max) * 100);
      s += '<div class="rb-row rb-ter">' +
        '<span class="rb-name">Terasa</span>' +
        '<span class="rb-track"><i style="width:' + Math.min(tp, 100).toFixed(1) + '%"></i></span>' +
        '<span class="rb-val">' + M.a2(unit.terasa) + ' m²</span>' +
        '</div>';
    }
    s += '</div>';
    return s;
  }

  /* ------------------------------------------------- presek zgrade ------ */
  function buildingSVG(fkey) {
    var s = '<svg viewBox="0 0 200 96">';
    var order = ['PK', '2', '1', 'PR'];
    order.forEach(function (k, i) {
      var y = 22 + i * 16;
      var on = k === fkey;
      var fill = on ? 'rgba(200,168,107,.28)' : 'rgba(255,255,255,.035)';
      var stroke = on ? '#c8a86b' : 'rgba(255,255,255,.12)';
      s += '<rect x="30" y="' + y + '" width="140" height="14" rx="2" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1"/>' +
        '<text x="22" y="' + (y + 10.5) + '" text-anchor="end" font-size="8.5" ' +
        'fill="' + (on ? '#c8a86b' : 'rgba(255,255,255,.32)') + '">' + k + '</text>';
      if (on) s += '<text x="178" y="' + (y + 10.5) + '" font-size="8.5" fill="#c8a86b">vaš stan</text>';
    });
    /* krov */
    s += '<path d="M26 22 L100 6 L174 22" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1.5"/>';
    s += '<rect x="24" y="88" width="152" height="4" rx="2" fill="rgba(255,255,255,.12)"/></svg>';
    return s;
  }

  /* ------------------------------------------------------------- render */
  var strukt = u.strukt;

  var html = '';
  html += '<div class="crumb"><a href="index.html">Početna</a> · <a href="index.html#stanovi">Stanovi</a> · ' +
    '<span>' + u.etazaNaziv + '</span> · <span style="color:var(--txt)">Stan br. ' + u.num + '</span></div>';

  html += '<div class="sp-head">' +
    '<div>' +
    '<span class="pill ' + strukt.key + '">' + strukt.label + (u.duplex ? ' · Duplex' : '') + '</span>' +
    '<h1 style="margin-top:14px">Stan br. ' + u.num + '</h1>' +
    '<div class="sub">' + u.etazaNaziv + ' · ' + M.a2(u.zatvoreno) + ' m² zatvorenog prostora' +
    (u.terasa ? ' · terasa ' + M.a2(u.terasa) + ' m²' : '') + '</div>' +
    '</div>' +
    '<div class="price-box">' +
    '<div class="p">Cena na upit</div>' +
    '<div class="pm">Cenovnik je u pripremi — pozovite <a href="' + TEL_1_HREF + '" style="color:var(--accent)">' + TEL_1 + '</a></div>' +
    '</div></div>';

  html += '<div class="sp-grid">';

  /* leva kolona — struktura stana */
  html += '<div>' +
    '<p class="eyebrow">Struktura stana</p>' +
    '<div class="plan-box">' + roomBars(u) + '</div>' +
    '<div class="plan-legend">' +
      '<span>Zatvoreno ' + M.a2(u.zatvoreno) + ' m²</span>' +
      (u.terasa ? '<span>Terasa ' + M.a2(u.terasa) + ' m²</span>' : '') +
      '<span>Ukupno ' + M.a2(u.ukupno) + ' m²</span>' +
      '<span>Redukovano (−3%) ' + M.a2(u.redukovano) + ' m²</span>' +
    '</div>' +
    (u.duplex
      ? '<p style="font-size:13.5px;color:var(--muted);margin-top:18px">' +
        'Stan se prostire na dva nivoa, povezana unutrašnjim stepeništem.</p>'
      : '') +
    '<p style="font-size:12.5px;color:var(--muted-2);margin-top:22px">' +
      'Površine su preuzete iz projektne dokumentacije investitora. ' +
      'Detaljan tlocrt stana dostavljamo na upit.</p>' +
    '</div>';

  /* desna kolona — specifikacija + kontakt */
  html += '<div><div class="sticky">' +
    '<p class="eyebrow">Specifikacija</p>' +
    '<div class="spec">' +
      row('Oznaka stana', u.id) +
      row('Struktura', strukt.label + (u.duplex ? ' — duplex' : '')) +
      row('Sprat', u.etazaNaziv) +
      row('Spavaće sobe', u.beds) +
      row('Zatvoreni prostor', M.a2(u.zatvoreno) + ' m²') +
      (u.terasa ? row('Terasa', M.a2(u.terasa) + ' m²') : '') +
      row('Ukupna neto površina', M.a2(u.ukupno) + ' m²') +
      row('Redukovana (−3%)', M.a2(u.redukovano) + ' m²') +
      row('Grejanje', 'Centralno gradsko') +
      row('Status', 'U ponudi') +
    '</div>' +
    '<div class="cta-row">' +
      '<a class="btn btn-primary" href="' + TEL_1_HREF + '">Pozovi ' + TEL_1 + '</a>' +
      '<a class="btn btn-ghost" href="mailto:' + MAIL + '?subject=' +
        encodeURIComponent('Upit za stan br. ' + u.num + ' (' + u.id + ')') + '">Pošalji upit mejlom</a>' +
    '</div>' +
    '<div class="mini-bldg"><div class="mt">Pozicija u objektu</div>' + buildingSVG(u.etaza) + '</div>' +
    '<div class="mini-bldg">' +
      '<div class="mt">Kontakt — prodaja</div>' +
      '<div class="contact-mini">' +
        '<a href="' + TEL_1_HREF + '">' + TEL_1 + '</a>' +
        '<a href="' + TEL_2_HREF + '">' + TEL_2 + '</a>' +
        '<a href="mailto:' + MAIL + '">' + MAIL + '</a>' +
        '<span>Radno vreme: 8–16h radnim danima</span>' +
      '</div>' +
    '</div>' +
    '</div></div>';

  html += '</div>';

  /* ------------------------------------------- ostali stanovi na etazi -- */
  var f = M.getFloor(u.etaza);
  var others = f.units.filter(function (x) { return x.id !== u.id; });
  if (others.length) {
    html += '<section class="related"><p class="eyebrow">Na istoj etaži</p>' +
      '<h2 style="font-size:30px">Ostali stanovi — ' + u.etazaNaziv.toLowerCase() + '</h2><div class="rel-grid">';
    others.forEach(function (x) {
      html += '<a class="card" href="stan.html?id=' + x.id + '">' +
        '<div class="uc-top"><b style="font-size:16px">Stan br. ' + x.num + '</b>' +
        '<span class="pill ' + x.strukt.key + '">' + x.strukt.label + '</span></div>' +
        '<div class="uc-meta" style="margin-top:8px">' +
        '<span>' + M.a2(x.ukupno) + ' m²</span>' +
        '<span>' + x.beds + (x.beds === 1 ? ' spavaća' : ' spavaće') + '</span>' +
        (x.terasa ? '<span>terasa ' + M.a2(x.terasa) + ' m²</span>' : '') +
        '</div>' +
        (x.duplex ? '<div class="uc-price" style="font-size:12.5px">Duplex — dva nivoa</div>' : '') +
        '</a>';
    });
    html += '</div></section>';
  }

  app.innerHTML = html;

  function row(k, v) {
    return '<div class="r"><span>' + k + '</span><b>' + v + '</b></div>';
  }
})();
