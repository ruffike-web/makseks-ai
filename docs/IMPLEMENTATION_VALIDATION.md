# Rakenduse kontrolliraport

## Hilisem dokumentatsioonimärge — 22.10.2026

Kasutaja on kinnitanud nii SEB kui ka LHV `pain.001.001.09` XML-maksefailide eduka impordi internetipanka. Coop Panga ja Swedbanki tegelik import on endiselt kontrollimata. Kinnitus ei ole ametlik pangapoolne sertifitseerimine; [kinnituse ulatus ja praegune staatus](bank-specs/README.md#praegune-impordistaatus) on eraldi dokumenteeritud. Allolevad 07.10.2026 tulemused, sealhulgas tollased tegemata impordikatsete märkused, on säilitatud muutmata. Uus märge ei lisa ajaloolistele testidele tagantjärele tulemusi.

## Ajalooline kontrolliraport — 07.10.2026

Kuupäev: 2026-10-07. Kontrollitud kohalikus Windowsi keskkonnas.

## Viimane täiendus: mitu ettevõtet

Lisatud ettevõtte loomine ja valik päises. Maksja seaded, arved, tarnijad ja ekspordiajalugu on firmapõhised. API nõuab valitud ettevõtte ID-d; tundmatu või puuduv ID lükatakse tagasi. Firma vahetamine loob uue kliendi töövaate ja tühjendab varasema firma eelvaated ning valikud. Vahelehtede valikud on sõltumatud.

48 automaattesti, 4 tootmisversiooni Edge’i töövootesti, build/TypeScript ja lint läbisid kontrolli. Testid kontrollivad teise firma arve muutmise, kinnitamise, kustutamise, tarnija muutmise ja ekspordi tõrjumist, duplikaadiajaloo ning registri eraldamist, kahe vahelehe sõltumatust ja migratsiooni andmete säilimist. Sõltumatu koodiülevaatus ei leidnud olulisi vigu.

Kasutaja andmebaas varundati enne migratsiooni `data/backups` kausta. Pärast migratsiooni võrreldi iga varasema tabeli andmete räsi: säilisid 1 ettevõtte seaded, 7 arvet, 6 tarnijat ja 1 ekspordikirje; kõik määrati algse ettevõtte alla. Pangakontosid ega makseandmeid ei muudetud.

## Viimane täiendus: LHV täielik XSD kontroll

07.10.2026 ühendati LHV ametlik lisaskeem ekspordivalidaatoriga. Varasemad allpool kirjeldatud puuduliku LHV skeemi piirangud on lahendatud. Mõlemad pangad kasutavad kohalikku XSD kontrolli; skeemiviga või puuduv skeemifail blokeerib ekspordi. Vana LHV hoiatus ja nõusolekukast eemaldati.

Kontrollid: 46 automaattesti, 3 tootmisversiooni Edge’i töövootesti, build koos TypeScripti kontrolliga ja lint läbisid kontrolli. LHV testid hõlmavad genereeritud ja golden XML-i, vigast maksemeetodit, puuduvat kohustuslikku elementi, valet nimeruumi, keelatud DTD-d ning lisaskeemi korrektset ja vigast sisu. Teenuse test kinnitab, et ebaõnnestunud valideerimine ei salvesta ekspordikirjet. Brauseritest kontrollib LHV eksporti ilma vana nõusolekuta ja kolme kuupäevagrupi summat.

Päris LHV internetipanga impordikatse on endiselt tegemata.

## Tulemused

- 37 automaattesti läbisid kontrolli (5 testifaili).
- 3 Edge’i brauseritesti läbisid kontrolli tootmisversiooni vastu: SEB seadistamine, arve kinnitamine, tarnija salvestamine ja XML allalaadimine; PDF/PNG import koos vigase faili eraldamisega; LHV kolme maksepäeva eksport ja puuduliku skeemi kinnitus.
- TypeScripti kontroll, ESLint ja Next.js tootmisversiooni ehitamine läbisid kontrolli.
- SEB genereeritud XML läbib kaasasoleva originaalse XSD kontrolli.
- Vaadati üle töölaua ja mobiili kuvad; mobiilis kontrolliti horisontaalse ülevoolu puudumist.
- Sõltumatu koodiülevaatuse leiud parandatud ja regressioonitestidega kaetud: kinnituse seos nähtud seadistustega, eksporditud arvete duplikaadiajalugu ja kliendinumbri säilimine makseselgituses.

Brauseritestid kasutavad eraldi `data/e2e.db` andmebaasi. Kasutaja andmebaasi testandmeid ei lisatud.

## Kontrollimata või piiratud

- LHV täielik XSD kontroll vajab originaalset `supl.001.001.01.xsd` faili. Rakendus näitab piirangut ja nõuab LHV ekspordil eraldi kinnitust. Asendusskeemi ei loodud.
- Tegelikku SEB või LHV internetipanga importi pole tehtud.
- Gemini päringut päris API võtmega pole tehtud. Kontrollitud on vastuste valideerimine ning võtme puudumise ja teenuse vea korral käsitsi jätkamine.
- Sõltuvuste audit tuvastas 9 kõrge taseme transitiivset arendustööriistade leidu. Neid ei loeta lahendatuks; täpsem selgitus on README-s.

Panga algfailide vastuolud on kirjeldatud failis `BANK_AUDIT.md`. Enne päris maksete kasutust järgi `bank-specs/README.md` importimise kontrollnimekirja.

## Täiendus 07.10.2026: tarnijad ja ekspordi olek

- Kasutaja kinnitas SEB internetipanga edukat importi. LHV päris import jääb kontrollimata.
- Tarnija nime, registrikoodi, aadressi ja kinnitatud kontode muutmise vorm lisatud; parandatud nime/aadressi automaatne kasutamine uutel AI-importidel eeldab ühest registrikoodi või IBAN-i vastet. Erinevat arvel olevat kontot ei kirjutata üle.
- „Valmis arved” sisaldab ka eksporditud arveid. Uutel eksportidel salvestatakse täpne arveversioon; muutmine tühistab lõpetatud oleku. Sama makse juhuslik korduseksport jääb blokeerituks.
- PDF antakse AI-le visuaalselt koos kohaliku tekstiga. Juhis nõuab ka logo/ päise vaatamist, ei luba puuduva nime asendamist ostja nimega; server eemaldab automaatselt maksja nimega kattuva AI saajanime. Konkreetse logoga pärisarve uut AI-tulemust pole selles kontrollis katsetatud.
- 44 automaattesti, 3 tootmisversiooni Edge’i töövootesti, TypeScript/production build ja ESLint läbisid kontrolli. Brauseritest hõlmab tarnija parandamist ning eksporditud arve leidmist valmis arvete alt.
- Ülevaatuses eemaldati ajalise läheduse põhjal ekspordiversiooni oletamine. Üldine migratsioon ei omista vanadele arvetele versiooni. Selle kasutaja kinnitatud seitsme eksporditud arve lõpetatuse märge säilitati kohalikus andmebaasis; sellest tehti enne uuendust varukoopia kausta `data/backups`.
