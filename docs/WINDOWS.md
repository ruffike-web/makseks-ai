# Makseks AI Windowsis

[Eestikeelne tutvustus](../README.md) · [English guide](WINDOWS.en.md)

## Käivitamine

- **Kiire portable (soovitatav):** paki `release/Makseks-AI-0.7.3-portable-kiire.zip` täielikult lahti ja käivita kaustast `Makseks AI.exe`. Edaspidi pole vaja programmi uuesti lahti pakkida. Hoia kõik failid koos, sealhulgas `Makseks-AI.portable`.
- **Paigaldatav:** käivita `release/Makseks-AI-0.7.3-setup.exe` ja vali paigalduskaust. Edaspidi ava Makseks AI Start-menüüst.
- **Ühe EXE portable:** `release/Makseks-AI-0.7.3-portable.exe` pakib programmi igal käivitusel ajutisse kausta ning on seetõttu aeglasem. Kiiremaks käivituseks kasuta ZIP-versiooni või installerit.

Paketid on Windows x64 jaoks. Node.js, kohalik server ja pangaskeemid on kaasas. Käsitsi sisestamine, kontroll ja maksefailide loomine töötavad internetita; AI vajab internetti. Programm ei algata makseid. EXE on allkirjastamata: Windows SmartScreen võib kuvada tundmatu avaldaja teate.

## Seniste andmete säilitamine

Portable-versiooni andmed asuvad EXE kõrval kaustas `Makseks-AI-andmed`. Varasemalt portable-versioonilt uuele üle minnes sulge vana programm ning kopeeri vana `Makseks-AI-andmed` uue EXE kõrvale. Nii säilivad andmebaas ja API-seaded. Versioon 0.7.3 krüpteerib varasemad võtmed automaatselt. Teise arvuti või Windowsi kasutaja all sisesta võtmed uuesti; arved ja tarnijad säilivad. Ära kirjuta juba kasutuses andmekausta üle ilma varukoopiata. Installeri uuendus säilitab `%APPDATA%\Makseks AI` andmed.

Varasema veebirakenduse andmete toomiseks:

1. Sulge varasem rakendus ja lõpeta pooleliolevad muudatused.
2. Ava Windowsi programmis **Fail → Impordi olemasolev andmebaas…**.
3. Vali senise projektikausta `data/app.db`.
4. Kinnita import. Programmi praegustest andmetest tehakse varukoopia, seejärel asendatakse need valitud andmebaasi koopiaga. Algset faili ei muudeta.

Üle tulevad ettevõtted, seaded, arved, tarnijad ja ekspordiajalugu. API-võtmed ei ole andmebaasis; andmebaasi importimisel sisesta need eraldi. Algdokumendi ajutised eelvaated ei kuulu andmebaasi.

## Keelevalik

Ava **Seaded → Keel / Language** ning vali **Eesti** või **English**. Kasutajaliides ja Windowsi menüüd vahetavad keelt kohe. Valik salvestub andmekausta failis `ui-preferences.json` ja kehtib kõigile ettevõtetele. Ettevõtete ja tarnijate nimesid ning arvete andmeid ei tõlgita. Keele muutmine ei muuda makseandmeid ega tühista arvete kinnitusi.

## Kohalik lugemine ilma AI-teenuseta

Impordivaates vali **Andmete lugemine → Kohalik lugemine — ilma AI-teenuseta** ja lisa PDF. See on impordi vaikimisi valik. Programm otsib tekstiga PDF-ist eesti- ja ingliskeelsete väljade nimetuste järgi tarnija nime, registrikoodi, IBAN-i/BIC-i, arve- ja kliendinumbrit, viitenumbrit, kuupäevi ning selgelt märgitud tasumisele kuuluvat summat ja valuutat. Arvutist andmeid välja ei saadeta ning API-võtit ega internetti pole vaja.

Versioon 0.7.3 arvestab PDF-i tekstide tegelikku paiknemist, veerge ja jalust. Mitme konto korral kuvatakse arve kontrollis valik **Tarnija pangakontod**. Vali sobiv konto ja salvesta muudatused. Ebaselge summavorming jääb käsitsi täitmiseks. Varem imporditud arvete andmeid uuesti ei loeta; parandatud lugemist kasutatakse uutel importidel.

Kui arve nimi ja konto viitavad eri salvestatud tarnijatele, tuleb vastuolu enne kinnitamist parandada.

Tarnija üheselt kattuva konto, registrikoodi või nime puhul kasutatakse aktiivse ettevõtte tarnijaregistris salvestatud andmeid: nime, registrikoodi, aadressivälju ning sobiva konto BIC-i. Puuduv IBAN täidetakse, kui tarnijal on üks salvestatud konto. Mitme salvestatud konto korral kuvatakse kontovalikud; arvelt juba loetud erinev IBAN jääb kontrollimiseks alles. Juba imporditud arvele saab andmed lisada nupuga **Kasuta salvestatud tarnijaandmeid**. Mitmetähenduslikud väärtused jäävad tühjaks. Programm ei arvuta tasutud osa maha ega vali ise mitme konto vahel. Kõik leitud makseandmed tuleb üle kontrollida ja arve kinnitada.

Pildid ja skannitud PDF-id vajavad käsitsi sisestamist või AI-lugemist; kohalik OCR ei kuulu sellesse versiooni. Ka keerulise paigutuse või tundmatute väljade nimetustega tekstiga PDF võib vajada käsitsi täitmist. Kohalik lugeja töötleb kuni 20-leheküljelisi, kuni 100 000 tekstimärgiga PDF-e; suurema dokumendi puhul jääb käsitsi kontroll alles. Ainult võrdluseks faili importimiseks vali **Käsitsi sisestamine**. AI kasutamiseks vali impordivaates **AI lugemine**; selleks peavad seadetes olema võti ja aktiivse ettevõtte nõusolek.

## AI-võti ja mudel

Ava **Seaded → AI ühendus**, vali **Google Gemini**, **OpenAI (ChatGPT mudelid)** **Anthropic Claude**, **Groq** või **Mistral Document AI**, määra mudel ning sisesta selle teenuse API-võti. **Kontrolli võtit ja laadi mudelid** toob teenuse mudeliloendi; mudeli ID saab ka käsitsi sisestada. Seejärel vajuta **Salvesta AI seaded**. Mudeli nimi loendis ei taga iga funktsiooni tuge või piisavat kvooti; lugemisvead kuvatakse impordis.

Teenusepakkuja ja mudel on kõigil ettevõtetel ühised; iga teenuse võti säilib eraldi. Arvete automaatse lugemise luba on ettevõtte kaupa eraldi. Teenusepakkuja vahetamisel lülitatakse automaatne lugemine välja; luba see soovitud ettevõttes uuesti sisse. Salvestatud võtme väli jääb tühjaks; see ei tähenda võtme kadumist. Tühi sisestus säilitab valitud teenuse võtme. **Eemalda võti** eemaldab selle teenuse võtme. Muutus rakendub taaskäivituseta. Versiooni 0.2.0 Gemini seaded loetakse automaatselt sisse.

## Pangad

Valikus on SEB, LHV, Coop Pank ja Swedbank (endine Hansapank). Kõigi maksefailidele tehakse kaasapandud skeemidega kohalik XSD kontroll. Kasutaja on kinnitanud SEB internetipanga importi; LHV, Coop Panga ja Swedbanki tegelik internetipanga import vajab veel kontrollimist. Rakendus toetab EUR tarnijamakseid.

## Andmed ja varundamine

**Fail → Ava andmekaust** avab õige kausta: paigaldatud programmil `%APPDATA%\Makseks AI`, portable-versioonil EXE kõrval `Makseks-AI-andmed`.

`app.db` sisaldab tööandmeid. `ai-config.json` sisaldab mudelivalikuid ja Windowsi kasutajakontoga seotud krüpteeritud API-võtmeid. Esimesel käivitamisel viiakse varasemad võtmed automaatselt krüpteeritud kujule ilma lihttekstivarukoopiat loomata. Krüpteerimise vea korral uut võtit lihttekstina ei salvestata. Kui salvestatud võtit ei saa avada, näed seadetes teadet ning saad selle uuesti sisestada või eemaldada. Arved ja tarnijad jäävad kasutatavaks. Ära jaga andmekausta. Vanades varukoopiates võivad võtmed endiselt olla krüpteerimata; uue versiooni käivitamine neid koopiaid ei muuda. Väljalaskepaketid ei sisalda sinu arveid, andmebaasi ega võtmeid.

Sulge programm enne andmekausta varundamist või teise arvutisse kopeerimist. Kiire portable-versiooni teisaldamisel võta kaasa kogu lahtipakitud programmikaust koos andmekaustaga. Sama andmekausta ära kasuta korraga mitmes arvutis ega paiguta aktiivset andmebaasi võrgukettale. Andmebaasi uuendamise ja asendava impordi eel tekib `backups/` kausta koopia. Programmi eemaldamine ei kustuta paigaldatud versiooni andmekausta.

## Arendajale

`npm.cmd run desktop:pack` koostab installer-EXE, ühe faili portable-EXE ja kiire portable-ZIP-i ning kontrollib privaatsete failide puudumist. Käivita Node 24-ga; kaasapandav Node peab vastama `better-sqlite3` binaari ABI-le.

`npm.cmd run desktop:smoke` kontrollib pakendatud EXE-d sünteetiliste andmetega. `npm.cmd run desktop:portable-smoke -- --fast` kontrollib ZIP-i lahtipakkimist, iseseisvat käivitumist, kõigi nelja panga eksporti ning PDF-i lugemist väljaspool projekti teeke. Ilma `--fast` võtmeta testitakse ühe faili portable-versiooni.

`npm.cmd run desktop:language-smoke` kontrollib keele kohest vahetumist, poolelioleva vormi säilimist, Windowsi menüüsid ja keelevaliku säilimist programmi taaskäivitamisel.

`npm.cmd run desktop:local-smoke` kontrollib võtmeta kohaliku PDF-i lugemist, tasumisele kuuluva summa eristamist, kohustuslikku ülevaatust ning käsitsi sisestamise valikut eesti ja inglise liideses.

Pakendamisel eemaldatakse ainult silumise lähtekaardid, kasutamata teiste andmebaaside Prisma mootorid ja Electroni muud keeled. Alles jäävad eesti/inglise keel, SQLite, PDF-i fondid ja lugemiseks vajalikud failid. Tugevam tihendus vähendab allalaaditavat paketti; ehitamine võtab seetõttu kauem aega.

Electron kuvab kohaliku Next-serveri vaadet. Server töötab eraldi kaasapandud Node protsessis, kuulab juhuslikku 127.0.0.1 porti ning API nõuab käivitusepõhist salajast päist. Server suletakse programmi väljumisel. Brauseriaknas on Node-integratsioon välja lülitatud, liivakast ja konteksti isolatsioon sisse lülitatud.



Groqi mudel qwen/qwen3.8-27b toetab JPG/PNG pilte ja kuni 3-leheküljelisi PDF-e. Pikema arve jaoks vali teine teenusepakkuja. Mistrali ühenduses vali OCR-mudel (mistral-ocr-latest). Tasuta kasutus sõltub teenuse kontopiiridest; Mistrali tasuta konto ei taga tasuta Document AI kvooti. Ühenduste valik on Seaded → AI ühendus.
