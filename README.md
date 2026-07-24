# MODUS Rezidencija — 3D konfigurator stanova

Demo prezentacioni sajt za građevinsku firmu, sa interaktivnim 3D prikazom
stambenog objekta i selektorom stanova.

**Live demo:** _(dodati link nakon deploy-a)_

---

## Funkcionalnosti

**3D konfigurator**

- Proceduralno generisan model objekta P+7 (Three.js) — bez eksternih 3D fajlova
- Rotacija mišem, zumiranje točkićem, pinch-zoom na dodirnim ekranima
- Auto-rotacija dok je scena neaktivna
- Izbor sprata: izabrana etaža se izdiže i osvetljava, ostale se prigušuju
- Raycasting selekcija pojedinačnih stanova sa tooltipom (kvadratura, status, cena)
- Realne senke, ACES tone mapping, kontekst okoline (susedni objekti, zelenilo)

**Prodajni deo**

- Statusi stanova: slobodan / rezervisan / prodat (prodati nisu klikabilni)
- 2D osnova etaže sinhronizovana sa 3D prikazom — hover i klik rade u oba smera
- Stranica stana: tlocrt po prostorijama sa kvadraturama, specifikacija,
  pozicija u objektu, cena i €/m², forma za upit
- Prizemlje kao poslovna etaža (kafić, autoperionica, lokal)

**Sajt**

- Responsive, tamna premium tema
- Sekcije: hero, o kompaniji, konfigurator, reference, prateći sadržaji, kontakt
- Scroll reveal animacije, mobilna navigacija

---

## Tehnologije

| | |
|---|---|
| 3D | Three.js r128 (WebGL) |
| Kontrola kamere | sopstvena implementacija — sferne koordinate sa damping-om, bez OrbitControls |
| Frontend | Vanilla JS (ES5), HTML5, CSS3 |
| Zavisnosti | nema build procesa, nema npm-a — otvara se direktno |

---

## Struktura

```
├── index.html      početna strana + konfigurator
├── stan.html       stranica pojedinačnog stana
├── styles.css      stilovi (dizajn tokeni kroz CSS varijable)
├── data.js         model objekta: etaže, jedinice, cene, statusi, tlocrti
├── app.js          3D scena, kontrole, raycasting, UI panel
└── stan.js         render stranice stana i SVG tlocrta
```

---

## Pokretanje

Otvoriti `index.html` u browseru. Bez servera, bez instalacije.

Za lokalni server (preporučeno zbog konzistentnog ponašanja ruta):

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

---

## Izmena podataka

Sve informacije o objektu su na jednom mestu — `data.js`.

**Promena statusa stana:**

```js
var STATUS = {
  3: { A: 'slobodan', B: 'rezervisan', C: 'prodat', D: 'slobodan' },
  ...
};
```

**Promena cena** — funkcija `pricePerM2(level, type)`.

**Promena rasporeda etaže** — niz `STD_UNITS`. Svaka jedinica je definisana
centrom (`cx`, `cz`) i dimenzijama (`w`, `d`) u metrima. 3D model se generiše
direktno iz ovih vrednosti, pa se izmenom tlocrta automatski menja i 3D prikaz.

**Promena rasporeda prostorija** — objekat `PLANS`, normalizovane zone `[x, y, w, h]`
u opsegu 0–1.

---

## Napomena

Prikazani objekat, tlocrti, cene i vizuelizacije su demonstracioni.
Zamenjuju se stvarnom projektnom dokumentacijom investitora.

---

## Licenca

Sva prava zadržana. Kod nije za slobodnu upotrebu bez dozvole autora.
