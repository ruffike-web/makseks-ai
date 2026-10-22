# Makseks AI

**Eesti** · [English](README.en.md)

Makseks AI on Windowsi rakendus ostuarvete kontrollimiseks ja pankade maksefailide loomiseks. Impordi arve, kontrolli leitud andmeid, kinnita makse ning ekspordi internetipanka sobiv ISO 20022 `pain.001.001.09` XML. Programm ei algata ega allkirjasta makseid.

## Võimalused

- PDF-i kohalik lugemine ilma AI, API-võtme ja internetita. Lugeja arvestab teksti paigutust; piltide ja skannide kohalikku OCR-i pole.
- Valikuline AI-lugemine: Google Gemini, OpenAI, Anthropic Claude, Groq ja Mistral Document AI. Teenusepakkuja, mudel ja API-võti valitakse seadetes.
- Käsitsi sisestamine, algdokumendi võrdlus, andmete päritolu ning inimese kinnitus enne eksporti.
- Eksportimata valmis arved märgitakse punaseks, kui nende maksetähtpäev on täna või möödas. Kokkuvõte ja üleslaadimisala võtavad vähem ruumi.
- Mitme ettevõtte eraldi arved, tarnijad, pangaseaded ja ekspordiajalugu.
- Muudetav tarnijaregister: salvestatud nimi, registrikood, aadress ja üheselt sobiv konto täidavad järgmiste arvete väljad.
- IBAN-i, viitenumbri, summa, kuupäevade, võimalike duplikaatide ja muutunud kontode kontroll.
- SEB, LHV, Coop Panga ja Swedbanki profiilid koos kohaliku XSD-valideerimisega.
- Vahetatav eesti ja inglise kasutajaliides.

## Windowsi programmi kasutamine

Versiooni **0.7.4** failid asuvad selle privaatse repositooriumi [Releases](https://github.com/ruffike-web/makseks-ai/releases) lehel. Ligipääs eeldab repositooriumi õigusi.

| Pakett | Kasutus |
| --- | --- |
| `Makseks-AI-0.7.4-portable-kiire.zip` | Soovitatav portable. Paki kogu ZIP üks kord lahti ja käivita `Makseks AI.exe`. |
| `Makseks-AI-0.7.4-setup.exe` | Paigaldusviisard ja käivitamine Start-menüüst. |
| `Makseks-AI-0.7.4-portable.exe` | Üks fail, mis pakib sisu igal käivitusel ajutisse kausta; avaneb aeglasemalt. |

Paketid on Windows x64 jaoks. Node.js-i või terminali eraldi vaja ei ole. EXE-d on allkirjastamata ja Windows võib küsida käivituse kinnitust. Kontrollsummad on väljalaske failis `SHA256SUMS.txt`.

**Uuendamisel:** sulge vana programm. Portable-versiooni `Makseks-AI-andmed` kaust tuleb kopeerida uue EXE kõrvale. Tee enne olemasolevate andmete asendamist varukoopia. Installeri versioon kasutab `%APPDATA%\Makseks AI` andmeid.

1. Ava **Seaded**, lisa maksja ettevõte ja õige pangakonto.
2. Vali **Arvete import → Andmete lugemine** ning lisa arved.
3. Ava **Kontrolli**, võrdle algdokumendiga ja paranda puuduvad või ebaselged väljad.
4. Kinnita arve. Vali valmis arved ja loo XML-fail.
5. Impordi XML õige ettevõtte internetipanka ning kontrolli maksed seal üle.

Täielik juhend: [eesti keeles](docs/WINDOWS.md) · [in English](docs/WINDOWS.en.md).

## Andmed ja piirangud

Kohalik ja käsitsi lugemine ei saada arveid AI-teenusele. AI-lugemine saadab dokumendi valitud teenusele ainult aktiivse ettevõtte loal. Mudelite laadimine vajab internetti, kuid ei saada arveid. Teenuste hinnad, mudelid ja kvoodid sõltuvad nende kontodest; mudeliloendit saab seadetes värskendada.

Andmebaas ja API-seaded asuvad kasutaja andmekaustas. **Windowsi programmis on API-võtmed `ai-config.json` failis krüpteeritud Windowsi kasutajakontoga seotud kaitsega.** Varasemad võtmed teisendatakse esimesel käivitamisel automaatselt. Teise arvuti või kasutaja all tuleb võtmed uuesti sisestada. Eraldi arendusserveri (`npm run dev/start`) võtmefail on endiselt krüpteerimata. Ära jaga andmekausta ega paiguta aktiivset andmebaasi võrgukettale. See on ühe kohaliku kasutaja tööriist; ettevõtte valik ei ole kasutajakontode ligipääsukontroll. Väljalasked ja repositoorium ei sisalda päris arveid, andmebaase ega võtmeid.

Kõik väljad vajavad inimese kontrolli. Sulgudes, vigased või ebaselged summad jäetakse käsitsi täitmiseks; mitme konto vahel automaatselt ei valita. Toetatud on EUR tarnijamaksed. XSD kontroll ei taga internetipanga aktsepteerimist: SEB import on kasutaja kinnitatud; LHV, Coop Panga ja Swedbanki tegelik import vajab veel kontrolli.

## Arendamine

Vajalikud: Windows x64, Git ja Node.js 24 LTS. Soovitatav hoida töötav andmebaas väljaspool sünkroonitavat kausta.

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run db:deploy
npm.cmd run dev
```

Ava terminalis näidatud kohalik aadress. `.env` ja `data/` ei kuulu Giti. `npm ci` genereerib Prisma kliendi; `db:deploy` loob või uuendab seadistatud andmebaasi, seega varunda olemasolevad andmed enne migratsiooni.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd run desktop:pack
npm.cmd run desktop:portable-smoke -- --fast
npm.cmd run desktop:local-smoke
npm.cmd run desktop:due-smoke
```

Töövootestid kasutavad eraldi testandmeid. `desktop:pack` koostab kolm Windowsi paketti ja kontrollib privaatsete failide puudumist. Kui vana EXE hoiab ehituskausta lukus, kasuta eraldi väljundkausta; juhised on Windowsi juhendis. Uue pangaprofiili lisamine: [ADDING_A_BANK.md](docs/ADDING_A_BANK.md).

- [Koodiülevaatus ja teadaolevad piirangud / Code review](docs/SECURITY_REVIEW.md)
- [Väljalasete kontrollid](docs/WINDOWS_VALIDATION.md)
- [Pangaskeemid ja impordikontroll](docs/bank-specs/README.md)

Repositoorium on esialgu privaatne. Avaliku levitamise või avatud lähtekoodi litsentsi ei ole määratud.
