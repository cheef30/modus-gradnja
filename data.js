/* ==========================================================================
   MODUS GRADNJA — demo data layer
   Objekat "MODUS Rezidencija" — P + 7
   Sve mere su u metrima, zgrada je centrirana u koordinatnom pocetku.
   ========================================================================== */
(function () {
  'use strict';

  var FLOOR_H = 3.0;                 // visina etaze
  var FOOT = { w: 20, d: 12 };       // gabarit standardne etaze
  var PH_INSET = 1.5;                // povlacenje poslednje etaze (terase)

  /* ---------- rasporedi etaza ---------- */
  var STD_UNITS = [
    { key: 'A', cx: -6,  cz:  2.75, w:  8, d: 6.5, type: '2.0', plan: '2.0', orient: 'Jugozapad'   },
    { key: 'B', cx:  4,  cz:  2.75, w: 12, d: 6.5, type: '3.0', plan: '3.0', orient: 'Jugoistok'   },
    { key: 'C', cx: -6,  cz: -3.25, w:  8, d: 5.5, type: '1.5', plan: '1.5', orient: 'Severozapad' },
    { key: 'D', cx:  4,  cz: -3.25, w: 12, d: 5.5, type: '2.5', plan: '2.5', orient: 'Severoistok' }
  ];

  var PH_UNITS = [
    { key: 'PH1', cx: -5,   cz: 0, w:  7, d: 9, type: '2.5', plan: '2.5', orient: 'Istok — dupla orijentacija', terrace: 34 },
    { key: 'PH2', cx:  3.5, cz: 0, w: 10, d: 9, type: '4.0', plan: '4.0', orient: 'Zapad — dupla orijentacija', terrace: 52 }
  ];

  var GROUND_UNITS = [
    { key: 'K', cx: -6, cz:  2.75, w:  8, d: 6.5, kind: 'kafic',     name: 'Kafić MODUS',              anchor: 'kafic'     },
    { key: 'L', cx:  4, cz:  2.75, w: 12, d: 6.5, kind: 'lokal',     name: 'Poslovni prostor — izdato', anchor: null       },
    { key: 'U', cx: -6, cz: -3.25, w:  8, d: 5.5, kind: 'ulaz',      name: 'Ulazni hol i recepcija',    anchor: null       },
    { key: 'P', cx:  4, cz: -3.25, w: 12, d: 5.5, kind: 'perionica', name: 'Samouslužna autoperionica', anchor: 'perionica' }
  ];

  /* ---------- statusi (fiksirani zbog demo konzistentnosti) ---------- */
  var STATUS = {
    1: { A: 'prodat',    B: 'prodat',    C: 'prodat',      D: 'rezervisan' },
    2: { A: 'prodat',    B: 'slobodan',  C: 'prodat',      D: 'slobodan'   },
    3: { A: 'slobodan',  B: 'rezervisan',C: 'prodat',      D: 'slobodan'   },
    4: { A: 'slobodan',  B: 'slobodan',  C: 'rezervisan',  D: 'slobodan'   },
    5: { A: 'rezervisan',B: 'slobodan',  C: 'slobodan',    D: 'slobodan'   },
    6: { A: 'slobodan',  B: 'slobodan',  C: 'slobodan',    D: 'slobodan'   },
    7: { PH1: 'slobodan', PH2: 'rezervisan' }
  };

  /* ---------- tlocrti (normalizovane pravougaone zone 0..1) ---------- */
  var PLANS = {
    '1.5': [
      { n: 'Dnevna soba + kuhinja', r: [0, 0, 0.58, 1] },
      { n: 'Spavaća soba',          r: [0.58, 0, 0.42, 0.55] },
      { n: 'Kupatilo',              r: [0.58, 0.55, 0.42, 0.25] },
      { n: 'Hodnik',                r: [0.58, 0.80, 0.42, 0.20] }
    ],
    '2.0': [
      { n: 'Dnevna soba + kuhinja', r: [0, 0, 0.55, 1] },
      { n: 'Spavaća soba',          r: [0.55, 0, 0.45, 0.58] },
      { n: 'Kupatilo',              r: [0.55, 0.58, 0.45, 0.24] },
      { n: 'Hodnik',                r: [0.55, 0.82, 0.45, 0.18] }
    ],
    '2.5': [
      { n: 'Dnevna + kuhinja', r: [0, 0, 0.44, 1] },
      { n: 'Spavaća soba',     r: [0.44, 0, 0.32, 0.56] },
      { n: 'Radna soba',       r: [0.76, 0, 0.24, 0.56] },
      { n: 'Kupatilo',         r: [0.44, 0.56, 0.28, 0.44] },
      { n: 'Hodnik',           r: [0.72, 0.56, 0.28, 0.44] }
    ],
    '3.0': [
      { n: 'Dnevna + trpezarija', r: [0, 0, 0.42, 0.68] },
      { n: 'Kuhinja',             r: [0, 0.68, 0.42, 0.32] },
      { n: 'Spavaća soba 1',      r: [0.42, 0, 0.33, 0.52] },
      { n: 'Spavaća soba 2',      r: [0.75, 0, 0.25, 0.52] },
      { n: 'Kupatilo',            r: [0.42, 0.52, 0.26, 0.48] },
      { n: 'Hodnik',              r: [0.68, 0.52, 0.32, 0.48] }
    ],
    '4.0': [
      { n: 'Dnevni boravak',      r: [0, 0, 0.40, 0.62] },
      { n: 'Kuhinja + trpezarija',r: [0, 0.62, 0.40, 0.38] },
      { n: 'Master spavaća',      r: [0.40, 0, 0.32, 0.50] },
      { n: 'Spavaća soba 2',      r: [0.72, 0, 0.28, 0.50] },
      { n: 'Spavaća soba 3',      r: [0.40, 0.50, 0.30, 0.50] },
      { n: 'Kupatilo',            r: [0.70, 0.50, 0.16, 0.50] },
      { n: 'Hodnik + ostava',     r: [0.86, 0.50, 0.14, 0.50] }
    ]
  };

  var TYPE_LABEL = {
    '1.5': 'Jednoiposoban',
    '2.0': 'Dvosoban',
    '2.5': 'Dvoiposoban',
    '3.0': 'Trosoban',
    '4.0': 'Četvorosoban'
  };

  var STATUS_LABEL = { slobodan: 'Slobodan', rezervisan: 'Rezervisan', prodat: 'Prodat' };
  var STATUS_COLOR = { slobodan: '#4ade80', rezervisan: '#f0b429', prodat: '#6f757e' };

  /* ---------- generisanje ---------- */
  function pricePerM2(level, type) {
    var base = 2050 + level * 45;
    if (level === 7) base += 340;                       // penthouse premija
    if (type === '1.5') base += 60;                     // manji stanovi skuplji po m2
    if (type === '4.0') base -= 40;
    return Math.round(base / 10) * 10;
  }

  var floors = [];

  // Prizemlje
  floors.push({
    level: 0,
    label: 'PR',
    name: 'Prizemlje — poslovni sadržaji',
    inset: 0,
    commercial: true,
    units: GROUND_UNITS.map(function (u) {
      return {
        id: 'PR-' + u.key,
        key: u.key,
        level: 0,
        floorLabel: 'PR',
        commercial: true,
        kind: u.kind,
        anchor: u.anchor,
        name: u.name,
        cx: u.cx, cz: u.cz, w: u.w, d: u.d,
        area: Math.round(u.w * u.d),
        status: 'poslovni'
      };
    })
  });

  // Tipske etaze 1–6
  for (var lv = 1; lv <= 6; lv++) {
    floors.push(makeFloor(lv, STD_UNITS, 0, 'Tipska etaža'));
  }
  // Povucena etaza 7
  floors.push(makeFloor(7, PH_UNITS, PH_INSET, 'Penthouse etaža'));

  function makeFloor(level, defs, inset, name) {
    return {
      level: level,
      label: String(level),
      name: level + '. sprat — ' + name,
      inset: inset,
      commercial: false,
      units: defs.map(function (u) {
        var area = Math.round(u.w * u.d);
        var ppm = pricePerM2(level, u.type);
        var st = (STATUS[level] && STATUS[level][u.key]) || 'slobodan';
        return {
          id: 'S' + level + '-' + u.key,
          key: u.key,
          level: level,
          floorLabel: String(level) + '. sprat',
          commercial: false,
          name: TYPE_LABEL[u.type] + ' stan ' + u.key + ' / ' + level + '. sprat',
          cx: u.cx, cz: u.cz, w: u.w, d: u.d,
          type: u.type,
          plan: u.plan,
          typeLabel: TYPE_LABEL[u.type],
          orient: u.orient,
          area: area,
          terrace: u.terrace || (level >= 1 ? (u.w > 10 ? 9 : 6) : 0),
          rooms: parseFloat(u.type),
          pricePerM2: ppm,
          price: Math.round(area * ppm / 100) * 100,
          status: st,
          parking: u.w > 10 ? 'Garažno mesto (opciono, 12.500 €)' : 'Parking mesto (opciono, 7.900 €)',
          heating: 'Podno grejanje — toplotna pumpa',
          ready: 'IV kvartal 2026.',
          view: level >= 5 ? 'Otvoren pogled na grad' : (level >= 3 ? 'Pogled na zeleni unutrašnji blok' : 'Pogled na ulicu')
        };
      })
    };
  }

  /* ---------- API ---------- */
  var allUnits = [];
  floors.forEach(function (f) { f.units.forEach(function (u) { allUnits.push(u); }); });

  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  window.MODUS = {
    FLOOR_H: FLOOR_H,
    FOOT: FOOT,
    PH_INSET: PH_INSET,
    floors: floors,
    allUnits: allUnits,
    PLANS: PLANS,
    TYPE_LABEL: TYPE_LABEL,
    STATUS_LABEL: STATUS_LABEL,
    STATUS_COLOR: STATUS_COLOR,
    getUnit: function (id) {
      for (var i = 0; i < allUnits.length; i++) if (allUnits[i].id === id) return allUnits[i];
      return null;
    },
    getFloor: function (level) {
      for (var i = 0; i < floors.length; i++) if (floors[i].level === level) return floors[i];
      return null;
    },
    stats: function () {
      var s = { ukupno: 0, slobodan: 0, rezervisan: 0, prodat: 0 };
      allUnits.forEach(function (u) {
        if (u.commercial) return;
        s.ukupno++; s[u.status]++;
      });
      return s;
    },
    price: function (n) { return fmt(n) + ' €'; },
    num: fmt
  };
})();
