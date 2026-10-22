# Panga algmaterjalid ja impordikatse

## Praegune impordistaatus

Dokumentatsioonimärge 22.10.2026, alus: kasutaja kinnitus selles vestluses. Kasutaja kinnitas, et nii SEB kui ka LHV `pain.001.001.09` XML-maksefailide tegelik import internetipanka õnnestus.

| Pank | Tegelik import internetipanka |
| --- | --- |
| SEB | Õnnestus kasutaja kinnituse põhjal. |
| LHV | Õnnestus kasutaja kinnituse põhjal. |
| Coop Pank | Endiselt kontrollimata. |
| Swedbank | Endiselt kontrollimata. |

See on kasutaja teatatud imporditulemus, mitte ametlik pangapoolne sertifitseerimine. Kinnitus ei tõenda automaatselt kõigi allpool loetletud testjuhtumite läbimist, viite/lisaselgituse iga esitusviisi ega maksete tegelikku tasumist. Impordikatsete täpseid kuupäevi, faile ja juhtumite loendit selle kinnitusega ei esitatud; ülal on dokumentatsioonimärke kuupäev. Allolevad juhised jäävad edasiste impordikatsete jaoks kehtima.

Allikate täpsustus: SEB ja LHV `golden/` sisaldavad GPT struktuurinäiteid; [Swedbanki](swedbank/README.md) `golden/` sisaldab panga ametlikke näiteid. [Coop Panga](coop/README.md) `golden/` sisaldab panga varasema `.03` vormingu näiteid, mida ei kasutata `.09` valideerimise tõendina. Skeemide ja näidiste allikad on kirjeldatud iga panga alamkausta README-s.

## Algmaterjalide varasem kirjeldus

Kontrollitud 06.10.2026. Failid on kasutaja allalaadimiste koopiad, muutmata kujul. `golden` tähistab GPT koostatud struktuurinäiteid, mitte päris makseandmeid. Nende vigade kohta vt `../BANK_AUDIT.md`.

## SEB

1. Seadista enda SEB ettevõtte nimi ja tegelik maksjakonto.
2. Sisesta üks kokkulepitud testmakse tegelike andmetega, kinnita ja genereeri XML. Tee eraldi kontroll viiteta ja korrektse viitega arve jaoks.
3. Logi SEB internetipanka, vali õige ettevõte ning maksete import / failist lisamine (menüü nimi võib erineda).
4. Vali genereeritud XML. Kontrolli maksete arvu, kontot, summasid, kuupäevi, viidet ja selgitust impordi eelvaates.
5. Märgi testi tulemusse faili nimi ja impordi vastus. Ära kinnita ega allkirjasta testmakseid, kui nende tegelikku tasumist pole eraldi otsustatud.

## LHV

1. Seadista enda LHV ettevõtte nimi ja tegelik maksjakonto.
2. Korda sama testmaksete komplekti. Rakendus teeb täieliku XSD kontrolli; see ei asenda internetipangas impordi kontrollimist.
3. Logi LHV internetipanka, vali õige ettevõte ja maksete import, laadi XML.
4. Kontrolli eriti `Prtry=SEPA`, viite ja lisaselgituse nähtavust ning teenustasusid/SHAR käsitlust.
5. Säilita panga impordi veateade või eduteade. Ära allkirjasta testmakseid ilma tegeliku tasumise otsuseta.

## Mõlema panga testkomplekt

- üks makse ilma viiteta;
- üks makse korrektse numbrilise viitega;
- kümme makset samale päevale;
- maksed kolmele erinevale päevale, kontrollides iga grupi ja kogu faili summat;
- täpitähed ning `&` saaja nimes;
- struktureeritud/hübriidaadress koos linna ja riigiga;
- maksetähtpäeva ületanud arve, mille maksekuupäevaks tuleb Eesti tänane kuupäev.

## Ajalooline impordimärge

Järgnev 07.10.2026 märge on säilitatud muutmata; praegune staatus on lehe alguses.

Päris impordi staatus 07.10.2026: SEB **õnnestus kasutaja kinnituse põhjal**, LHV **tegemata**. Rakendus ei tohi väita, et pangad on tootmiskasutuseks sertifitseeritud.
