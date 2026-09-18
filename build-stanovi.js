/* ==========================================================================
   Generator statickih stranica stanova.

   ZASTO POSTOJI
   Jedna stranica `stan.html?id=...` je pokrivala svih 70 stanova, ali je sve
   crtala iz JavaScripta - ukljucujuci <title> i og: oznake. Skeneri linkova
   (Viber, WhatsApp, Facebook, Slack) NE pokrecu JS, pa su svi stanovi
   dobijali istu bezlicnu karticu bez cene i kvadrature.

   Ovaj skript pravi po jedan HTML fajl za svaki stan, sa tacnim meta
   oznakama upisanim u sam fajl. Telo stranice i dalje crta stan.js -
   duplira se samo ono sto skeneri citaju.

   POKRETANJE
     node build-stanovi.js
   Pokrenuti posle svake izmene cena, statusa ili podataka o stanovima.
   ========================================================================== */
'use strict';

var fs = require('fs');
var path = require('path');

var BASE = 'https://modusgradnja.rs/';
var OUT_DIR = path.join(__dirname, 'stan');

/* ucitaj podatke isto kako to radi browser */
global.window = {};
require('./data.js');
var M = global.window.MODUS;

var sablon = fs.readFileSync(path.join(__dirname, 'stan.html'), 'utf8');

/* ---------------------------------------------------------------- alati */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* zameni sadrzaj meta/link oznake, bez obzira na redosled atributa */
function setMeta(html, matcher, value) {
  return html.replace(matcher, function (tag) {
    return tag.replace(/content="[^"]*"/, 'content="' + esc(value) + '"');
  });
}

function opis(u, isDZ) {
  var objekat = isDZ ? M.dz.naziv : 'Kneza Sime Markovića';
  var strukt = isDZ ? u.struktura : u.strukt.label;
  var st = M.STATUS[u.status];
  return 'Stan ' + (isDZ ? '' : 'br. ') + u.num + ', ' + strukt.toLowerCase() +
    ', ' + M.a2(u.ukupno) + ' m², ' + u.etazaNaziv.toLowerCase() +
    ' · ' + M.eur(u.cena) + ' € (' + M.eur(u.cenaM2) + ' €/m² sa PDV-om)' +
    ' · ' + st.label + ' · objekat ' + objekat + '.';
}

/* ------------------------------------------------------ staticno jezgro
   Bez ovoga stranica stana je prazna dok se JS ne izvrsi - pretrazivacu
   ostaju samo meta oznake, a citav sadrzaj (povrsine, cena, prostorije)
   zavisi od toga da li ce skripta da se izvrti.

   Ovde se ispisuje sustina kao obican HTML, unutar #app. stan.js ga posle
   prepise bogatijom verzijom, pa posetilac sa JS-om vidi isto sto i pre -
   samo malo ranije, jer sadrzaj ne ceka skripte.                        */

/* nazivi prostorija u podacima su bez dijakritike - za prikaz se ispravljaju */
var NAZIV_SOBE = {
  'spavaca soba': 'spavaća soba',
  'stepeniste': 'stepenište'
};
function sobaNaziv(n) {
  return NAZIV_SOBE[n] || n;
}

function jezgro(u, isDZ) {
  var objekat = isDZ ? M.dz.naziv : 'Kneza Sime Markovića';
  var strukt = isDZ ? u.struktura : u.strukt.label;
  var st = M.STATUS[u.status];
  var naslov = 'Stan ' + (isDZ ? '' : 'br. ') + u.num;

  var s = '<div class="sp-static" id="spStatic">';
  s += '<p class="eyebrow">' + esc(objekat) + '</p>';
  s += '<h1>' + esc(naslov) + '</h1>';
  s += '<p class="lead">' + esc(strukt) + (u.duplex ? ', duplex' : '') +
       ' · ' + esc(u.etazaNaziv) + ' · ' + esc(st.label) + '</p>';

  s += '<dl>';
  s += '<dt>Zatvoreni prostor</dt><dd>' + M.a2(u.zatvoreno) + ' m²</dd>';
  if (u.terasa) s += '<dt>Terasa</dt><dd>' + M.a2(u.terasa) + ' m²</dd>';
  s += '<dt>Ukupna neto površina</dt><dd>' + M.a2(u.ukupno) + ' m²</dd>';
  if (u.redukovano) {
    s += '<dt>Redukovana površina</dt><dd>' + M.a2(u.redukovano) + ' m²</dd>';
  }
  s += '<dt>Cena</dt><dd>' + M.eur(u.cena) + ' € · ' +
       M.eur(u.cenaM2) + ' €/m² sa PDV-om</dd>';
  s += '</dl>';

  s += '<h2>Prostorije</h2><ul>';
  u.rooms.forEach(function (r) {
    /* bez duge crte - na sajtu se namerno ne koristi */
    s += '<li>' + esc(sobaNaziv(r.n)) + ' · ' + M.a2(r.a) + ' m²</li>';
  });
  s += '</ul>';

  /* putanja je namerno bez ../ - prepisivac putanja je dodaje sam */
  s += '<p class="sp-static-cta">Za obilazak i dodatne informacije pozovite ' +
       '<a href="' + M.kontakt.tel1Href + '">' + esc(M.kontakt.tel1) + '</a>' +
       ' ili pogledajte <a href="index.html#stanovi">sve stanove u ponudi</a>.</p>';
  s += '</div>';
  return s;
}

/* --------------------------------------------------- strukturirani podaci
   Google tako zna da je ovo nekretnina sa cenom i povrsinom, a ne obican
   tekst - stranica postaje podobna za bogatije rezultate pretrage.      */
function jsonLd(u, isDZ, url) {
  var strukt = isDZ ? u.struktura : u.strukt.label;
  var slika = isDZ
    ? BASE + 'img/druga-zgrada/' + encodeURIComponent(u.list)
    : BASE + 'img/stanovi-web/' + u.list;
  var d = {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: 'Stan ' + (isDZ ? '' : 'br. ') + u.num,
    description: opis(u, isDZ),
    url: url,
    image: slika,
    numberOfRooms: u.beds,
    floorSize: { '@type': 'QuantitativeValue', value: u.ukupno, unitCode: 'MTK' },
    address: {
      '@type': 'PostalAddress',
      streetAddress: isDZ ? 'Miloša Obrenovića' : 'Kneza Sime Markovića',
      addressCountry: 'RS'
    },
    offers: {
      '@type': 'Offer',
      price: u.cena,
      priceCurrency: 'EUR',
      availability: M.STATUS[u.status].dostupan
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      url: url
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Struktura', value: strukt },
      { '@type': 'PropertyValue', name: 'Sprat', value: u.etazaNaziv },
      { '@type': 'PropertyValue', name: 'Cena po m²', value: u.cenaM2 + ' EUR' }
    ]
  };
  if (u.terasa) {
    d.additionalProperty.push({
      '@type': 'PropertyValue', name: 'Terasa', value: u.terasa + ' m²'
    });
  }
  return JSON.stringify(d, null, 2);
}

/* ------------------------------------------------------------- izgradnja */
function build() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

  var svi = M.units.map(function (u) { return { u: u, dz: false }; })
    .concat(M.dz.units.map(function (u) { return { u: u, dz: true }; }));

  var napravljeni = {};

  svi.forEach(function (rec) {
    var u = rec.u, isDZ = rec.dz;
    var naslov = 'Stan ' + (isDZ ? '' : 'br. ') + u.num + ' · ' +
      u.etazaNaziv + ' - MODUS GRADNJA';
    var d = opis(u, isDZ);
    var url = BASE + 'stan/' + u.id + '.html';

    var h = sablon;

    /* staticno jezgro umesto <noscript> poruke - ide pre prepisivanja
       putanja, da linkovi u njemu dobiju ../ kao i svi ostali */
    h = h.replace(/[ \t]*<noscript>[\s\S]*?<\/noscript>\n?/, jezgro(u, isDZ) + '\n');

    /* putanje su za jedan nivo dublje */
    h = h.replace(/(?:src|href)="(?!https?:|mailto:|tel:|#|\/)([^"]+)"/g,
      function (m, p) { return m.replace('"' + p + '"', '"../' + p + '"'); });

    h = h.replace(/<title>[^<]*<\/title>/, '<title>' + esc(naslov) + '</title>');
    h = setMeta(h, /<meta name="description"[^>]*>/, d);
    h = setMeta(h, /<meta property="og:title"[^>]*>/, naslov);
    h = setMeta(h, /<meta property="og:description"[^>]*>/, d);
    h = setMeta(h, /<meta property="og:url"[^>]*>/, url);
    h = setMeta(h, /<meta name="twitter:title"[^>]*>/, naslov);
    h = setMeta(h, /<meta name="twitter:description"[^>]*>/, d);
    h = h.replace(/<link rel="canonical"[^>]*>/,
      '<link rel="canonical" href="' + url + '">');

    /* og:type website -> jasnije da je stranica proizvoda */
    h = h.replace('<meta property="og:type" content="website">',
      '<meta property="og:type" content="product">');

    /* strukturirani podaci + id stana za stan.js (bez ?id= u URL-u) */
    h = h.replace('</head>',
      '\n<script type="application/ld+json">\n' + jsonLd(u, isDZ, url) +
      '\n</script>\n<script>window.MODUS_STAN_ID=' +
      JSON.stringify(u.id) + ';</script>\n</head>');

    fs.writeFileSync(path.join(OUT_DIR, u.id + '.html'), h, 'utf8');
    napravljeni[u.id] = true;
  });

  /* ------------------------------------------------------------ sitemap */
  var danas = new Date().toISOString().slice(0, 10);
  var url = function (loc, prio) {
    return '  <url>\n    <loc>' + loc + '</loc>\n' +
      '    <lastmod>' + danas + '</lastmod>\n' +
      '    <priority>' + prio + '</priority>\n  </url>';
  };
  var sm = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n'
      .replace('www.sitemap.org', 'www.sitemaps.org') +
    url(BASE, '1.0') + '\n' +
    Object.keys(napravljeni).map(function (id) {
      return url(BASE + 'stan/' + id + '.html', '0.8');
    }).join('\n') + '\n</urlset>\n';
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sm, 'utf8');

  console.log('Napravljeno stranica: ' + Object.keys(napravljeni).length +
    ' u stan/\nSitemap osvezen: ' + (Object.keys(napravljeni).length + 1) + ' URL-ova');
}

build();
