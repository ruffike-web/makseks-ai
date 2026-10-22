# Materjalide kontroll — 06.10.2026

## Hilisem dokumentatsioonimärge — 22.10.2026

Allolev 06.10.2026 audit on säilitatud muutmata. LHV ametlik lisaskeem ühendati validaatoriga 07.10.2026, nagu kirjeldab [rakenduse kontrolliraport](IMPLEMENTATION_VALIDATION.md). Kasutaja on nüüd kinnitanud nii SEB kui ka LHV `pain.001.001.09` XML-maksefailide eduka impordi internetipanka; Coop Panga ja Swedbanki tegelik import on endiselt kontrollimata. See kasutajakinnitus ei ole ametlik pangapoolne sertifitseerimine. [Praegune impordistaatus ja kinnituse ulatus](bank-specs/README.md#praegune-impordistaatus).

## Algse auditi tulemused — 06.10.2026

Originaale ei muudetud. Topelt kleebitud prompti arvestatakse ühe korra. Ametlikud skeemid ja näited on ülimuslikud GPT loodud näidete suhtes.

- Leitud SEB algne skeem ja kolm ametlikku näidet Downloads/XML_message_examples_and_XSD-s kaustast. Kõik kolm näidet ja SEB golden läbisid lxml 6.1.1 XSD valideerimise.
- LHV pain.001.001.09.xml on XSD, mitte maksefail. Skeem impordib puuduvat supl.001.001.01.xsd faili. Täisvalidatsioon ebaõnnestub selle puudumise tõttu. Varasema raporti stub-validatsioon ei tõenda panga täieliku skeemi läbimist; stubi rakendusse ei lisata.
- LHV ametlik bulk-näide kasutab Prtry=SEPA tehingu juures, GPT golden grupi juures. PaymentInstruction30 lubab PmtTpInf elementi ja PaymentTypeInformation26 lubab vastavat väärtust ka grupi tasemel. MVP järgib golden grupi paigutust, et kõik grupi EUR-maksed jagaksid tunnust. Päris panga aktsepteerimine vajab eraldi kontrolli.
- Bulk-näide sisaldab ka GBP-makset ja korduvaid identifikaatoreid; neid ei kopeerita MVP ärireegliteks. Rakendus lubab EUR ning loob unikaalsed tehnilised ID-d.
- Golden failide IBAN-kontrollsummad on õiged, kuid näidiskontod ja BIC-id pole tõend reaalsest konto kuuluvusest või pangas aktsepteerimisest. Need ei lähe kasutaja seadete vaikimisi väärtusteks.
- PstlAdr on SEB-s valikuline, kuid olemasolul on linn ja riik kohustuslikud. Osalist aadressi ei täideta oletustega ega jäeta märkamatult ära.
- Struktureeritud viide + AddtlRmtInf läbib SEB skeemi. Mõlema panga internetipangas nähtav esitus vajab päris impordikatset.
- Rakendus nõuab kõigi arvete käsitsi kinnitamist. Muudetud konto ja võimalik duplikaat vajavad eraldi kinnitust. Üksnes AI usaldusskoor ei luba eksporti.

Päris SEB/LHV impordikatseid pole tehtud.

## Testides selgunud sisulised vead

- GPT golden viitenumber `1231241` ei läbi 7–3–1 kontrolli: tüve kaalutud summa on 63, kontrollnumber peaks olema 7. Originaal säilib; sünteetilises positiivses testis kasutatakse `1231247`. Rakendus ei paranda kasutaja viitenumbrit automaatselt.
- Golden IBAN-id läbivad MOD97, kuid ei läbi Eesti BBAN-i kohalikku kontrolli (ibantools). XSD kontrollib formaati, mitte neid ärireegleid. Positiivsetes testides kasutatakse eraldi kehtivate kontrollsummadega testkontosid, mitte golden nullidega kontosid.
- Golden maksjakonto pangatunnus `22` ei ühti ei SEB ega LHV profiiliga. Payer kontroll blokeerib Eesti konto ja valitud panga vastuolu.
