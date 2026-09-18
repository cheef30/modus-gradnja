# MODUS GRADNJA - prezentacioni sajt sa 3D konfiguratorom stanova

Sajt građevinske firme MODUS GRADNJA: interaktivni 3D prikaz objekta,
izbor sprata i stana, prodajni listovi i cene.

**Sajt:** https://cheef30.github.io/modus-gradnja/

---

## Objekti u ponudi

| Objekat | Spratnost | Stanova | Cene |
|---|---|---|---|
| Kneza Sime Markovića | Pr + 1 + 2 + Pk | 63 | u cenovniku |
| Miloša Obrenovića | Pr + 1 + 2 | 7 | na upit |

Svi podaci (kvadrature, prostorije, površine terasa, raspored po etažama)
preuzeti su iz projektne dokumentacije investitora.

---

## Funkcionalnosti

**3D konfigurator**

- Proceduralno generisan model objekta (Three.js) - bez eksternih 3D fajlova
- Rotacija mišem, zumiranje točkićem, pinch-zoom na dodirnim ekranima
- Izbor etaže: izabrana se izdiže i osvetljava, ostale se prigušuju
- Raycasting selekcija stanova sa tooltipom (struktura, kvadratura, cena)
- Filter po strukturi (dvosobni / trosobni / četvorosobni)
- 2D osnova etaže sinhronizovana sa 3D prikazom - hover i klik rade u oba smera
- Širine stanova u modelu proporcionalne stvarnoj kvadraturi

**Prodajni deo**

- Jedna stranica (`stan.html?id=…`) dinamički opslužuje svih 70 stanova
- Prodajni list iz dokumentacije: render, tlocrt i tabela površina
- Specifikacija, cena i €/m², pozicija u objektu, ostali stanovi na etaži
- Kontakt forma po stanu, sa unapred popunjenom porukom

**Sajt**

- Responsive, tamna tema
- Kontakt forme šalju upite na mejl prodaje (FormSubmit, bez backenda)
- Zaštita od spama: honeypot polje + minimalno vreme popunjavanja
- SEO: Open Graph, Twitter card, JSON-LD (`GeneralContractor`), sitemap, robots

---

## Performanse

3D scena se renderuje **samo kada se nešto menja** - u mirovanju GPU ne radi
ništa. Petlja se potpuno pauzira kada sekcija nije u vidnom polju ili je tab
u pozadini. `devicePixelRatio` je ograničen, senke 1024², ~130 draw call-ova.

Poštuje se `prefers-reduced-motion`.

---

## Tehnologije

| | |
|---|---|
| 3D | Three.js r128 (WebGL) |
| Kontrola kamere | sopstvena - sferne koordinate sa damping-om, bez OrbitControls |
| Frontend | Vanilla JS (ES5), HTML5, CSS3 |
| Zavisnosti | nema build procesa, nema npm-a |
| Hosting | GitHub Pages |

---

## Struktura

```
├── index.html          početna + 3D konfigurator
├── stan.html           šablon stranice stana
├── stan/               GENERISANO - 70 statičkih stranica (C01.html …)
├── build-stanovi.js    generator stranica + sitemap-a
├── styles.css          stilovi (dizajn tokeni kroz CSS varijable)
├── data.js             podaci + API sloj (cene, statusi, raspored)
├── site.js             zajedničko: nav, scroll reveal, forme, kontakt
├── app.js              3D scena, kontrole, raycasting, panel etaža
├── stan.js             render stranice stana
├── stanovi.json        IZVOR podataka o stanovima
├── sitemap.xml         GENERISAN
└── img/
    ├── stanovi/        originalni prodajni listovi (85 MB, van gita)
    ├── stanovi-web/    web verzije istih listova (8 MB)
    └── druga-zgrada/   listovi objekta Miloša Obrenovića
```

---

## Izmena podataka

### Status stana

U `data.js`, objekat `STATUSI` - podrazumevano su **svi slobodni**, upisuju se
samo izuzeci:

```js
var STATUSI = { 'C05': 'rezervisan', 'C12': 'prodat', 'M13': 'prodat' };
```

Prodati stanovi se prigušuju u listi, mini-osnovi i 3D prikazu, ali se i dalje
otvaraju - na stranici stana stoji traka **PRODATO**.

### Zauzeta garažna mesta

U `data.js`, objekat `GARAZA_ZAUZETO` - podrazumevano je **svako mesto
slobodno**, upisuju se samo zauzeta:

```js
var GARAZA_ZAUZETO = { 3: true, 12: true, 40: true };
```

Zauzeto mesto je crveno u shemi i ne može da se izabere. Broj slobodnih i
zauzetih u legendi se računa sam.

Shema garaže (`garaza.js`) otvara se dugmetom **Izaberi garažno mesto** na
stranici svakog stana. Raspored je jedna garaža sa 47 mesta i tri ulaza,
u objektu `GARAZA` u `data.js`. Položaj svakog mesta (`x`, `y`, `w`, `h`)
izveden je iz koordinata oznaka u `img/garazapdf.pdf`.

### Cene

U `data.js`: `CENA_M2` (Kneza Sime Markovića) i `CENA_M2_DZ` (Miloša Obrenovića).

- Kneza Sime Markovića: obračun po **redukovanoj** površini (-3%), sa PDV-om
- Miloša Obrenovića: po ukupnoj neto površini, sa PDV-om (prodajni listovi
  tog objekta nemaju redukovanu površinu)

### Posle svake izmene cena ili statusa

```bash
node build-stanovi.js
```

Regeneriše svih 68 stranica u `stan/` i `sitemap.xml`. **Obavezno** - inače
statičke stranice zadrže stare cene i statuse u meta oznakama.

Izmena `GARAZA_ZAUZETO` **ne** traži regenerisanje - shema se crta u pregledaču.

### Podaci o stanovima

Izvor je **`stanovi.json`**.

- `tipovi` - jedinstveni rasporedi stanova (prostorije i površine)
- `jedinice` - mapiranje svakog stana na svoj tip, etažu i prodajni list
- `objekat` - spratnost i zbirne površine

Raspored duž lamele (ko je gde) i geometrija modela su u API sloju `data.js`
(`ORDER`, `MODUS.geo`) - 2D osnova i 3D model čitaju iste vrednosti, pa ne mogu
da se raziđu.

Kontakt podaci su na jednom mestu: `MODUS.kontakt` u `data.js`.

---

## Pokretanje

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Lokalni server je potreban - kontakt forme ne rade kada se `index.html`
otvori kao fajl (`file://`).

---

## Licenca

Sva prava zadržana. Kod nije za slobodnu upotrebu bez dozvole autora.
