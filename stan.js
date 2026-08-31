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

  /* stanovi druge zgrade (Milosa Obrenovica) imaju svoj oblik podataka */
  var isDZ = M.isDZ(u.id);
  if (isDZ) {
    u = Object.assign({}, u, {
      strukt: { key: 'dz', label: u.struktura, color: u.color },
      duplex: false,
      redukovano: null,
      objekat: M.dz.naziv
    });
  }

  document.title = 'Stan ' + (isDZ ? '' : 'br. ') + u.num + ' · ' + u.etazaNaziv + ' — MODUS GRADNJA';

  /* ------------------------------------------ prodajni list (slika) ----- */
  function sheetHTML(unit) {
    var src = isDZ
      ? 'img/druga-zgrada/' + encodeURIComponent(unit.list)
      : 'img/stanovi-web/' + unit.list;
    return '<a class="sheet-box" href="' + src + '" target="_blank" rel="noopener" ' +
      'title="Otvori prodajni list u punoj veličini">' +
      '<img src="' + src + '" alt="Stan br. ' + unit.num + ' — prodajni list sa tlocrtom" loading="lazy">' +
      '</a>';
  }

  /* ------------------------------------------------- presek zgrade ------ */
  function buildingSVG(fkey) {
    var s = '<svg viewBox="0 0 200 96">';
    var order = isDZ ? ['Drugi sprat', 'Prvi sprat', 'Prizemlje'] : ['PK', '2', '1', 'PR'];
    var lbl = { 'Drugi sprat': '2', 'Prvi sprat': '1', 'Prizemlje': 'PR' };
    order.forEach(function (k, i) {
      var y = 22 + i * 16;
      var on = k === fkey;
      var fill = on ? 'rgba(200,168,107,.28)' : 'rgba(255,255,255,.035)';
      var stroke = on ? '#c8a86b' : 'rgba(255,255,255,.12)';
      s += '<rect x="30" y="' + y + '" width="140" height="14" rx="2" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1"/>' +
        '<text x="22" y="' + (y + 10.5) + '" text-anchor="end" font-size="8.5" ' +
        'fill="' + (on ? '#c8a86b' : 'rgba(255,255,255,.32)') + '">' + (lbl[k] || k) + '</text>';
      if (on) s += '<text x="178" y="' + (y + 10.5) + '" font-size="8.5" fill="#c8a86b">vaš stan</text>';
    });
    /* krov */
    s += '<path d="M26 22 L100 6 L174 22" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1.5"/>';
    s += '<rect x="24" y="88" width="152" height="4" rx="2" fill="rgba(255,255,255,.12)"/></svg>';
    return s;
  }

  /* ------------------------------------------------------------- render */
  var strukt = u.strukt;
  var naslov = 'Stan ' + (isDZ ? '' : 'br. ') + u.num;
  var objekat = isDZ ? u.objekat : 'Kneza Sime Markovića';
  var pillAttr = isDZ
    ? ' style="background:' + strukt.color + '22;color:' + strukt.color + '"'
    : '';

  var html = '';
  html += '<div class="crumb"><a href="index.html">Početna</a> · <a href="index.html#stanovi">Stanovi</a> · ' +
    '<span>' + objekat + '</span> · <span style="color:var(--txt)">' + naslov + '</span></div>';

  html += '<div class="sp-head">' +
    '<div>' +
    '<span class="pill ' + strukt.key + '"' + pillAttr + '>' + strukt.label + (u.duplex ? ' · Duplex' : '') + '</span>' +
    '<h1 style="margin-top:14px">' + naslov + '</h1>' +
    '<div class="sub">' + objekat + ' · ' + u.etazaNaziv + ' · ' + M.a2(u.zatvoreno) + ' m² zatvorenog prostora' +
    (u.terasa ? ' · terasa ' + M.a2(u.terasa) + ' m²' : '') + '</div>' +
    '</div>' +
    '<div class="price-box">' +
    '<div class="p">Cena na upit</div>' +
    '<div class="pm">Cenovnik je u pripremi — pozovite <a href="' + TEL_1_HREF + '" style="color:var(--accent)">' + TEL_1 + '</a></div>' +
    '</div></div>';

  html += '<div class="sp-grid">';

  /* leva kolona — prodajni list stana */
  html += '<div>' +
    '<p class="eyebrow">Prikaz i tlocrt stana</p>' +
    sheetHTML(u) +
    '<div class="plan-legend">' +
      '<span>Zatvoreno ' + M.a2(u.zatvoreno) + ' m²</span>' +
      (u.terasa ? '<span>Terasa ' + M.a2(u.terasa) + ' m²</span>' : '') +
      '<span>Ukupno ' + M.a2(u.ukupno) + ' m²</span>' +
      (u.redukovano ? '<span>Redukovano (−3%) ' + M.a2(u.redukovano) + ' m²</span>' : '') +
    '</div>' +
    (u.duplex
      ? '<p style="font-size:13.5px;color:var(--muted);margin-top:18px">' +
        'Stan se prostire na dva nivoa, povezana unutrašnjim stepeništem.</p>'
      : '') +
    '<p style="font-size:12.5px;color:var(--muted-2);margin-top:18px">' +
      'Klikni na sliku za prodajni list u punoj veličini.</p>' +
    '</div>';

  /* desna kolona — specifikacija + kontakt */
  html += '<div><div class="sticky">' +
    '<p class="eyebrow">Specifikacija</p>' +
    '<div class="spec">' +
      row('Objekat', objekat) +
      row('Oznaka stana', isDZ ? ('S' + u.num) : u.id) +
      row('Struktura', strukt.label + (u.duplex ? ' — duplex' : '')) +
      row('Sprat', u.etazaNaziv) +
      row('Spavaće sobe', u.beds) +
      row('Zatvoreni prostor', M.a2(u.zatvoreno) + ' m²') +
      (u.terasa ? row('Terasa', M.a2(u.terasa) + ' m²') : '') +
      row('Ukupna neto površina', M.a2(u.ukupno) + ' m²') +
      (u.redukovano ? row('Redukovana (−3%)', M.a2(u.redukovano) + ' m²') : '') +
      row('Grejanje', 'Centralno gradsko') +
      row('Status', 'U ponudi') +
    '</div>' +
    '<div class="cta-row">' +
      '<a class="btn btn-primary" href="' + TEL_1_HREF + '">Pozovi ' + TEL_1 + '</a>' +
      '<a class="btn btn-ghost" href="#upit">Pošalji upit</a>' +
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

  /* ------------------------------------------- ostali stanovi ----------- */
  var others, relTitle, relEyebrow;
  if (isDZ) {
    others = M.dz.units.filter(function (x) { return x.id !== u.id; })
      .map(function (x) {
        return { id: x.id, num: x.num, ukupno: x.ukupno, terasa: x.terasa, beds: x.beds,
                 strukt: { key: 'dz', label: x.struktura, color: x.color }, dz: true };
      });
    relEyebrow = 'Objekat ' + objekat;
    relTitle = 'Ostali stanovi u ponudi';
  } else {
    others = M.getFloor(u.etaza).units.filter(function (x) { return x.id !== u.id; });
    relEyebrow = 'Na istoj etaži';
    relTitle = 'Ostali stanovi — ' + u.etazaNaziv.toLowerCase();
  }
  if (others.length) {
    html += '<section class="related"><p class="eyebrow">' + relEyebrow + '</p>' +
      '<h2 style="font-size:30px">' + relTitle + '</h2><div class="rel-grid">';
    others.forEach(function (x) {
      var pa = x.dz ? ' style="background:' + x.strukt.color + '22;color:' + x.strukt.color + '"' : '';
      html += '<a class="card" href="stan.html?id=' + x.id + '">' +
        '<div class="uc-top"><b style="font-size:16px">Stan ' + (x.dz ? '' : 'br. ') + x.num + '</b>' +
        '<span class="pill ' + x.strukt.key + '"' + pa + '>' + x.strukt.label + '</span></div>' +
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

  /* ------------------------------------------------ kontakt forma ------- */
  html += '<section class="related" id="upit">' +
    '<p class="eyebrow">Kontakt</p>' +
    '<h2 style="font-size:30px">Zakažite obilazak — ' + naslov.toLowerCase() + '.</h2>' +
    '<p class="lead" style="margin-top:14px">Ostavite podatke i javljamo se istog radnog dana — ' +
    'ili nas pozovite direktno na <a href="' + TEL_1_HREF + '" style="color:var(--accent)">' + TEL_1 + '</a>.</p>' +
    '<form class="form" id="unitForm" novalidate style="margin-top:30px;max-width:760px">' +
      '<div class="field"><label for="uIme">Ime i prezime</label>' +
        '<input id="uIme" type="text" placeholder="Petar Petrović" required></div>' +
      '<div class="field"><label for="uTel">Telefon</label>' +
        '<input id="uTel" type="tel" placeholder="06x xxx xxxx" required></div>' +
      '<div class="field full"><label for="uMsg">Poruka</label>' +
        '<textarea id="uMsg">Zdravo, zanima me ' + naslov.toLowerCase() + ' u objektu ' + objekat +
        ' (' + u.strukt.label.toLowerCase() + ', ' + M.a2(u.ukupno) + ' m², ' +
        u.etazaNaziv.toLowerCase() + '). Molim vas da me kontaktirate.</textarea></div>' +
      '<button class="btn btn-primary" type="submit" style="grid-column:1/-1;justify-content:center">Pošalji upit</button>' +
      '<p class="form-note" id="uNote">Upit se šalje na ' + MAIL + ' preko vašeg email programa.</p>' +
    '</form>' +
    '</section>';

  app.innerHTML = html;

  function row(k, v) {
    return '<div class="r"><span>' + k + '</span><b>' + v + '</b></div>';
  }

  /* slanje upita — FormSubmit prosledjuje na mejl prodaje */
  var uf = document.getElementById('unitForm');
  if (uf) {
    uf.addEventListener('submit', function (e) {
      e.preventDefault();
      var ime = (document.getElementById('uIme').value || '').trim();
      var tel = (document.getElementById('uTel').value || '').trim();
      var msg = (document.getElementById('uMsg').value || '').trim();
      var note = document.getElementById('uNote');
      var btn = uf.querySelector('button[type=submit]');
      if (!ime || !tel) {
        note.textContent = 'Molimo unesite ime i broj telefona.';
        note.style.color = '#e0655a';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Slanje…';
      fetch('https://formsubmit.co/ajax/' + MAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: 'Upit — ' + naslov + ', ' + objekat,
          _template: 'table',
          _captcha: 'false',
          'Objekat': objekat,
          'Stan': naslov + ' — ' + u.strukt.label + ', ' + M.a2(u.ukupno) + ' m², ' + u.etazaNaziv,
          'Ime i prezime': ime,
          'Telefon': tel,
          'Poruka': msg
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d && (d.success === 'true' || d.success === true)) {
          note.textContent = 'Hvala! Upit je poslat — javljamo se u najkraćem roku.';
          note.style.color = '#4ade80';
          uf.reset();
          btn.textContent = 'Upit poslat ✓';
        } else {
          throw new Error('fs');
        }
      }).catch(function () {
        note.textContent = 'Slanje trenutno nije moguće — pozovite ' + TEL_1 + ' ili pišite na ' + MAIL + '.';
        note.style.color = '#e0655a';
        btn.disabled = false;
        btn.textContent = 'Pošalji upit';
      });
    });
  }
})();
