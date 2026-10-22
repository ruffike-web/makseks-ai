# Makseks AI 0.3.0 – Windowsi kontroll

## 0.7.4 kontroll – 22.10.2026

- 152 automaattesti 27 failis, TypeScript, ESLint ja tootmisversiooni ehitus läbisid kontrolli. Vitest uuendati versioonile 4.1.12; tootmissõltuvuste audit: 0. Kogu sõltuvuste auditi reegel läbis kontrolli varasema dokumenteeritud `braces` erandiga.
- Kolm uut brauseritesti kontrollisid tänase ja möödunud tähtpäeva punast märgistust ainult eksportimata READY-arvetel, muutumatuid kogusummasid, tulevaste/eksporditud/kontrollimata arvete välistamist, ingliskeelseid silte ja Eesti südaöö järel värskendumist ilma serveripäringu või maksevaliku lähtestamiseta.
- Kujundus vaadati kuvatõmmistelt üle 1440, 780 ja 390 px laiustel. Töölaua üleslaadimisala kõrgus on 132 px ning kokkuvõtteriba alla 95 px; kitsastes vaadetes ei teki lehe horisontaalset ülevoolu.
- Uues Windowsi programmis läbis `desktop:due-smoke` tegelike sünteetiliste arvete loomise ja kinnitamise, eesti/inglise tähtpäevateated ning punase märgistuse eemaldumise pärast tegelikku XML-eksporti. Hilisema maksekuupäevaga arve märgistus lähtub endiselt arve tähtpäevast.
- Lõplik kiire portable-ZIP pakiti projekti välisesse ajutisse kausta: iseseisev käivitumine, andmekausta loomine, mudelivalikud, kõigi nelja panga XSD-eksport, PDF-tekst ja PDF→PNG teisendus läbisid kontrolli.
- Väljalaske privaatsusaudit kontrollis 2346 ressursifaili; lähtekoodi audit 146 faili. Testid kasutasid eraldi sünteetilisi andmeid. Kasutaja andmekausta ei muudetud; tasulisi AI-päringuid, päris pangaimpordi katseid ega paigaldusviisardi läbimist ei tehtud.

English: 0.7.4 passed 152 unit/integration tests, three new browser tests, typecheck, lint, production build, and real Windows approval/export tests for due reminders in both languages. Screenshots at desktop and narrow widths were inspected. The final portable ZIP passed independent startup, four-bank schema export and PDF checks. Privacy audits passed. Vitest was patched to 4.1.12; production audit remains zero. Real user data, paid AI calls, bank imports and the installer wizard were not used.

## 0.7.3 kontroll – 15.10.2026

- 137 automaattesti 26 failis, TypeScript, ESLint ja tootmisversiooni ehitus läbisid kontrolli.
- Ehitatud Windowsi programmis kontrolliti tegelikku `safeStorage` / DPAPI krüpteerimist ja dekrüpteerimist: varasema lihttekstivõtme automaatne teisendamine, uue võtme salvestamine, püsimine pärast taaskäivitust, eesti/inglise veateade avamatu võtme korral ning võtme asendamine ja eemaldamine. Arved ja teiste teenuste võtmed säilisid. Avamatu võtme olukord tekitati vigase krüptotekstiga; teise Windowsi kasutajakontoga sisse ei logitud.
- Pakendatud programmi töövootest läbis ettevõtted, viie teenuse võtmed ja nõusolekud, SEB/LHV XML-i allalaadimise ning PDF-teksti lugemise. Vananenud testivalija parandati: kohalik lugeja tuvastab näidisarve numbri TEST-1 ning tabel kuvab seda failinime asemel. Rakenduse koodi selle tõttu ei muudetud. Peidetud akna ekraanipilt jäeti funktsionaalsest testist välja.
- Keelekatse ning kohaliku lugemise, mitme konto valiku, käsitsi režiimi ja salvestatud tarnija IBAN-i pärimise katsed läbisid kontrolli.
- Lõplik kiire portable ZIP pakiti projekti välisesse kausta. Iseseisev käivitumine, andmekausta loomine, mudelivalikud, kõigi nelja panga XSD-eksport, PDF-tekst ja PDF→PNG teisendus läbisid kontrolli.
- Väljalaske privaatsusaudit läbis 2346 ressursifaili. Pakendatud serveris ei leitud `braces` ega `sprintf-js` pakette. Tootmissõltuvuste audit: 0. Kogu audit: 5 kõrget hoiatust dokumenteeritud arendussõltuvuse `braces` ahelas; uus auditi reegel läbis kontrolli. Uuendatud Electroni allalaadimistööriista proksiliides läbis kohaliku testserveriga ühilduvuskatse.
- Testid kasutasid eraldi sünteetilisi andmeid ja võtmeid. Päris AI-päringuid, pangaimpordi katseid ega paigaldusviisardi läbimist ei tehtud. Kasutaja olemasolevat andmekausta ei muudetud. Vanemate väljalasete kontrollid allpool on ajaloolised.

English: 0.7.3 passed 137 tests, typecheck, lint, production build, real Windows DPAPI migration/save/restart and locked-key replacement/removal, bilingual workflow, local supplier inheritance and the final ZIP's independent four-bank/PDF checks. Locked-key recovery was simulated with invalid ciphertext, not a second Windows login. Release privacy audit passed; production audit is zero, with five documented development-only braces warnings remaining. No paid AI calls, real bank imports or installer wizard run were performed.

Kontrollitud 08.10.2026 Windows x64 keskkonnas.

- 75 automaattesti 14 failis läbisid kontrolli. Kaetud on nelja panga profiilid ja XSD, makseandmed, ettevõtete eraldamine, andmebaasi migratsioon/import, AI seadete üleminek ning teenusepakkujaga seotud nõusolek. Uus nõusolekuväli ei tühista varasemaid makseandmete kinnitusi.
- TypeScript, ESLint ja Next.js tootmisversiooni ehitus läbisid kontrolli.
- Pakendatud Electroni programmi test kontrollis ettevõtte loomist, Gemini/OpenAI/Claude valikut, mudelite ja eraldi võtmete säilimist, võtme eemaldamist, teenuse vahetamisel kõigi ettevõtete AI loa väljalülitamist ning vana nõusoleku tagasilükkamist. SEB/LHV XML loodi ja salvestati tegeliku allalaadimisena; PDF-teksti lugemine õnnestus.
- Lõpliku kiire portable-ZIP-i test pakkis programmi projekti välisesse ajutisse kausta. Kontrolliti iseseisvat käivitumist, EXE kõrval andmekausta loomist, seadeid, kõigi nelja panga XSD-ga kontrollitud eksporti ja PDF-ist teksti lugemist.
- Väljalaske privaatsusaudit kontrollis 2140 ressursifaili: andmebaase, privaatseid konfiguratsioonifaile ega kohaliku .env teadaolevaid salajasi võtmeid ei leitud.
- OpenAI ja Claude päringute kuju, PDF/pildi edastamine ja veakäsitlus on kontrollitud simuleeritud HTTP vastustega. Päris tasulisi arvelugemise päringuid nende teenustega selles kontrollis ei tehtud.

## Käivitusaeg

Samas arvutis mõõdeti protsessi käivitamisest kasutusvalmis „Lisa ostuarved” vaateni kaks käivitust eraldi sünteetilise andmekaustaga.

| Pakett | Esimene käivitus | Teine käivitus |
| --- | ---: | ---: |
| 0.2.0 ühe EXE portable | 35,007 s | 33,498 s |
| 0.3.0 lahtipakitud kiire portable | 1,759 s | 1,770 s |

ZIP-i esmast lahtipakkimist ei arvestata käivitusaega. Mõõtmised sõltuvad arvutist, kettast, viirusetõrjest ja vahemälust. Kiire versioon väldib igakordset lahtipakkimist. Mõõtmiste lähteandmed on kohalikus test-results/baseline-portable.json ja test-results/fast-portable.json failis.

## Piirangud

Installer ja ühe EXE portable on koostatud sama rakendusega; selle väljalaske täielik portable-töövootest tehti ZIP-paketiga. Paigaldusviisardit ei ole kasutaja Windowsi installatsioonis läbi tehtud.

EXE-failid on digitaalselt allkirjastamata. SmartScreen võib kuvada tundmatu avaldaja hoiatuse. LHV, Coop Panga ja Swedbanki internetipanga tegelik import on veel kontrollimata; SEB impordi õnnestumise kinnitas kasutaja varem. Androidi paketti selles etapis ei loodud.

Testid kasutasid eraldi sünteetilisi andmeid. Kasutaja olemasolevat arveandmebaasi ei kasutatud töövootesti sihtmärgina. Väljalaske räsiarvud asuvad release/SHA256SUMS.txt failis.

## 0.3.1 kontroll – 09.10.2026

77 automaattesti 15 failis, TypeScript, ESLint ja tootmisversiooni ehitus läbisid kontrolli. Windowsi töövootest valis uued GPT-6.1 Sol ja Claude Sonnet 5.5 mudelid rippmenüüst, salvestas need ning kontrollis võtmete ja ettevõtete lubade käitumist. Lõplikust 0.3.1 ZIP-ist kontrolliti kõigi seitsme uue OpenAI/Claude mudeli valitavust ilma API-võtmeta, nelja panga XSD-eksporti ja PDF-lugemist. Privaatsusaudit läbis 2140 faili. Tasulisi AI-päringuid pärisvõtmetega ei tehtud; API testid kasutasid simuleeritud vastuseid. Paigaldusviisardit ei käivitatud.

## 0.4.0 kontroll – 09.10.2026

88 automaattesti 16 failis, TypeScript, ESLint ja tootmisversiooni ehitus läbisid kontrolli. Uued testid katavad Groqi tegeliku PDF→PNG teisendamise, pikema PDF-i tagasilükkamise enne võrgupäringut, Groqi/Mistrali PDF- ja pildipäringute kuju, võtmete eraldamise, vana konfiguratsiooni ülemineku, mudelite filtreerimise ja kvoodivead. API vastused olid simuleeritud.

Windowsi töövootest läbis ka Groqi ja Mistrali mudelite/võtmete salvestamise ning ettevõtete AI lubade kontrolli. Lõpliku 0.4.0 ZIP-i kaasapandud Node ja PDF-teegid renderdasid sünteetilise PDF-i PNG-ks väljaspool projekti; kontrolliti mudelivalikuid, nelja panga XSD-eksporti ja PDF-teksti lugemist. Renderduse testi laiuse võrdlus parandati ujukomaarvu ümardust arvestavaks (1600.0000000000002 vs 1600); rakenduse renderdus töötas.

Privaatsusaudit läbis 2140 faili. Kasutaja Groqi/Mistrali võtmetega pärispäringuid, arvelugemise täpsust ega tasuta konto kvooti ei kontrollitud. Paigaldusviisardit ei käivitatud.

## 0.5.0 kontroll – 12.10.2026

96 automaattesti 19 failis, TypeScript, ESLint ja tootmisversiooni ehitus läbisid kontrolli. Lisandusid paketi vähendamise ohutuspiiride, eraldi keele-eelistuse salvestamise ning kasutajaliidese ja tegelike valideerimisteadete tõlgete testid.

Pakendatud Windowsi programmi keelekatse kontrollis eesti/inglise keele kohest vahetamist, salvestamata ettevõttenime säilimist vormis, muutumatuid makseandmeid ja arve kinnituskonteksti, Windowsi menüüsid ning valiku säilimist lehe värskendamisel ja programmi taaskäivitamisel. Ingliskeelses arvevaates kontrolliti kohustusliku välja veateadet ning tarnijanime salvestamist muutmata kujul. Keelekatse ei tee ekraanipilte: peidetud Electroni dialoogi pildistamine aegus; vormide ja menüüde kontroll toimub Playwrighti kaudu.

Windowsi põhitöövootest läbis ettevõtte loomise, kõigi viie AI-teenuse seadete ja lubade kontrolli, SEB/LHV XML-i allalaadimise ning PDF-teksti lugemise. Lõplik 0.5.0 portable-ZIP pakiti projekti välisesse ajutisse kausta: käivitumine, andmekaust, mudelivalikud, kõigi nelja panga XSD-eksport ning kaasapandud PDF-i teksti- ja PNG-lugemine läbisid kontrolli. Väljalaske privaatsusaudit läbis 1966 faili.

| Pakett | 0.4.0 (baiti) | 0.5.0 (baiti) | Vähenemine |
| --- | ---: | ---: | ---: |
| Kiire portable-ZIP | 256 513 945 | 212 642 151 | 17,1% |
| Installer | 186 337 145 | 155 380 429 | 16,6% |
| Lahtipakitud programm | 699 518 757 | 548 984 639 | 21,5% |

Keeletoe lisandumine suurendas sama vähendatud pakendi lahtipakitud mahtu 62 410 baidi võrra võrreldes vaheversiooniga 0.4.1. Uusi sõltuvusi ei lisatud. Eemaldatud on silumise lähtekaardid, kasutamata teiste andmebaaside mootorid ja Electroni muud keeled; SQLite ning PDF-i lugemise failid säilivad. ZIP kasutab tugevamat tihendust. Mõõtmiste lähteandmed on `test-results/size-before.json` ja `test-results/size-after.json`.

Selles väljalaskes ei tehtud tasulisi AI-päringuid, internetipankade importi ega installiviisardi läbimist. Olemasolevad piirangud kehtivad jätkuvalt. Kõik töövootestid kasutasid sünteetilisi andmeid.

## 0.6.0 kontroll – 13.10.2026

104 automaattesti 20 failis, TypeScript, ESLint ja tootmisversiooni ehitus läbisid kontrolli. Kohaliku lugeja testid katavad eesti/inglise nimetused, ostja ja tarnija eristamise, maksja konto välistamise, tasumisele kuuluva summa, arve- ja viitenumbri, kuupäevad ning vastuoluliste või vigaste väärtuste tühjaks jätmise. Päris sünteetilise PDF-i test kontrollib tekstist väljade lugemist. Kohalik ja käsitsi režiim ei kutsu testis ette antud AI-teenust. Tarnija salvestatud andmete kasutamist kontrolliti ka `pdf-text-local` allikaga.

Pakendatud Windowsi EXE test luges ilma API-võtmeta PDF-ist tarnija nime, IBAN-i, arve numbri, maksetähtpäeva ja tasumisele kuuluva summa. Dokumendis olid eraldi vahesumma, käibemaks ja juba tasutud summa. Arve jäi kontrollimist ootama. Ingliskeelses liideses käsitsi sisestamise valimisel sama PDF-i maksevälju ei täidetud.

Privaatsusaudit kontrollis 1966 ressursifaili. Uusi teeke ega andmebaasi migratsioone ei lisatud. Kohalik OCR ei kuulu sellesse versiooni: skannid, fotod, keeruline paigutus ja tundmatud nimetused võivad vajada käsitsi täitmist. Kõik testid kasutasid sünteetilisi andmeid; tegelike kasutajaarvete täpsust ja internetipanga importi ei testitud.

Eraldi regressioonikontroll välistab üksikute tabelipealkirjade (nt „Invoice date”) lugemise arvenumbriks. Parandusega EXE läbis kohaliku impordi töövootesti uuesti. Windowsi faililuku tõttu koostati lõplik pakett kaustas `release/build-0.6.0`; kasutaja avatud programmi ei suletud. Pakkimise audit ja ZIP-skript toetavad selleks `ARVE_RELEASE_DIR` muutujat; testile saab anda `ARVE_TEST_EXE` tee.

Lahtipakitud lõplik programm on 548 994 361 baiti (0.5.0: 548 984 639 baiti), kasv 9722 baiti. Installer on 155 383 213 baiti. Uut mahukat käituskeskkonda ei lisandunud.

Lõplik 212 645 061 baidi suurune ZIP pakiti projekti välisesse ajutisse kausta. Sealt läbisid kontrolli nelja panga XSD-eksport, PDF-i teksti lugemine ja PNG-renderdus, mudelivalikud ning eraldi kohaliku PDF-lugemise töövootest. Väljalaskefailid kopeeriti `release/` kausta ning SHA256 kontrollsummad uuendati.

## 0.7.0 kontroll – 13.10.2026

112 automaattesti 22 failis, TypeScript, ESLint ja tootmisversiooni ehitus läbisid kontrolli. Kohalik lugeja kasutab nüüd PDF-i tekstide koordinaate: taastab read ja veerud, seob nimetused väärtustega ning eristab tarnija infot ostja infost. Testid katavad ka jaluses oleva tarnija, tasumisele kuuluva summa eelistamise, mitme konto valiku säilitamise ja ebaselge summavormingu tühjaks jätmise.

Kasutaja kuut näidisarvet kontrolliti kohalikult ning uuesti pakendatud Windowsi programmis eraldi testandmebaasis. Kõigil kuuel leiti tarnija nimi, arvenumber, arve kuupäev ja maksetähtpäev; viiel leiti summa ja valuuta. Ühe arve kolme komakohaga summa ning puuduva selge valuuta tõttu jäid need kaks välja käsitsi täitmiseks. Neljal arvel oli mitu kehtivat pangakontot; programm säilitab valikud ega vali kontot ise. Päris arveid ei saadetud AI-teenusele ega lisatud väljalaskepaketti.

Windowsi töövootest kontrollis võtmeta lugemist, kohustuslikku ülevaatust, konto valikut ja selle säilimist, käsitsi režiimi ning ingliskeelset liidest. Testskriptis lisati enne järgmist importi impordivaatesse naasmine; pärast seda läbis töövootest kontrolli. Andmebaasi migratsioon lisab olemasolevatele arvetele tühja kontovalikute loendi ega muuda nende makseandmeid. Kasutaja tegelikku andmebaasi testides ei kasutatud.

Paketi privaatsusaudit läbis 2345 ressursifaili. Kasutatakse juba olemas olnud PDF.js teeki, mis on nüüd ka otsene sõltuvus. Kohalik OCR ei lisandunud. Installer koostati, kuid paigaldusviisardit ja internetipankade importi selles kontrollis ei läbitud.

Lõplik ZIP pakiti lahti väljaspool projekti. Kontrolli läbisid käivitumine, andmekausta asukoht, mudelivalikud, kõigi nelja panga XSD-eksport, PDF-teksti lugemine ja PNG-renderdus. Samast ZIP-ist käivitatud programm läbis ka kohaliku lugemise ning konto valiku salvestamise testi. Üldtesti arverea otsing muudeti failinimelt tuvastatud arvenumbrile.

ZIP-i maht on 218 119 155 baiti, installeri maht 160 040 510 baiti ning lahtipakitud programmi maht 566 096 798 baiti. SHA256 kontrollsummad on failis `release/SHA256SUMS.txt`. Olemasolevaid arveid automaatselt uuesti ei analüüsita; uus lugeja rakendub uutel importidel.

## 0.7.1 kontroll – 13.10.2026

Parandatud on salvestatud tarnija puuduva IBAN-i lisamine kohaliku ja AI-lugemise järel ning olemasoleva arve nupuga „Kasuta salvestatud tarnijaandmeid”. Tarnija üheselt kattuv nimi lubab nüüd kasutada salvestatud andmeid ka ilma arvelt loetud registrikoodi või IBAN-ita. Vastuoluline registrikood ja mitu samanimelist tarnijat välistavad nime järgi automaatse täitmise. Nimi, registrikood ja aadressiväljad pärinevad salvestatud tarnijalt; üks salvestatud konto täidab puuduva IBAN-i. Mitut salvestatud kontot näidatakse valikuna. Arvelt juba loetud erinevat kontot ei kirjutata üle ega asendata selle BIC-i salvestatud teise panga BIC-iga.

Viga taasesitati kolme ebaõnnestuva regressioonitestiga enne parandust. Lõplikult läbisid kontrolli 117 testi 22 failis, TypeScript, ESLint ning tootmisversiooni ehitus. Pakendatud Windowsi programm läbis kohaliku lugemise töövootesti, sealhulgas tarnija salvestamise ja uue ainult nimega PDF-i importimisel IBAN-i pärimise. Test kinnitas algse tühja IBAN-i säilimise võrdluseks, tarnijaregistri märgistuse ja inimese kinnituse nõude. Testandmebaas oli eraldi; kasutaja andmeid ei muudetud ja AI-päringuid ei tehtud.

Lõplik 0.7.1 portable-ZIP läbis väljaspool projekti käivituse, nelja panga XSD-eksportide, PDF-teksti ja PNG-renderduse kontrolli. Samast ZIP-ist käivitatud programm läbis salvestatud tarnija IBAN-i pärimise töövootesti. Privaatsusaudit kontrollis 2345 ressursifaili. Installer koostati, paigaldusviisardit ei käivitatud. Väljalaskepaketid ja uuendatud SHA256 kontrollsummad asuvad `release/` kaustas.

## 0.7.2 kontroll – 14.10.2026

Koodiülevaatuse parandused on kirjeldatud failis SECURITY_REVIEW.md. 128 automaattesti 23 failis, TypeScript, ESLint ja tootmisversiooni ehitus läbisid kontrolli. Lisandusid summavormingu, vastuolulise tarnija nime/konto, PDF-renderduse suuruse ning imporditava andmebaasi struktuuri regressioonitestid. Tootmissõltuvuste audit andis 0 teadaolevat nõrkust; arendustööriistade allesjäänud hoiatused on dokumenteeritud. Windowsi paketi privaatsusaudit läbis 2339 ressursifaili.

Windowsi kohalik lugemine koos tarnija IBAN-i pärimisega ja eesti/inglise keele vahetamine ning taaskäivituse järel säilimine läbisid kontrolli. Kuue kasutaja näidisarve kohalik korduskontroll läbis samad oodatud väljad ja kontovalikud; arveid võrku ei saadetud. Valuutatähisele järgneva kooloni regressioon parandati ja lisati testikomplekti.
