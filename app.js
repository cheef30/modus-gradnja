/* ==========================================================================
   MODUS GRADNJA — 3D konfigurator stanova
   Three.js r128 (bez zavisnosti od OrbitControls — sopstvena kontrola kamere)
   ========================================================================== */
(function () {
  'use strict';

  var M = window.MODUS;
  var FH = M.FLOOR_H, FOOT = M.FOOT;

  /* ---------------------------------------------------------------- boja */
  var COL = {
    slab:   0x585c63,
    unit:   0x23262b,
    glass:  0x111a26,
    glassE: 0x16283f,
    rail:   0x9fb3c8,
    fin:    0x33373d,
    roof:   0x2b2e33,
    podium: 0x14161a,
    ground: 0x090a0c,
    kafic:  0xc8a86b,
    peri:   0x5aa0e0
  };
  var ST3D = { slobodan: 0x35d17d, rezervisan: 0xe8a91f, prodat: 0x545a63, poslovni: 0xc8a86b };

  /* ---------------------------------------------------------------- stanje */
  var S = {
    floor: null,       // izabrani nivo ili null
    hoverUnit: null,   // id jedinice pod misem
    hoverFloor: null,  // nivo pod misem (overview)
    idle: 0,
    ready: false
  };

  var stage, canvas, tooltip, panelEl;
  var renderer, scene, camera, raycaster, pointer;
  var pickables = [];
  var floorObjects = {};   // level -> { group, meshes:[], units:{id:mesh} }
  var cam = {
    r: 62, tr: 62,
    th: Math.PI * 0.30, tth: Math.PI * 0.30,
    ph: Math.PI * 0.36, tph: Math.PI * 0.36,
    target: null, ttarget: null
  };

  /* ================================================================ INIT */
  function init() {
    stage = document.getElementById('stage');
    canvas = document.getElementById('scene');
    tooltip = document.getElementById('tooltip');
    panelEl = document.getElementById('panelBody');

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080a0d);
    scene.fog = new THREE.Fog(0x080a0d, 90, 240);

    camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.5, 600);
    cam.target = new THREE.Vector3(0, 11.5, 0);
    cam.ttarget = new THREE.Vector3(0, 11.5, 0);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2(-10, -10);

    buildLights();
    buildGround();
    buildBuilding();
    buildContext();

    bindPointer();
    bindResize();

    renderFloorList();
    applyStyles();
    S.ready = true;
    var ld = document.getElementById('loader');
    if (ld) { ld.classList.add('hide'); }
    animate();

    bindViewToggle();
    renderApartmentCards();
  }

  /* ======================================================= PRIKAZ / TAB */
  function bindViewToggle() {
    var btn3d = document.getElementById('viewBtn3d');
    var btnCards = document.getElementById('viewBtnCards');
    var view3d = document.getElementById('view3d');
    var viewCards = document.getElementById('viewCards');
    var hint3d = document.getElementById('hint3d');
    if (!btn3d || !btnCards) return;

    function showView(v) {
      var is3d = v === '3d';
      btn3d.classList.toggle('active', is3d);
      btnCards.classList.toggle('active', !is3d);
      btn3d.setAttribute('aria-selected', is3d);
      btnCards.setAttribute('aria-selected', !is3d);
      view3d.hidden = !is3d;
      viewCards.hidden = is3d;
      if (hint3d) hint3d.hidden = !is3d;
    }

    btn3d.onclick = function () { showView('3d'); };
    btnCards.onclick = function () { showView('cards'); };
  }

  /* ======================================================== KARTICE STANOVA */
  var ICON_HOME =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-6h4v6"/></svg>';

  function renderApartmentCards() {
    var host = document.getElementById('aptCards');
    if (!host) return;

    var ids = ['S3-A', 'S2-B', 'S6-D'];
    var html = '';
    ids.forEach(function (id) {
      var u = M.getUnit(id);
      if (!u) return;
      var sold = u.status === 'prodat';
      html += '<div class="apt-card">' +
        '<div class="ac-img">' + ICON_HOME +
        '<span class="ac-tag pill ' + u.status + '">' + M.STATUS_LABEL[u.status] + '</span>' +
        '</div>' +
        '<div class="ac-body">' +
        '<h3>Stan ' + u.key + ' · ' + u.typeLabel + '</h3>' +
        '<p class="ac-sub">' + u.floorLabel + ' · ' + u.orient + '</p>' +
        '<div class="ac-meta">' +
        '<span>' + u.area + ' m²</span>' +
        '<span>' + u.rooms.toFixed(1) + ' sobe</span>' +
        '<span>' + u.view + '</span>' +
        '</div>' +
        (sold ? '<div class="ac-price"><b>Prodato</b></div>' :
          '<div class="ac-price"><b>' + M.price(u.price) + '</b><small>' + M.num(u.pricePerM2) + ' €/m²</small></div>') +
        '<a class="ac-cta" href="stan.html?id=' + encodeURIComponent(u.id) + '">Pogledaj tlocrt i detalje</a>' +
        '</div></div>';
    });
    host.innerHTML = html;
  }

  /* ============================================================== SVETLA */
  function buildLights() {
    scene.add(new THREE.AmbientLight(0x35406b, 0.55));
    var hemi = new THREE.HemisphereLight(0x9fc0ff, 0x0e0d0b, 0.75);
    hemi.position.set(0, 60, 0);
    scene.add(hemi);

    var sun = new THREE.DirectionalLight(0xffe8c8, 2.35);
    sun.position.set(42, 56, 34);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 180;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    var rim = new THREE.DirectionalLight(0x6f9dff, 1.05);
    rim.position.set(-40, 26, -34);
    scene.add(rim);

    var fill = new THREE.DirectionalLight(0xffc98a, 0.45);
    fill.position.set(-14, 8, 40);
    scene.add(fill);
  }

  /* ============================================================== TEREN */
  function buildGround() {
    var g = new THREE.Mesh(
      new THREE.CircleGeometry(140, 64),
      new THREE.MeshStandardMaterial({ color: COL.ground, roughness: 0.95, metalness: 0.0 })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.02;
    g.receiveShadow = true;
    scene.add(g);

    var grid = new THREE.GridHelper(200, 80, 0x1c232c, 0x141a21);
    grid.material.transparent = true;
    grid.material.opacity = 0.32;
    grid.position.y = 0.01;
    scene.add(grid);

    // plato / parter oko objekta
    var plaza = new THREE.Mesh(
      new THREE.BoxGeometry(FOOT.w + 20, 0.3, FOOT.d + 18),
      new THREE.MeshStandardMaterial({ color: 0x101318, roughness: 0.9 })
    );
    plaza.position.y = 0.14;
    plaza.receiveShadow = true;
    scene.add(plaza);

    var podium = new THREE.Mesh(
      new THREE.BoxGeometry(FOOT.w + 4.5, 0.42, FOOT.d + 4.5),
      new THREE.MeshStandardMaterial({ color: COL.podium, roughness: 0.8 })
    );
    podium.position.y = 0.3;
    podium.receiveShadow = true;
    podium.castShadow = true;
    scene.add(podium);
  }

  /* =========================================================== KONTEKST */
  function buildContext() {
    // susedni objekti (siluete) — daju osecaj razmere
    var mat = new THREE.MeshStandardMaterial({ color: 0x0f1216, roughness: 1, metalness: 0 });
    var defs = [
      [-40, 0, 6, 16, 9, 14], [-38, 0, -22, 14, 13, 12], [36, 0, -16, 15, 17, 13],
      [34, 0, 16, 12, 11, 16], [4, 0, -38, 22, 8, 12], [-8, 0, 36, 18, 10, 11],
      [56, 0, 4, 13, 21, 13], [-58, 0, -6, 12, 15, 12]
    ];
    defs.forEach(function (d) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(d[3], d[4], d[5]), mat);
      m.position.set(d[0], d[4] / 2, d[2]);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
    });

    // drvored
    var trunkG = new THREE.CylinderGeometry(0.16, 0.22, 3, 6);
    var trunkM = new THREE.MeshStandardMaterial({ color: 0x2a231c, roughness: 1 });
    var crownG = new THREE.SphereGeometry(1.7, 10, 8);
    var crownM = new THREE.MeshStandardMaterial({ color: 0x1c2b1e, roughness: 1 });
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2;
      var rr = 21 + (i % 3) * 2.4;
      var tx = Math.cos(a) * rr * 1.25, tz = Math.sin(a) * rr;
      var t = new THREE.Mesh(trunkG, trunkM); t.position.set(tx, 1.6, tz); t.castShadow = true;
      var c = new THREE.Mesh(crownG, crownM); c.position.set(tx, 3.9, tz); c.castShadow = true;
      c.scale.set(1, 1.15, 1);
      scene.add(t); scene.add(c);
    }
  }

  /* ============================================================ ZGRADA */
  function mkMat(opts) {
    var m = new THREE.MeshStandardMaterial(opts);
    m.userData.baseOpacity = (opts.opacity === undefined) ? 1 : opts.opacity;
    m.userData.baseTransparent = !!opts.transparent;
    return m;
  }

  function buildBuilding() {
    M.floors.forEach(function (f) {
      var grp = new THREE.Group();
      grp.userData.level = f.level;
      grp.userData.offY = 0;
      grp.userData.targetOffY = 0;
      var rec = { group: grp, meshes: [], units: {}, level: f.level };
      floorObjects[f.level] = rec;

      var baseY = f.level * FH;
      var inset = f.inset || 0;
      var fw = FOOT.w - inset * 2;
      var fd = FOOT.d - inset * 2;

      /* --- medjuspratna ploca (uvek pun gabarit → terasa na povucenoj etazi) */
      var slabMat = mkMat({ color: COL.slab, roughness: 0.72, metalness: 0.06 });
      var slab = new THREE.Mesh(new THREE.BoxGeometry(FOOT.w + 0.9, 0.3, FOOT.d + 0.9), slabMat);
      slab.position.set(0, baseY + 0.15, 0);
      slab.castShadow = true; slab.receiveShadow = true;
      add(rec, slab);

      /* --- volumeni jedinica */
      f.units.forEach(function (u) {
        var h = FH - 0.62;
        var col = COL.unit;
        var mat = mkMat({ color: col, roughness: 0.62, metalness: 0.12, emissive: 0x000000 });
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(u.w - 0.14, h, u.d - 0.14), mat);
        mesh.position.set(u.cx, baseY + 0.3 + h / 2, u.cz);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData = { unitId: u.id, level: f.level, pick: true };
        add(rec, mesh);
        rec.units[u.id] = mesh;
        pickables.push(mesh);
      });

      /* --- trakasti prozori (staklo obavija volumen) */
      var gh = f.commercial ? 2.15 : 1.6;
      var gy = f.commercial ? baseY + 1.45 : baseY + 1.62;
      var glassMat = mkMat({
        color: COL.glass, roughness: 0.08, metalness: 0.92,
        emissive: COL.glassE, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.94
      });
      var glass = new THREE.Mesh(new THREE.BoxGeometry(fw + 0.16, gh, fd + 0.16), glassMat);
      glass.position.set(0, gy, 0);
      glass.castShadow = false; glass.receiveShadow = false;
      add(rec, glass);

      /* --- vertikalne lamele u uglovima */
      if (!f.commercial) {
        var finMat = mkMat({ color: COL.fin, roughness: 0.5, metalness: 0.35 });
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (s) {
          var fin = new THREE.Mesh(new THREE.BoxGeometry(0.34, FH, 0.34), finMat);
          fin.position.set(s[0] * (fw / 2 + 0.12), baseY + FH / 2, s[1] * (fd / 2 + 0.12));
          fin.castShadow = true;
          add(rec, fin);
        });
      }

      /* --- terase / balkoni */
      var railMat = mkMat({
        color: COL.rail, roughness: 0.06, metalness: 0.5,
        transparent: true, opacity: 0.26, side: THREE.DoubleSide
      });
      var deckMat = mkMat({ color: 0x4a4e54, roughness: 0.8 });

      if (f.level >= 1 && f.level <= 6) {
        f.units.forEach(function (u) {
          var front = u.cz > 0;
          var zEdge = front ? (fd / 2) : -(fd / 2);
          var bw = Math.min(u.w * 0.66, 7.5);
          var bd = 1.9;
          var bz = zEdge + (front ? bd / 2 : -bd / 2);
          var deck = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.18, bd), deckMat);
          deck.position.set(u.cx, baseY + 0.34, bz);
          deck.castShadow = true; deck.receiveShadow = true;
          add(rec, deck);

          var rail = new THREE.Mesh(new THREE.BoxGeometry(bw, 1.08, 0.06), railMat);
          rail.position.set(u.cx, baseY + 0.95, bz + (front ? bd / 2 : -bd / 2));
          add(rec, rail);

          var rs1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.08, bd), railMat);
          rs1.position.set(u.cx - bw / 2, baseY + 0.95, bz);
          add(rec, rs1);
          var rs2 = rs1.clone(); rs2.position.x = u.cx + bw / 2; add(rec, rs2);
        });
      }

      if (f.level === 7) {
        // ograda oko krovne terase (pun gabarit)
        var tw = FOOT.w + 0.6, td = FOOT.d + 0.6;
        [[0, td / 2, tw, 0.08], [0, -td / 2, tw, 0.08]].forEach(function (p) {
          var r1 = new THREE.Mesh(new THREE.BoxGeometry(p[2], 1.1, p[3]), railMat);
          r1.position.set(p[0], baseY + 0.85, p[1]); add(rec, r1);
        });
        [[tw / 2, 0, 0.08, td], [-tw / 2, 0, 0.08, td]].forEach(function (p) {
          var r2 = new THREE.Mesh(new THREE.BoxGeometry(p[2], 1.1, p[3]), railMat);
          r2.position.set(p[0], baseY + 0.85, p[1]); add(rec, r2);
        });

        // krov + tehnika
        var roofMat = mkMat({ color: COL.roof, roughness: 0.85 });
        var roof = new THREE.Mesh(new THREE.BoxGeometry(fw + 0.9, 0.35, fd + 0.9), roofMat);
        roof.position.set(0, baseY + FH + 0.17, 0);
        roof.castShadow = true; roof.receiveShadow = true;
        add(rec, roof);

        var techMat = mkMat({ color: 0x3a3e44, roughness: 0.7, metalness: 0.3 });
        [[-4.5, 2.2, 1.6, 1.1, 2.2], [1.5, 1.5, 1.2, 0.9, 3.4], [5.5, -2.5, 1.4, 1.3, 1.8]].forEach(function (t) {
          var b = new THREE.Mesh(new THREE.BoxGeometry(t[2], t[3], t[4]), techMat);
          b.position.set(t[0], baseY + FH + 0.35 + t[3] / 2, t[1]);
          b.castShadow = true;
          add(rec, b);
        });

        var parapetMat = mkMat({ color: COL.slab, roughness: 0.8 });
        var pw = fw + 0.9, pd = fd + 0.9;
        [[0, pd / 2, pw, 0.18], [0, -pd / 2, pw, 0.18]].forEach(function (p) {
          var q = new THREE.Mesh(new THREE.BoxGeometry(p[2], 0.6, p[3]), parapetMat);
          q.position.set(p[0], baseY + FH + 0.6, p[1]); q.castShadow = true; add(rec, q);
        });
        [[pw / 2, 0, 0.18, pd], [-pw / 2, 0, 0.18, pd]].forEach(function (p) {
          var q2 = new THREE.Mesh(new THREE.BoxGeometry(p[2], 0.6, p[3]), parapetMat);
          q2.position.set(p[0], baseY + FH + 0.6, p[1]); q2.castShadow = true; add(rec, q2);
        });
      }

      if (f.commercial) {
        // nadstresnica nad ulazom
        var canMat = mkMat({ color: COL.slab, roughness: 0.7 });
        var can = new THREE.Mesh(new THREE.BoxGeometry(FOOT.w + 4.2, 0.24, FOOT.d + 4.2), canMat);
        can.position.set(0, baseY + FH - 0.28, 0);
        can.castShadow = true; can.receiveShadow = true;
        add(rec, can);

        // stubovi
        var colMat = mkMat({ color: 0x3c4045, roughness: 0.6, metalness: 0.25 });
        [[-1, -1], [-1, 1], [1, -1], [1, 1], [0, -1], [0, 1]].forEach(function (s) {
          var c = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, FH - 0.4, 10), colMat);
          c.position.set(s[0] * (FOOT.w / 2 + 1.7), baseY + (FH - 0.4) / 2, s[1] * (FOOT.d / 2 + 1.7));
          c.castShadow = true;
          add(rec, c);
        });
      }

      scene.add(grp);
    });

    // brendirani panel na vrhu
    var signMat = new THREE.MeshStandardMaterial({
      color: 0xc8a86b, emissive: 0xc8a86b, emissiveIntensity: 0.85,
      roughness: 0.4, metalness: 0.2
    });
    var sign = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.85, 0.14), signMat);
    sign.position.set(-2.4, 7 * FH + 1.05, FOOT.d / 2 - 1.5 + 0.1);
    scene.add(sign);
  }

  function add(rec, mesh) {
    rec.group.add(mesh);
    rec.meshes.push(mesh);
  }

  /* ======================================================== STIL / STANJE */
  function applyStyles() {
    M.floors.forEach(function (f) {
      var rec = floorObjects[f.level];
      var selected = (S.floor === f.level);
      var dimmed = (S.floor !== null && !selected);
      var hovered = (S.floor === null && S.hoverFloor === f.level);

      rec.meshes.forEach(function (m) {
        var mat = m.material;
        var bo = mat.userData.baseOpacity;
        var wantT = dimmed ? true : mat.userData.baseTransparent;
        if (mat.transparent !== wantT) { mat.transparent = wantT; mat.needsUpdate = true; }
        mat.opacity = dimmed ? bo * 0.14 : bo;
        mat.depthWrite = !dimmed;
      });

      rec.group.userData.targetOffY = selected ? 1.5 : 0;

      f.units.forEach(function (u) {
        var mesh = rec.units[u.id];
        var mat = mesh.material;
        var isHoverUnit = (S.hoverUnit === u.id);
        if (selected) {
          var c = ST3D[u.commercial ? 'poslovni' : u.status];
          if (u.commercial && u.kind === 'perionica') c = COL.peri;
          mat.color.setHex(0x1b1e23);
          mat.emissive.setHex(c);
          mat.emissiveIntensity = isHoverUnit ? 1.15 : (u.status === 'prodat' ? 0.28 : 0.6);
        } else if (hovered) {
          mat.color.setHex(0x2b2f35);
          mat.emissive.setHex(0xc8a86b);
          mat.emissiveIntensity = 0.22;
        } else {
          mat.color.setHex(COL.unit);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      });
    });
    syncMiniPlan();
  }

  /* ============================================================ KONTROLE */
  function bindPointer() {
    var down = false, moved = false, lastX = 0, lastY = 0, startT = 0;
    var pointers = {};
    var pinchStart = null;

    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (Object.keys(pointers).length === 1) {
        down = true; moved = false; lastX = e.clientX; lastY = e.clientY; startT = Date.now();
        canvas.classList.add('dragging');
        // vazno za touch: bez hover-a, odredi metu odmah pri dodiru
        var r0 = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - r0.left) / r0.width) * 2 - 1;
        pointer.y = -((e.clientY - r0.top) / r0.height) * 2 + 1;
        hoverTest(e.clientX - r0.left, e.clientY - r0.top);
      }
      S.idle = 0;
    });

    canvas.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);

      if (ids.length >= 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart === null) pinchStart = { d: dist, r: cam.tr };
        cam.tr = clamp(pinchStart.r * (pinchStart.d / Math.max(dist, 1)), 20, 130);
        moved = true;
        return;
      }

      if (down) {
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        cam.tth -= dx * 0.006;
        cam.tph = clamp(cam.tph - dy * 0.005, 0.12, Math.PI * 0.49);
        lastX = e.clientX; lastY = e.clientY;
        S.idle = 0;
      } else {
        hoverTest(e.clientX - rect.left, e.clientY - rect.top);
      }
    });

    function endPointer(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinchStart = null;
      if (Object.keys(pointers).length === 0) {
        canvas.classList.remove('dragging');
        if (down && !moved && Date.now() - startT < 500) handleClick();
        down = false;
      }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('pointerleave', function () {
      S.hoverUnit = null; S.hoverFloor = null; hideTip(); applyStyles();
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      cam.tr = clamp(cam.tr + e.deltaY * 0.045, 20, 130);
      S.idle = 0;
    }, { passive: false });

    document.getElementById('btnZoomIn').onclick = function () { cam.tr = clamp(cam.tr - 8, 20, 130); };
    document.getElementById('btnZoomOut').onclick = function () { cam.tr = clamp(cam.tr + 8, 20, 130); };
    document.getElementById('btnReset').onclick = function () { selectFloor(null); resetView(); };
  }

  function resetView() {
    cam.tth = Math.PI * 0.30; cam.tph = Math.PI * 0.36; cam.tr = 62;
    cam.ttarget.set(0, 11.5, 0);
  }

  function bindResize() {
    function onResize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
    onResize();
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ============================================================ RAYCAST */
  function hoverTest(px, py) {
    raycaster.setFromCamera(pointer, camera);
    var list = pickables;
    if (S.floor !== null) {
      list = pickables.filter(function (m) { return m.userData.level === S.floor; });
    }
    var hits = raycaster.intersectObjects(list, false);
    var prevU = S.hoverUnit, prevF = S.hoverFloor;

    if (hits.length) {
      var o = hits[0].object;
      if (S.floor !== null) {
        S.hoverUnit = o.userData.unitId; S.hoverFloor = null;
        showTip(px, py, M.getUnit(o.userData.unitId));
      } else {
        S.hoverFloor = o.userData.level; S.hoverUnit = null;
        showFloorTip(px, py, o.userData.level);
      }
      canvas.style.cursor = 'pointer';
    } else {
      S.hoverUnit = null; S.hoverFloor = null; hideTip();
      canvas.style.cursor = '';
    }
    if (prevU !== S.hoverUnit || prevF !== S.hoverFloor) applyStyles();
  }

  function handleClick() {
    if (S.floor === null) {
      if (S.hoverFloor !== null) selectFloor(S.hoverFloor);
      return;
    }
    if (S.hoverUnit) openUnit(S.hoverUnit);
  }

  function openUnit(id) {
    var u = M.getUnit(id);
    if (!u) return;
    if (u.commercial) {
      if (u.anchor) {
        var el = document.getElementById(u.anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    if (u.status === 'prodat') return;
    window.location.href = 'stan.html?id=' + encodeURIComponent(u.id);
  }

  /* ---------------------------------------------------------- tooltip */
  function showTip(px, py, u) {
    if (!u) return;
    var html;
    if (u.commercial) {
      html = '<b>' + u.name + '</b><span style="color:var(--muted)">' + u.area + ' m² · poslovni prostor</span>';
    } else {
      html = '<b>' + u.typeLabel + ' · ' + u.key + '</b>' +
        '<span style="color:var(--muted)">' + u.area + ' m² · ' + u.floorLabel + ' · ' + M.STATUS_LABEL[u.status] + '</span>' +
        (u.status === 'prodat' ? '' : '<div class="tp">' + M.price(u.price) + '</div>');
    }
    tooltip.innerHTML = html;
    tooltip.style.left = px + 'px';
    tooltip.style.top = py + 'px';
    tooltip.style.opacity = '1';
  }

  function showFloorTip(px, py, lv) {
    var f = M.getFloor(lv);
    if (!f) return;
    var free = f.units.filter(function (u) { return u.status === 'slobodan'; }).length;
    tooltip.innerHTML = '<b>' + (lv === 0 ? 'Prizemlje' : lv + '. sprat') + '</b>' +
      '<span style="color:var(--muted)">' + (f.commercial ? 'Poslovni sadržaji' : free + ' slobodnih stanova') + '</span>' +
      '<div class="tp">Klikni za pregled</div>';
    tooltip.style.left = px + 'px';
    tooltip.style.top = py + 'px';
    tooltip.style.opacity = '1';
  }

  function hideTip() { tooltip.style.opacity = '0'; }

  /* ============================================================== PANEL */
  function selectFloor(lv) {
    S.floor = lv;
    S.hoverUnit = null; S.hoverFloor = null;
    hideTip();
    if (lv === null) {
      cam.ttarget.set(0, 11.5, 0);
      cam.tr = 62;
      renderFloorList();
    } else {
      cam.ttarget.set(0, lv * FH + 3.2, 0);
      cam.tr = 40;
      cam.tph = clamp(cam.tph, 0.9, 1.35);
      renderFloorDetail(lv);
    }
    applyStyles();
  }
  window.MODUS_selectFloor = selectFloor;

  function dotsFor(f) {
    return '<span class="dots">' + f.units.map(function (u) {
      var c = u.commercial ? 'var(--accent)' : M.STATUS_COLOR[u.status];
      return '<i style="background:' + c + '"></i>';
    }).join('') + '</span>';
  }

  function renderFloorList() {
    var head = document.getElementById('panelHead');
    var st = M.stats();
    head.innerHTML =
      '<div class="t">Konfigurator stanova</div>' +
      '<h3>MODUS Rezidencija</h3>' +
      '<p>' + st.ukupno + ' stanova · P+7 · ' + st.slobodan + ' trenutno slobodnih</p>';

    var html = '<div class="floor-list">';
    M.floors.forEach(function (f) {
      var free = f.units.filter(function (u) { return u.status === 'slobodan'; }).length;
      var sub = f.commercial ? 'Kafić · perionica · lokal' : free + ' slobodnih od ' + f.units.length;
      html += '<button class="floor-row" data-lv="' + f.level + '">' +
        '<span class="lv">' + f.label + '</span>' +
        '<span class="fi"><b>' + (f.level === 0 ? 'Prizemlje' : f.level + '. sprat') + '</b>' +
        '<span>' + sub + '</span></span>' + dotsFor(f) + '</button>';
    });
    html += '</div>';
    panelEl.innerHTML = html;

    [].forEach.call(panelEl.querySelectorAll('.floor-row'), function (b) {
      var lv = parseInt(b.getAttribute('data-lv'), 10);
      b.onclick = function () { selectFloor(lv); };
      b.onmouseenter = function () { S.hoverFloor = lv; applyStyles(); };
      b.onmouseleave = function () { S.hoverFloor = null; applyStyles(); };
    });
  }

  function renderFloorDetail(lv) {
    var f = M.getFloor(lv);
    var head = document.getElementById('panelHead');
    var free = f.units.filter(function (u) { return u.status === 'slobodan'; }).length;
    head.innerHTML =
      '<div class="t">' + (lv === 0 ? 'Prizemlje' : lv + '. sprat') + '</div>' +
      '<h3>' + f.name.replace(/^\d+\.\s*sprat\s*—\s*/, '') + '</h3>' +
      '<p>' + (f.commercial ? 'Poslovni sadržaji u okviru objekta' : free + ' slobodnih · klikni na stan za detalje') + '</p>';

    var html = '<button class="back-link" id="backBtn">← Svi spratovi</button>';
    html += miniPlanSVG(f);
    html += '<div class="unit-list">';
    f.units.forEach(function (u) {
      if (u.commercial) {
        html += '<button class="unit-card" data-id="' + u.id + '">' +
          '<div class="uc-top"><b>' + u.name + '</b><span class="pill" style="background:rgba(200,168,107,.14);color:var(--accent)">Poslovni</span></div>' +
          '<div class="uc-meta"><span>' + u.area + ' m²</span><span>Prizemlje</span></div></button>';
        return;
      }
      var sold = u.status === 'prodat';
      html += '<button class="unit-card' + (sold ? ' sold' : '') + '" data-id="' + u.id + '">' +
        '<div class="uc-top"><b>Stan ' + u.key + ' · ' + u.typeLabel + '</b>' +
        '<span class="pill ' + u.status + '">' + M.STATUS_LABEL[u.status] + '</span></div>' +
        '<div class="uc-meta"><span>' + u.area + ' m²</span><span>' + u.rooms.toFixed(1) + ' sobe</span><span>' + u.orient + '</span></div>' +
        (sold ? '' : '<div class="uc-price">' + M.price(u.price) +
          '<small>' + M.num(u.pricePerM2) + ' €/m²</small></div>') +
        '</button>';
    });
    html += '</div>';
    panelEl.innerHTML = html;

    document.getElementById('backBtn').onclick = function () { selectFloor(null); };

    [].forEach.call(panelEl.querySelectorAll('.unit-card'), function (b) {
      var id = b.getAttribute('data-id');
      b.onclick = function () { openUnit(id); };
      b.onmouseenter = function () { S.hoverUnit = id; applyStyles(); };
      b.onmouseleave = function () { S.hoverUnit = null; applyStyles(); };
    });
    bindMiniPlan();
  }

  /* ------------------------------------------------------- mini tlocrt */
  function miniPlanSVG(f) {
    var SC = 10;
    var W = FOOT.w * SC, H = FOOT.d * SC;
    var s = '<div class="mini-plan"><div class="mt">Osnova etaže — pogled odozgo</div>';
    s += '<svg viewBox="-6 -6 ' + (W + 12) + ' ' + (H + 12) + '" id="miniPlan">';
    s += '<rect x="-4" y="-4" width="' + (W + 8) + '" height="' + (H + 8) + '" rx="4" fill="none" stroke="rgba(255,255,255,.14)" stroke-dasharray="4 4"/>';
    f.units.forEach(function (u) {
      var x = (u.cx - u.w / 2 + FOOT.w / 2) * SC;
      var y = (u.cz - u.d / 2 + FOOT.d / 2) * SC;
      var w = u.w * SC, h = u.d * SC;
      var c = u.commercial ? '#c8a86b' : M.STATUS_COLOR[u.status];
      s += '<g class="u" data-id="' + u.id + '">' +
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" ' +
        'fill="' + c + '" fill-opacity="0.13" stroke="' + c + '" stroke-opacity="0.7" stroke-width="1.2"/>' +
        '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 - 1) + '" text-anchor="middle" ' +
        'font-size="9" font-weight="600" fill="' + c + '">' + (u.commercial ? u.key : u.key) + '</text>' +
        '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 10) + '" text-anchor="middle" ' +
        'font-size="7" fill="rgba(255,255,255,.45)">' + u.area + ' m²</text></g>';
    });
    s += '<text x="' + (W - 2) + '" y="' + (H + 4) + '" text-anchor="end" font-size="6.5" fill="rgba(255,255,255,.3)">JUG ↓</text>';
    s += '</svg></div>';
    return s;
  }

  function bindMiniPlan() {
    var svg = document.getElementById('miniPlan');
    if (!svg) return;
    [].forEach.call(svg.querySelectorAll('.u'), function (g) {
      var id = g.getAttribute('data-id');
      g.onclick = function () { openUnit(id); };
      g.onmouseenter = function () { S.hoverUnit = id; applyStyles(); };
      g.onmouseleave = function () { S.hoverUnit = null; applyStyles(); };
    });
  }

  function syncMiniPlan() {
    var svg = document.getElementById('miniPlan');
    if (!svg) return;
    [].forEach.call(svg.querySelectorAll('.u'), function (g) {
      var on = g.getAttribute('data-id') === S.hoverUnit;
      var r = g.querySelector('rect');
      if (r) r.setAttribute('fill-opacity', on ? '0.34' : '0.13');
    });
    [].forEach.call(panelEl.querySelectorAll('.unit-card'), function (b) {
      b.style.borderColor = (b.getAttribute('data-id') === S.hoverUnit) ? 'var(--accent)' : '';
    });
  }

  /* ============================================================ PETLJA */
  var clock = { last: performance.now() };
  function animate() {
    requestAnimationFrame(animate);
    var now = performance.now();
    var dt = Math.min((now - clock.last) / 1000, 0.05);
    clock.last = now;
    S.idle += dt;

    if (S.floor === null && S.idle > 5 && S.hoverFloor === null) cam.tth += dt * 0.055;

    cam.r += (cam.tr - cam.r) * 0.08;
    cam.th += (cam.tth - cam.th) * 0.10;
    cam.ph += (cam.tph - cam.ph) * 0.10;
    cam.target.lerp(cam.ttarget, 0.075);

    var sp = cam.ph, st = cam.th, r = cam.r;
    camera.position.set(
      cam.target.x + r * Math.sin(sp) * Math.sin(st),
      cam.target.y + r * Math.cos(sp),
      cam.target.z + r * Math.sin(sp) * Math.cos(st)
    );
    camera.lookAt(cam.target);

    for (var k in floorObjects) {
      var g = floorObjects[k].group;
      g.userData.offY += (g.userData.targetOffY - g.userData.offY) * 0.12;
      g.position.y = g.userData.offY;
    }

    renderer.render(scene, camera);
  }

  /* ============================================================== START */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
