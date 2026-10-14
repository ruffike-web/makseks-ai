# Panga algmaterjalid ja impordikatse

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

Päris impordi staatus 07.10.2026: SEB **õnnestus kasutaja kinnituse põhjal**, LHV **tegemata**. Rakendus ei tohi väita, et pangad on tootmiskasutuseks sertifitseeritud.
