/* ==========================================================================
   MODUS GRADNJA — stranica pojedinacnog stana
   ========================================================================== */
(function () {
  'use strict';
  var M = window.MODUS;

  function q(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }

  var app = document.getElementById('app');
  var id = q('id');
  var u = id ? M.getUnit(id) : null;

  if (!u || u.commercial) {
    app.innerHTML =
      '<div class="notfound">' +
      '<p class="eyebrow" style="justify-content:center">Greška 404</p>' +
      '<h2>Stan nije pronađen.</h2>' +
      '<p class="lead" style="margin:18px auto 30px">Moguće je da je link istekao ili da je stan u međuvremenu prodat.</p>' +
      '<a class="btn btn-primary" href="index.html#stanovi">Nazad na pregled stanova</a></div>';
    return;
  }

  document.title = u.typeLabel + ' ' + u.key + ' · ' + u.floorLabel + ' — MODUS GRADNJA';

  /* ------------------------------------------------------------ tlocrt */
  function planSVG(unit) {
    var rooms = M.PLANS[unit.plan] || M.PLANS['2.0'];
    var SC = 26;
    var W = unit.w * SC, H = unit.d * SC;
    var pad = 46;
    var terraceD = 1.7 * SC;
    var south = unit.cz >= 0;              // ekspozicija terase
    var top = pad + (south ? 0 : terraceD);
    var left = pad;
    var totalH = H + terraceD + pad * 2;

    var palette = ['#c8a86b', '#7fa8d8', '#8fbf9a', '#d09a86', '#a89bd0', '#c9b57f', '#84b7bd'];
    var s = '<svg viewBox="0 0 ' + (W + pad * 2) + ' ' + totalH + '" role="img" aria-label="Tlocrt stana">';

    // terasa
    var ty = south ? top + H : pad;
    s += '<rect x="' + (left + 8) + '" y="' + (ty + 6) + '" width="' + (W - 16) + '" height="' + (terraceD - 12) + '" ' +
      'rx="3" fill="rgba(200,168,107,.07)" stroke="rgba(200,168,107,.4)" stroke-dasharray="5 4"/>' +
      '<text x="' + (left + W / 2) + '" y="' + (ty + terraceD / 2 + 2) + '" text-anchor="middle" font-size="11" ' +
      'fill="rgba(200,168,107,.75)" letter-spacing="1.5">TERASA ' + unit.terrace + ' m²</text>';

    // spoljni zid
    s += '<rect x="' + left + '" y="' + top + '" width="' + W + '" height="' + H + '" ' +
      'fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.55)" stroke-width="3"/>';

    // prostorije
    rooms.forEach(function (r, i) {
      var rx = left + r.r[0] * W, ry = top + r.r[1] * H;
      var rw = r.r[2] * W, rh = r.r[3] * H;
      var area = (unit.area * r.r[2] * r.r[3]);
      var c = palette[i % palette.length];
      s += '<g>' +
        '<rect x="' + rx + '" y="' + ry + '" width="' + rw + '" height="' + rh + '" ' +
        'fill="' + c + '" fill-opacity="0.07" stroke="rgba(255,255,255,.28)" stroke-width="1.4"/>' +
        '<text x="' + (rx + rw / 2) + '" y="' + (ry + rh / 2 - 3) + '" text-anchor="middle" font-size="11.5" ' +
        'font-weight="600" fill="' + c + '">' + r.n + '</text>' +
        '<text x="' + (rx + rw / 2) + '" y="' + (ry + rh / 2 + 13) + '" text-anchor="middle" font-size="10.5" ' +
        'fill="rgba(255,255,255,.45)">' + area.toFixed(1) + ' m²</text>' +
        '</g>';
    });

    // kote
    s += '<line x1="' + left + '" y1="' + (top - 18) + '" x2="' + (left + W) + '" y2="' + (top - 18) + '" ' +
      'stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
      '<text x="' + (left + W / 2) + '" y="' + (top - 24) + '" text-anchor="middle" font-size="10.5" ' +
      'fill="rgba(255,255,255,.5)">' + unit.w.toFixed(2) + ' m</text>';
    s += '<line x1="' + (left - 18) + '" y1="' + top + '" x2="' + (left - 18) + '" y2="' + (top + H) + '" ' +
      'stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
      '<text transform="translate(' + (left - 24) + ',' + (top + H / 2) + ') rotate(-90)" text-anchor="middle" ' +
      'font-size="10.5" fill="rgba(255,255,255,.5)">' + unit.d.toFixed(2) + ' m</text>';

    // sever
    s += '<g transform="translate(' + (W + pad - 8) + ',' + (pad - 22) + ')">' +
      '<path d="M0 12 L0 -6 M0 -10 L-4 -2 L4 -2 Z" stroke="#c8a86b" fill="#c8a86b" stroke-width="1.2"/>' +
      '<text x="0" y="24" text-anchor="middle" font-size="9.5" fill="rgba(200,168,107,.8)">S</text></g>';

    s += '</svg>';
    return s;
  }

  /* ------------------------------------------------- mini presek zgrade */
  function buildingSVG(level) {
    var s = '<svg viewBox="0 0 200 132">';
    for (var lv = 7; lv >= 0; lv--) {
      var y = 8 + (7 - lv) * 14;
      var on = lv === level;
      var inset = lv === 7 ? 22 : 0;
      s += '<rect x="' + (30 + inset / 2) + '" y="' + y + '" width="' + (140 - inset) + '" height="12" rx="2" ' +
        'fill="' + (on ? 'rgba(200,168,107,.28)' : 'rgba(255,255,255,.035)') + '" ' +
        'stroke="' + (on ? '#c8a86b' : 'rgba(255,255,255,.12)') + '" stroke-width="1"/>' +
        '<text x="22" y="' + (y + 9) + '" text-anchor="end" font-size="8.5" ' +
        'fill="' + (on ? '#c8a86b' : 'rgba(255,255,255,.32)') + '">' + (lv === 0 ? 'PR' : lv) + '</text>';
      if (on) {
        s += '<text x="180" y="' + (y + 9) + '" text-anchor="end" font-size="8.5" fill="#c8a86b">vaš sprat</text>';
      }
    }
    s += '<rect x="24" y="126" width="152" height="4" rx="2" fill="rgba(255,255,255,.12)"/></svg>';
    return s;
  }

  /* ---------------------------------------------------------- render */
  var soldOut = u.status === 'prodat';
  var monthly = Math.round(u.price * 0.8 * 0.0055);   // ~80% kredit, ilustrativna rata

  var html = '';
  html += '<div class="crumb"><a href="index.html">Početna</a> · <a href="index.html#stanovi">Stanovi</a> · ' +
    '<a href="index.html#stanovi" id="floorLink">' + u.floorLabel + '</a> · <span style="color:var(--txt)">Stan ' + u.key + '</span></div>';

  html += '<div class="sp-head">' +
    '<div>' +
    '<span class="pill ' + u.status + '">' + M.STATUS_LABEL[u.status] + '</span>' +
    '<h1 style="margin-top:14px">' + u.typeLabel + ' stan ' + u.key + '</h1>' +
    '<div class="sub">' + u.floorLabel + ' · ' + u.area + ' m² · ' + u.orient + ' · MODUS Rezidencija</div>' +
    '</div>' +
    '<div class="price-box">' +
    (soldOut ? '<div class="p" style="color:var(--muted)">Prodato</div>'
             : '<div class="p">' + M.price(u.price) + '</div>' +
               '<div class="pm">' + M.num(u.pricePerM2) + ' €/m² · orijentaciona rata od ' + M.num(monthly) + ' €</div>') +
    '</div></div>';

  html += '<div class="sp-grid">';

  /* leva kolona */
  html += '<div>' +
    '<p class="eyebrow">Tlocrt stana</p>' +
    '<div class="plan-box">' + planSVG(u) + '</div>' +
    '<div class="plan-legend">' +
      '<span>Neto površina ' + u.area + ' m²</span>' +
      '<span>Terasa ' + u.terrace + ' m²</span>' +
      '<span>Svetla visina 2,65 m</span>' +
      '<span>Ukupno ' + (u.area + Math.round(u.terrace * 0.5)) + ' m² (sa 50% terase)</span>' +
    '</div>' +
    '<p class="eyebrow" style="margin-top:46px">Vizuelizacije</p>' +
    '<div class="gal">' +
      '<div class="g1">Dnevni boravak</div>' +
      '<div class="g2">Kupatilo</div>' +
      '<div class="g3">Terasa</div>' +
    '</div>' +
    '<p style="font-size:12.5px;color:var(--muted-2);margin-top:14px">' +
      'Slike su ilustrativne — zamenjuju se zvaničnim renderima investitora.</p>' +
    '</div>';

  /* desna kolona */
  html += '<div><div class="sticky">' +
    '<p class="eyebrow">Specifikacija</p>' +
    '<div class="spec">' +
      row('Oznaka stana', u.id) +
      row('Struktura', u.typeLabel + ' (' + u.type + ')') +
      row('Neto površina', u.area + ' m²') +
      row('Terasa / lođa', u.terrace + ' m²') +
      row('Sprat', u.floorLabel) +
      row('Orijentacija', u.orient) +
      row('Pogled', u.view) +
      row('Grejanje', u.heating) +
      row('Parking', u.parking) +
      row('Useljenje', u.ready) +
      row('Status', M.STATUS_LABEL[u.status]) +
    '</div>' +
    '<div class="cta-row">' +
      (soldOut
        ? '<a class="btn btn-ghost" href="index.html#stanovi">Pogledaj slične stanove</a>'
        : '<a class="btn btn-primary" href="#upit">Zakaži obilazak</a>' +
          '<button class="btn btn-ghost" id="pdfBtn">Preuzmi PDF</button>') +
    '</div>' +
    '<div class="mini-bldg"><div class="mt">Pozicija u objektu</div>' + buildingSVG(u.level) + '</div>' +
    '<div class="mini-bldg" id="upit">' +
      '<div class="mt">Upit za ovaj stan</div>' +
      '<form class="form" id="unitForm" style="grid-template-columns:1fr">' +
        '<div class="field"><label for="n1">Ime i prezime</label><input id="n1" type="text" placeholder="Petar Petrović"></div>' +
        '<div class="field"><label for="t1">Telefon</label><input id="t1" type="tel" placeholder="06x xxx xxxx"></div>' +
        '<div class="field"><label for="m1">Poruka</label><textarea id="m1" style="min-height:80px">Zanima me stan ' + u.id + ' (' + u.typeLabel + ', ' + u.area + ' m²).</textarea></div>' +
        '<button class="btn btn-primary" type="submit" style="justify-content:center">Pošalji upit</button>' +
        '<p class="form-note" id="uNote">Demo forma — podaci se ne šalju nigde.</p>' +
      '</form>' +
    '</div>' +
    '</div></div>';

  html += '</div>';

  /* slicni stanovi */
  var f = M.getFloor(u.level);
  var others = f.units.filter(function (x) { return x.id !== u.id && !x.commercial; });
  if (others.length) {
    html += '<section class="related"><p class="eyebrow">Na istom spratu</p>' +
      '<h2 style="font-size:30px">Ostali stanovi — ' + u.floorLabel + '</h2><div class="rel-grid">';
    others.forEach(function (x) {
      var sold = x.status === 'prodat';
      html += '<a class="card" ' + (sold ? '' : 'href="stan.html?id=' + x.id + '"') + ' style="' + (sold ? 'opacity:.5' : '') + '">' +
        '<div class="uc-top"><b style="font-size:16px">Stan ' + x.key + ' · ' + x.typeLabel + '</b>' +
        '<span class="pill ' + x.status + '">' + M.STATUS_LABEL[x.status] + '</span></div>' +
        '<div class="uc-meta" style="margin-top:8px"><span>' + x.area + ' m²</span><span>' + x.orient + '</span></div>' +
        (sold ? '' : '<div class="uc-price">' + M.price(x.price) + '<small>' + M.num(x.pricePerM2) + ' €/m²</small></div>') +
        '</a>';
    });
    html += '</div></section>';
  }

  app.innerHTML = html;

  function row(k, v) {
    return '<div class="r"><span>' + k + '</span><b>' + v + '</b></div>';
  }

  var uf = document.getElementById('unitForm');
  if (uf) {
    uf.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = document.getElementById('uNote');
      n.textContent = 'Hvala! Javljamo se u najkraćem roku (demo — ne šalje se nigde).';
      n.style.color = '#4ade80';
    });
  }
  var pdf = document.getElementById('pdfBtn');
  if (pdf) pdf.onclick = function () { window.print(); };
})();
