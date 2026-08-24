/* ==========================================================================
   MODUS GRADNJA — 3D konfigurator stanova (realni objekat Pr+1+2+Pk, 63 stana)
   Three.js r128 — sopstvena kontrola kamere, bez OrbitControls.

   Performanse:
   - render SAMO kad se nesto menja (kamera, hover, animacija) — u mirovanju
     GPU ne radi nista
   - petlja se potpuno pauzira kad 3D sekcija nije na ekranu ili je tab skriven
   - pixelRatio ogranicen, senke 1024, ~130 draw call-ova ukupno
   ========================================================================== */
(function () {
  'use strict';

  var M = window.MODUS;
  if (!M || !window.THREE) return;

  /* ------------------------------------------------------ dimenzije ----- */
  var L = 64;            // duzina lamele (m)
  var DEP = 15;          // dubina (m)
  var FH = 3.1;          // spratna visina
  var CORR = 2.0;        // sredisnji hodnik
  var PK_INSET = 1.15;   // povlacenje potkrovlja (krovne terase)
  var GAP = 0.14;        // fuga izmedju stanova

  /* ---------------------------------------------------------- boje ------ */
  var COL = {
    slab:   0x8a8578,
    unit:   0x2a2d33,
    unitLit:0x1b1e23,
    glass:  0x121b28,
    glassE: 0x18293f,
    fin:    0x3a3e44,
    rail:   0x9fb3c8,
    roof:   0x35312c,
    podium: 0x14161a,
    ground: 0x090a0c
  };

  /* --------------------------------------------------------- stanje ----- */
  var S = {
    floor: null,        // key etaze ('PR','1','2','PK') ili null
    hoverUnit: null,
    hoverFloor: null,
    filter: 'all',      // 'all' | 't1' | 't2' | 't3'
    ready: false
  };

  var stage, canvas, tooltip, panelEl;
  var renderer, scene, camera, raycaster, pointer;
  var unitMeshes = [];                 // svi mesevi stanova
  var floorHit = [];                   // nevidljivi veliki boksovi za lak pogodak sprata
  var floorObjects = {};               // key -> {group, meshes, units:{id:mesh}}
  var logoTex = null;

  var cam = {
    r: 96, tr: 96,
    th: Math.PI * 0.26, tth: Math.PI * 0.26,
    ph: Math.PI * 0.36, tph: Math.PI * 0.36,
    target: null, ttarget: null
  };

  /* --------------------------------------------- kontrola renderovanja -- */
  var dirty = true;
  var visible = true;   // sekcija u viewportu i tab aktivan
  function invalidate() { dirty = true; }

  /* ================================================================ INIT */
  function init() {
    stage = document.getElementById('stage');
    canvas = document.getElementById('scene');
    tooltip = document.getElementById('tooltip');
    panelEl = document.getElementById('panelBody');
    if (!stage || !canvas) return;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080a0d);
    scene.fog = new THREE.Fog(0x080a0d, 130, 340);

    camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.5, 700);
    cam.target = new THREE.Vector3(0, 7, 0);
    cam.ttarget = new THREE.Vector3(0, 7, 0);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2(-10, -10);

    buildLights();
    buildGround();
    buildBuilding();
    buildContext();
    loadLogoSign();

    bindPointer();
    bindResize();
    bindVisibility();

    renderFloorList();
    applyStyles();
    S.ready = true;
    var ld = document.getElementById('loader');
    if (ld) ld.classList.add('hide');

    bindViewToggle();
    renderApartmentCards();

    animate();
  }

  /* ============================================================ SVETLA */
  function buildLights() {
    scene.add(new THREE.AmbientLight(0x39415f, 0.6));
    var hemi = new THREE.HemisphereLight(0x9fc0ff, 0x0e0d0b, 0.7);
    hemi.position.set(0, 60, 0);
    scene.add(hemi);

    var sun = new THREE.DirectionalLight(0xffe8c8, 2.2);
    sun.position.set(55, 70, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 220;
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -25;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);

    var rim = new THREE.DirectionalLight(0x6f9dff, 0.9);
    rim.position.set(-50, 30, -40);
    scene.add(rim);

    var fill = new THREE.DirectionalLight(0xffc98a, 0.35);
    fill.position.set(-20, 10, 55);
    scene.add(fill);
  }

  /* ============================================================= TEREN */
  function buildGround() {
    var g = new THREE.Mesh(
      new THREE.CircleGeometry(190, 48),
      new THREE.MeshStandardMaterial({ color: COL.ground, roughness: 0.95 })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.02;
    g.receiveShadow = true;
    scene.add(g);

    var grid = new THREE.GridHelper(260, 52, 0x1c232c, 0x12171d);
    grid.material.transparent = true;
    grid.material.opacity = 0.28;
    grid.position.y = 0.01;
    scene.add(grid);

    var plaza = new THREE.Mesh(
      new THREE.BoxGeometry(L + 26, 0.28, DEP + 22),
      new THREE.MeshStandardMaterial({ color: 0x101318, roughness: 0.9 })
    );
    plaza.position.y = 0.13;
    plaza.receiveShadow = true;
    scene.add(plaza);

    var podium = new THREE.Mesh(
      new THREE.BoxGeometry(L + 4, 0.4, DEP + 4),
      new THREE.MeshStandardMaterial({ color: COL.podium, roughness: 0.8 })
    );
    podium.position.y = 0.28;
    podium.receiveShadow = true;
    podium.castShadow = true;
    scene.add(podium);

    /* parking na istocnom kraju (iz osnove) */
    var asf = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.06, DEP + 6),
      new THREE.MeshStandardMaterial({ color: 0x0c0e11, roughness: 0.95 })
    );
    asf.position.set(L / 2 + 9.5, 0.3, 0);
    asf.receiveShadow = true;
    scene.add(asf);

    var lineG = new THREE.BoxGeometry(4.6, 0.02, 0.14);
    var lineM = new THREE.MeshBasicMaterial({ color: 0x5c646e });
    for (var i = 0; i < 6; i++) {
      var ln = new THREE.Mesh(lineG, lineM);
      ln.position.set(L / 2 + 9.5, 0.35, -7.5 + i * 3);
      scene.add(ln);
    }
  }

  /* ========================================================== KONTEKST */
  function buildContext() {
    var mat = new THREE.MeshStandardMaterial({ color: 0x0f1216, roughness: 1 });
    [
      [-52, 12, 10, 14], [-48, -20, 14, 9], [50, -18, 12, 12],
      [8, -34, 20, 8], [-14, 34, 16, 10], [46, 26, 11, 15]
    ].forEach(function (d) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(d[2], d[3], 11), mat);
      m.position.set(d[0], d[3] / 2, d[1]);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
    });

    var trunkG = new THREE.CylinderGeometry(0.16, 0.22, 3, 5);
    var trunkM = new THREE.MeshStandardMaterial({ color: 0x2a231c, roughness: 1 });
    var crownG = new THREE.SphereGeometry(1.7, 8, 6);
    var crownM = new THREE.MeshStandardMaterial({ color: 0x1c2b1e, roughness: 1 });
    [[-38, 13], [-24, 14], [-8, 14.5], [10, 14], [26, 13.5], [-30, -13.5], [0, -14], [30, -13]]
      .forEach(function (p) {
        var t = new THREE.Mesh(trunkG, trunkM); t.position.set(p[0], 1.6, p[1]); t.castShadow = true;
        var c = new THREE.Mesh(crownG, crownM); c.position.set(p[0], 3.9, p[1]); c.castShadow = true;
        c.scale.set(1, 1.15, 1);
        scene.add(t); scene.add(c);
      });
  }

  /* ============================================================ ZGRADA */
  function mkMat(opts) {
    var m = new THREE.MeshStandardMaterial(opts);
    m.userData.baseOpacity = (opts.opacity === undefined) ? 1 : opts.opacity;
    m.userData.baseTransparent = !!opts.transparent;
    return m;
  }

  function add(rec, mesh) {
    rec.group.add(mesh);
    rec.meshes.push(mesh);
  }

  /* krovna prizma (dvovodni krov duz lamele) */
  function roofPrism(w, h, d) {
    var geo = new THREE.BufferGeometry();
    var hw = w / 2, hd = d / 2;
    var v = [
      // juzna kosina
      -hw, 0,  hd,   hw, 0,  hd,   hw, h, 0,
      -hw, 0,  hd,   hw, h, 0,   -hw, h, 0,
      // severna kosina
       hw, 0, -hd,  -hw, 0, -hd,  -hw, h, 0,
       hw, 0, -hd,  -hw, h, 0,    hw, h, 0,
      // zabati
       hw, 0,  hd,   hw, 0, -hd,   hw, h, 0,
      -hw, 0, -hd,  -hw, 0,  hd,  -hw, h, 0
    ];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.computeVertexNormals();
    return geo;
  }

  function buildBuilding() {
    M.floors.forEach(function (f) {
      var grp = new THREE.Group();
      grp.userData.key = f.key;
      grp.userData.offY = 0;
      grp.userData.targetOffY = 0;
      var rec = { group: grp, meshes: [], units: {}, key: f.key };
      floorObjects[f.key] = rec;

      var baseY = f.level * FH;
      var ins = (f.key === 'PK') ? PK_INSET : 0;
      var fw = L - ins * 2;
      var fd = DEP - ins * 2;
      var unitD = (fd - CORR) / 2;
      var unitH = FH - 0.55;

      /* medjuspratna ploca — uvek pun gabarit (na PK pravi krovnu terasu) */
      var slab = new THREE.Mesh(
        new THREE.BoxGeometry(L + 0.8, 0.28, DEP + 0.8),
        mkMat({ color: COL.slab, roughness: 0.75, metalness: 0.05 })
      );
      slab.position.set(0, baseY + 0.14, 0);
      slab.castShadow = true; slab.receiveShadow = true;
      add(rec, slab);

      /* stanovi — segmenti duz lamele, juzni i severni niz */
      f.units.forEach(function (u) {
        var w = u.lw * fw - GAP;
        var x = -fw / 2 + (u.lx + u.lw / 2) * fw;
        var z = (u.side === 'S' ? 1 : -1) * (CORR / 2 + unitD / 2);
        var mat = mkMat({ color: COL.unit, roughness: 0.62, metalness: 0.1, emissive: 0x000000 });
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.5), unitH, unitD - 0.1), mat);
        mesh.position.set(x, baseY + 0.28 + unitH / 2, z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData = { unitId: u.id, floorKey: f.key, pick: true };
        add(rec, mesh);
        rec.units[u.id] = mesh;
        unitMeshes.push(mesh);
      });

      /* trakasto staklo oko etaze */
      var glass = new THREE.Mesh(
        new THREE.BoxGeometry(fw + 0.18, 1.55, fd + 0.18),
        mkMat({
          color: COL.glass, roughness: 0.08, metalness: 0.9,
          emissive: COL.glassE, emissiveIntensity: 0.45,
          transparent: true, opacity: 0.62
        })
      );
      glass.position.set(0, baseY + 1.68, 0);
      add(rec, glass);
      rec.glass = glass;

      /* ugaone lamele */
      var finMat = mkMat({ color: COL.fin, roughness: 0.5, metalness: 0.3 });
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (s) {
        var fin = new THREE.Mesh(new THREE.BoxGeometry(0.32, FH, 0.32), finMat);
        fin.position.set(s[0] * (fw / 2 + 0.1), baseY + FH / 2, s[1] * (fd / 2 + 0.1));
        fin.castShadow = true;
        add(rec, fin);
      });

      var railMat = mkMat({
        color: COL.rail, roughness: 0.06, metalness: 0.5,
        transparent: true, opacity: 0.24, side: THREE.DoubleSide
      });

      /* balkonske trake na 1. i 2. spratu (obe fasade) */
      if (f.key === '1' || f.key === '2') {
        [1, -1].forEach(function (sgn) {
          var lip = new THREE.Mesh(
            new THREE.BoxGeometry(fw * 0.92, 0.14, 1.05),
            mkMat({ color: COL.slab, roughness: 0.8 })
          );
          lip.position.set(0, baseY + 0.32, sgn * (fd / 2 + 0.55));
          lip.castShadow = true;
          add(rec, lip);
          var rail = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.92, 1.02, 0.05), railMat);
          rail.position.set(0, baseY + 0.9, sgn * (fd / 2 + 1.06));
          add(rec, rail);
        });
      }

      /* prizemlje: ulazna nadstresnica na jugu (centar) */
      if (f.key === 'PR') {
        var can = new THREE.Mesh(
          new THREE.BoxGeometry(7, 0.18, 2.6),
          mkMat({ color: COL.fin, roughness: 0.6, metalness: 0.2 })
        );
        can.position.set(0, baseY + 2.7, DEP / 2 + 1.3);
        can.castShadow = true;
        add(rec, can);
        var colMat = mkMat({ color: 0x3c4045, roughness: 0.6, metalness: 0.25 });
        [-2.8, 2.8].forEach(function (cx) {
          var c = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 8), colMat);
          c.position.set(cx, baseY + 1.3, DEP / 2 + 2.1);
          c.castShadow = true;
          add(rec, c);
        });
      }

      /* potkrovlje: ograda krovne terase + dvovodni krov */
      if (f.key === 'PK') {
        var tw = L + 0.5, td = DEP + 0.5;
        [[0, td / 2, tw, 0.06], [0, -td / 2, tw, 0.06]].forEach(function (p) {
          var r1 = new THREE.Mesh(new THREE.BoxGeometry(p[2], 1.0, p[3]), railMat);
          r1.position.set(p[0], baseY + 0.78, p[1]); add(rec, r1);
        });
        [[tw / 2, 0, 0.06, td], [-tw / 2, 0, 0.06, td]].forEach(function (p) {
          var r2 = new THREE.Mesh(new THREE.BoxGeometry(p[2], 1.0, p[3]), railMat);
          r2.position.set(p[0], baseY + 0.78, p[1]); add(rec, r2);
        });

        var roof = new THREE.Mesh(
          roofPrism(fw + 1.6, 2.1, fd + 1.6),
          mkMat({ color: COL.roof, roughness: 0.85 })
        );
        roof.position.set(0, baseY + FH - 0.15, 0);
        roof.castShadow = true; roof.receiveShadow = true;
        add(rec, roof);

        var ridge = new THREE.Mesh(
          new THREE.BoxGeometry(fw + 1.8, 0.14, 0.4),
          mkMat({ color: 0x2a2724, roughness: 0.8 })
        );
        ridge.position.set(0, baseY + FH + 1.95, 0);
        add(rec, ridge);
        rec.roofMeshes = [roof, ridge];
      }

      /* nevidljivi hitbox za lak izbor sprata */
      var hitH = (f.key === 'PK') ? FH + 2.1 : FH;
      var hit = new THREE.Mesh(
        new THREE.BoxGeometry(L + 1, hitH, DEP + 1),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.set(0, baseY + hitH / 2, 0);
      hit.userData = { floorKey: f.key, hitbox: true };
      grp.add(hit);
      floorHit.push(hit);

      scene.add(grp);
    });
  }

  /* -------------------------------------------- logo na juznoj fasadi --- */
  function loadLogoSign() {
    var loader = new THREE.TextureLoader();
    loader.load('img/logo.png', function (tex) {
      logoTex = tex;
      var ar = tex.image.width / tex.image.height;
      var h = 1.1, w = h * ar;
      var sign = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
      );
      sign.position.set(0, 3 * FH + 1.4, DEP / 2 - PK_INSET + 0.12);
      scene.add(sign);
      invalidate();
    });
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
      if (is3d) invalidate();
    }
    btn3d.onclick = function () { showView('3d'); };
    btnCards.onclick = function () { showView('cards'); };
  }

  /* ===================================================== KARTICE STANOVA */
  var ICON_HOME =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-6h4v6"/></svg>';

  function renderApartmentCards() {
    var host = document.getElementById('aptCards');
    if (!host) return;
    var ids = ['C06', 'C10', 'C50'];
    var html = '';
    ids.forEach(function (id) {
      var u = M.getUnit(id);
      if (!u) return;
      html += '<div class="apt-card">' +
        '<div class="ac-img">' + ICON_HOME +
        '<span class="ac-tag pill ' + u.strukt.key + '">' + u.strukt.label + (u.duplex ? ' · Duplex' : '') + '</span>' +
        '</div>' +
        '<div class="ac-body">' +
        '<h3>Stan br. ' + u.num + '</h3>' +
        '<p class="ac-sub">' + u.etazaNaziv + (u.duplex ? ' · dva nivoa' : '') + '</p>' +
        '<div class="ac-meta">' +
        '<span>' + M.a2(u.ukupno) + ' m²</span>' +
        '<span>' + u.beds + (u.beds === 1 ? ' spavaća' : ' spavaće') + '</span>' +
        '<span>Terasa ' + M.a2(u.terasa) + ' m²</span>' +
        '</div>' +
        '<div class="ac-price"><b>Cena na upit</b><small>cenovnik uskoro</small></div>' +
        '<a class="ac-cta" href="stan.html?id=' + u.id + '">Pogledaj detalje stana</a>' +
        '</div></div>';
    });
    host.innerHTML = html;
  }

  /* ========================================================== KONTROLE */
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
        var r0 = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - r0.left) / r0.width) * 2 - 1;
        pointer.y = -((e.clientY - r0.top) / r0.height) * 2 + 1;
        hoverTest(e.clientX - r0.left, e.clientY - r0.top);
      }
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
        cam.tr = clamp(pinchStart.r * (pinchStart.d / Math.max(dist, 1)), 30, 190);
        moved = true;
        invalidate();
        return;
      }

      if (down) {
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        cam.tth -= dx * 0.006;
        cam.tph = clamp(cam.tph - dy * 0.005, 0.14, Math.PI * 0.48);
        lastX = e.clientX; lastY = e.clientY;
        invalidate();
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
      cam.tr = clamp(cam.tr + e.deltaY * 0.05, 30, 190);
      invalidate();
    }, { passive: false });

    var zi = document.getElementById('btnZoomIn'),
        zo = document.getElementById('btnZoomOut'),
        rs = document.getElementById('btnReset');
    if (zi) zi.onclick = function () { cam.tr = clamp(cam.tr - 10, 30, 190); invalidate(); };
    if (zo) zo.onclick = function () { cam.tr = clamp(cam.tr + 10, 30, 190); invalidate(); };
    if (rs) rs.onclick = function () { selectFloor(null); resetView(); };
  }

  function resetView() {
    cam.tth = Math.PI * 0.26; cam.tph = Math.PI * 0.36; cam.tr = 96;
    cam.ttarget.set(0, 7, 0);
    invalidate();
  }

  function bindResize() {
    function onResize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      invalidate();
    }
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
    onResize();
  }

  /* pauziraj petlju kad sekcija nije na ekranu / tab skriven */
  function bindVisibility() {
    var inView = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        visible = inView && !document.hidden;
        if (visible) invalidate();
      }, { threshold: 0.02 }).observe(stage);
    }
    document.addEventListener('visibilitychange', function () {
      visible = inView && !document.hidden;
      if (visible) invalidate();
    });
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* radius sa kog cela duzina lamele (+ margina u metrima) stane u kadar */
  function fitRadius(margin) {
    var halfH = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
    return (L / 2 + margin) / Math.tan(halfH);
  }

  /* =========================================================== RAYCAST */
  function hoverTest(px, py) {
    raycaster.setFromCamera(pointer, camera);
    var prevU = S.hoverUnit, prevF = S.hoverFloor;

    if (S.floor !== null) {
      var list = unitMeshes.filter(function (m) { return m.userData.floorKey === S.floor; });
      var hits = raycaster.intersectObjects(list, false);
      if (hits.length) {
        S.hoverUnit = hits[0].object.userData.unitId;
        S.hoverFloor = null;
        showUnitTip(px, py, M.getUnit(S.hoverUnit));
        canvas.style.cursor = 'pointer';
      } else {
        S.hoverUnit = null; hideTip(); canvas.style.cursor = '';
      }
    } else {
      var fh = raycaster.intersectObjects(floorHit, false);
      if (fh.length) {
        S.hoverFloor = fh[0].object.userData.floorKey;
        S.hoverUnit = null;
        showFloorTip(px, py, S.hoverFloor);
        canvas.style.cursor = 'pointer';
      } else {
        S.hoverFloor = null; hideTip(); canvas.style.cursor = '';
      }
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
    window.location.href = 'stan.html?id=' + encodeURIComponent(id);
  }

  /* ----------------------------------------------------------- tooltip */
  function showUnitTip(px, py, u) {
    if (!u) return;
    tooltip.innerHTML =
      '<b>Stan br. ' + u.num + ' · ' + u.strukt.label + (u.duplex ? ' duplex' : '') + '</b>' +
      '<span style="color:var(--muted)">' + M.a2(u.ukupno) + ' m² · ' + u.etazaNaziv +
      (u.terasa ? ' · terasa ' + M.a2(u.terasa) + ' m²' : '') + '</span>' +
      '<div class="tp">Klikni za detalje</div>';
    tooltip.style.left = px + 'px';
    tooltip.style.top = py + 'px';
    tooltip.style.opacity = '1';
  }

  function showFloorTip(px, py, key) {
    var f = M.getFloor(key);
    if (!f) return;
    tooltip.innerHTML = '<b>' + f.name + '</b>' +
      '<span style="color:var(--muted)">' + f.count + ' stanova · ' + M.range(f) + '</span>' +
      '<div class="tp">Klikni za pregled</div>';
    tooltip.style.left = px + 'px';
    tooltip.style.top = py + 'px';
    tooltip.style.opacity = '1';
  }

  function hideTip() { tooltip.style.opacity = '0'; }

  /* ====================================================== STIL / STANJE */
  function applyStyles() {
    var selF = (S.floor !== null) ? M.getFloor(S.floor) : null;

    M.floors.forEach(function (f) {
      var rec = floorObjects[f.key];
      var selected = (S.floor === f.key);
      var dimmed = (S.floor !== null && !selected);
      var hovered = (S.floor === null && S.hoverFloor === f.key);

      rec.meshes.forEach(function (m) {
        var mat = m.material;
        var bo = mat.userData.baseOpacity;
        var wantT = dimmed ? true : mat.userData.baseTransparent;
        if (mat.transparent !== wantT) { mat.transparent = wantT; mat.needsUpdate = true; }
        mat.opacity = dimmed ? bo * 0.08 : bo;
        mat.depthWrite = !dimmed;
      });

      /* na izabranom spratu: staklo skoro providno, na PK skloni i krov,
         da osnova sprata bude citljiva odozgo */
      if (selected) {
        if (rec.glass) rec.glass.material.opacity = 0.16;
        if (rec.roofMeshes) rec.roofMeshes.forEach(function (rm) {
          var mm = rm.material;
          if (!mm.transparent) { mm.transparent = true; mm.needsUpdate = true; }
          mm.opacity = 0.06;
          mm.depthWrite = false;
        });
      }

      /* "otvaranje" zgrade: spratovi IZNAD izabranog se podizu,
         izabrani i oni ispod ostaju na mestu */
      rec.group.userData.targetOffY = (selF && f.level > selF.level) ? 6.5 : 0;

      f.units.forEach(function (u) {
        var mesh = rec.units[u.id];
        var mat = mesh.material;
        var isHover = (S.hoverUnit === u.id);
        var matchesFilter = (S.filter === 'all' || u.strukt.key === S.filter);

        if (selected) {
          mat.color.setHex(COL.unitLit);
          if (matchesFilter) {
            mat.emissive.set(u.strukt.color);
            mat.emissiveIntensity = isHover ? 1.1 : 0.55;
          } else {
            mat.emissive.setHex(0x444a52);
            mat.emissiveIntensity = 0.1;
          }
        } else if (S.floor === null && S.filter !== 'all' && matchesFilter) {
          mat.color.setHex(COL.unit);
          mat.emissive.set(u.strukt.color);
          mat.emissiveIntensity = hovered ? 0.5 : 0.35;
        } else if (hovered) {
          mat.color.setHex(0x2f333a);
          mat.emissive.setHex(0xc8a86b);
          mat.emissiveIntensity = 0.2;
        } else {
          mat.color.setHex(COL.unit);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      });
    });
    syncMiniPlan();
    syncCards();
    invalidate();
  }

  /* ============================================================= PANEL */
  function selectFloor(key) {
    S.floor = key;
    S.hoverUnit = null; S.hoverFloor = null;
    hideTip();
    if (key === null) {
      cam.ttarget.set(0, 7, 0);
      cam.tr = 96;
      cam.tph = Math.PI * 0.36;
      renderFloorList();
    } else {
      var f = M.getFloor(key);
      /* pticja perspektiva: radius se racuna iz sirine kadra,
         tako da cela lamela + margina uvek stane na ekran */
      cam.ttarget.set(0, f.level * FH + 1.6, 0);
      cam.tr = clamp(fitRadius(16), 105, 185);
      cam.tph = 0.62;
      /* blago okreni ka blizoj poduznoj fasadi da lamela lezi horizontalno */
      var TWO = Math.PI * 2;
      var a = ((cam.tth % TWO) + TWO) % TWO;
      var snaps = [0, Math.PI, TWO];
      var best = snaps[0];
      snaps.forEach(function (c) { if (Math.abs(a - c) < Math.abs(a - best)) best = c; });
      cam.tth = cam.tth + (best - a);
      renderFloorDetail(key);
    }
    applyStyles();
  }
  window.MODUS_selectFloor = selectFloor;

  function chipsHTML() {
    var chips = [{ key: 'all', label: 'Svi stanovi', color: null }];
    ['t1', 't2', 't3'].forEach(function (k) {
      for (var b in M.STRUKT) {
        if (M.STRUKT[b].key === k) chips.push({ key: k, label: M.STRUKT[b].plural, color: M.STRUKT[b].color });
      }
    });
    var counts = { all: M.units.length, t1: 0, t2: 0, t3: 0 };
    M.units.forEach(function (u) { counts[u.strukt.key]++; });
    return '<div class="chips">' + chips.map(function (c) {
      return '<button class="chip' + (S.filter === c.key ? ' on' : '') + '" data-f="' + c.key + '">' +
        (c.color ? '<i style="background:' + c.color + '"></i>' : '') +
        c.label + ' <small>' + counts[c.key] + '</small></button>';
    }).join('') + '</div>';
  }

  function bindChips() {
    [].forEach.call(panelEl.querySelectorAll('.chip'), function (b) {
      b.onclick = function () {
        S.filter = b.getAttribute('data-f');
        if (S.floor === null) renderFloorList(); else renderFloorDetail(S.floor);
        applyStyles();
      };
    });
  }

  function dotsFor(f) {
    return '<span class="dots">' + f.units.map(function (u) {
      return '<i style="background:' + u.strukt.color + '"></i>';
    }).join('') + '</span>';
  }

  function renderFloorList() {
    var head = document.getElementById('panelHead');
    var st = M.stats();
    head.innerHTML =
      '<div class="t">Konfigurator stanova</div>' +
      '<h3>Novi stambeni objekat</h3>' +
      '<p>Pr+2+Pk · ' + st.ukupno + ' stanova · ' + Math.round(st.minA) + '–' + Math.round(st.maxA) + ' m²</p>';

    var html = chipsHTML();
    html += '<div class="floor-list">';
    M.floors.forEach(function (f) {
      var n = (S.filter === 'all') ? f.count :
        f.units.filter(function (u) { return u.strukt.key === S.filter; }).length;
      html += '<button class="floor-row" data-lv="' + f.key + '">' +
        '<span class="lv">' + f.key + '</span>' +
        '<span class="fi"><b>' + f.name + '</b>' +
        '<span>' + n + ' stanova · ' + M.range(f) + '</span></span>' + dotsFor(f) + '</button>';
    });
    html += '</div>';
    panelEl.innerHTML = html;
    bindChips();

    [].forEach.call(panelEl.querySelectorAll('.floor-row'), function (b) {
      var key = b.getAttribute('data-lv');
      b.onclick = function () { selectFloor(key); };
      b.onmouseenter = function () { S.hoverFloor = key; applyStyles(); };
      b.onmouseleave = function () { S.hoverFloor = null; applyStyles(); };
    });
  }

  function renderFloorDetail(key) {
    var f = M.getFloor(key);
    var head = document.getElementById('panelHead');
    head.innerHTML =
      '<div class="t">' + f.name + '</div>' +
      '<h3>' + f.count + ' stanova · ' + M.range(f) + '</h3>' +
      '<p>Klikni na stan u 3D prikazu, osnovi ili listi za detalje</p>';

    /* filter sakriva nepoklapajuce; lista skracena na 4 + "Prikazi jos" */
    var COLLAPSE = 4;
    var shown = f.units.filter(function (u) {
      return S.filter === 'all' || u.strukt.key === S.filter;
    });

    var html = '<button class="back-link" id="backBtn">← Svi spratovi</button>';
    html += chipsHTML();
    html += miniPlanSVG(f);
    html += '<div class="unit-list">';
    shown.forEach(function (u, i) {
      html += '<button class="unit-card' + (i >= COLLAPSE ? ' hid' : '') + '" data-id="' + u.id + '">' +
        '<div class="uc-top"><b>Stan br. ' + u.num + '</b>' +
        '<span class="pill ' + u.strukt.key + '">' + u.strukt.label + (u.duplex ? ' · duplex' : '') + '</span></div>' +
        '<div class="uc-meta">' +
        '<span>' + M.a2(u.ukupno) + ' m²</span>' +
        '<span>' + u.beds + (u.beds === 1 ? ' spavaća' : ' spavaće') + '</span>' +
        (u.terasa ? '<span>terasa ' + M.a2(u.terasa) + ' m²</span>' : '') +
        '</div>' +
        '<div class="uc-price">Cena na upit<small>detalji i tlocrt →</small></div>' +
        '</button>';
    });
    html += '</div>';
    if (shown.length > COLLAPSE) {
      html += '<button class="show-more" id="showMore">Prikaži još ' + (shown.length - COLLAPSE) + ' stanova ↓</button>';
    }
    panelEl.innerHTML = html;
    bindChips();

    document.getElementById('backBtn').onclick = function () { selectFloor(null); };

    var sm = document.getElementById('showMore');
    if (sm) sm.onclick = function () {
      [].forEach.call(panelEl.querySelectorAll('.unit-card.hid'), function (el) {
        el.classList.remove('hid');
      });
      sm.remove();
    };

    [].forEach.call(panelEl.querySelectorAll('.unit-card'), function (b) {
      var id = b.getAttribute('data-id');
      b.onclick = function () { openUnit(id); };
      b.onmouseenter = function () { S.hoverUnit = id; applyStyles(); };
      b.onmouseleave = function () { S.hoverUnit = null; applyStyles(); };
    });
    bindMiniPlan();
  }

  /* ------------------------------------------------------- mini osnova -- */
  function miniPlanSVG(f) {
    var W = 300, rowH = 46, corr = 12;
    var H = rowH * 2 + corr;
    var s = '<div class="mini-plan"><div class="mt">Šematska osnova etaže — raspored duž lamele</div>';
    s += '<svg viewBox="-4 -4 ' + (W + 8) + ' ' + (H + 22) + '" id="miniPlan">';
    s += '<rect x="-2" y="-2" width="' + (W + 4) + '" height="' + (H + 4) + '" rx="4" fill="none" stroke="rgba(255,255,255,.14)" stroke-dasharray="4 4"/>';
    f.units.forEach(function (u) {
      var x = u.lx * W, w = u.lw * W;
      var y = (u.side === 'N') ? 0 : rowH + corr;
      var c = u.strukt.color;
      s += '<g class="u" data-id="' + u.id + '">' +
        '<rect x="' + (x + 1) + '" y="' + y + '" width="' + (w - 2) + '" height="' + rowH + '" rx="3" ' +
        'fill="' + c + '" fill-opacity="0.13" stroke="' + c + '" stroke-opacity="0.7" stroke-width="1.1"/>' +
        '<text x="' + (x + w / 2) + '" y="' + (y + rowH / 2 - 2) + '" text-anchor="middle" ' +
        'font-size="10" font-weight="600" fill="' + c + '">' + u.num + '</text>' +
        '<text x="' + (x + w / 2) + '" y="' + (y + rowH / 2 + 11) + '" text-anchor="middle" ' +
        'font-size="7.5" fill="rgba(255,255,255,.45)">' + Math.round(u.ukupno) + ' m²</text></g>';
    });
    s += '<rect x="0" y="' + rowH + '" width="' + W + '" height="' + corr + '" fill="rgba(255,255,255,.05)"/>';
    s += '<text x="' + (W - 2) + '" y="' + (H + 14) + '" text-anchor="end" font-size="7" fill="rgba(255,255,255,.3)">JUG ↓</text>';
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
      if (r) r.setAttribute('fill-opacity', on ? '0.36' : '0.13');
    });
  }

  function syncCards() {
    if (!panelEl) return;
    [].forEach.call(panelEl.querySelectorAll('.unit-card'), function (b) {
      b.style.borderColor = (b.getAttribute('data-id') === S.hoverUnit) ? 'var(--accent)' : '';
    });
  }

  /* ============================================================= PETLJA
     Renderuje se SAMO dok traje animacija kamere/sprata ili posle promene
     (dirty). U mirovanju: nula GPU posla.                                  */
  function animating() {
    if (Math.abs(cam.tr - cam.r) > 0.05) return true;
    if (Math.abs(cam.tth - cam.th) > 0.0008) return true;
    if (Math.abs(cam.tph - cam.ph) > 0.0008) return true;
    if (cam.target.distanceToSquared(cam.ttarget) > 0.002) return true;
    for (var k in floorObjects) {
      var g = floorObjects[k].group;
      if (Math.abs(g.userData.targetOffY - g.userData.offY) > 0.004) return true;
    }
    return false;
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;

    var anim = animating();
    if (!anim && !dirty) return;

    cam.r += (cam.tr - cam.r) * 0.09;
    cam.th += (cam.tth - cam.th) * 0.11;
    cam.ph += (cam.tph - cam.ph) * 0.11;
    cam.target.lerp(cam.ttarget, 0.08);

    camera.position.set(
      cam.target.x + cam.r * Math.sin(cam.ph) * Math.sin(cam.th),
      cam.target.y + cam.r * Math.cos(cam.ph),
      cam.target.z + cam.r * Math.sin(cam.ph) * Math.cos(cam.th)
    );
    camera.lookAt(cam.target);

    for (var k in floorObjects) {
      var g = floorObjects[k].group;
      g.userData.offY += (g.userData.targetOffY - g.userData.offY) * 0.12;
      g.position.y = g.userData.offY;
    }

    renderer.render(scene, camera);
    dirty = anim;   // dok traje animacija ostaje "prljavo", inace se gasi
  }

  /* ============================================================== START */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
