# Uue panga lisamine

Pangaprofiilid asuvad `src/lib/bank-profiles/`. SEB, LHV, Coop Panga ja Swedbanki erinevused on oma failides; register on `index.ts`. Liidese pangavalikud, seadete lubatud väärtused, maksjakonto/BIC kontroll, saaja aadressireeglid, XML-i koostamine ja XSD kontroll kasutavad sama registrit. Olemasolevad panga ID-d säilivad, andmebaasi migratsiooni see ümberkorraldus ei vaja.

Coop Panga ja Swedbanki ametlikud allikad, skeemide kontrollsummad ning katsetamata internetipanga impordi staatus on dokumenteeritud vastavates `docs/bank-specs/` kaustades. Mõlemad kasutavad praegust .09 formaati. Profiil saab määrata saaja nime pikkuse ning siseriikliku selgituse ja viite kogupikkuse. `referenceDescription: "domestic-unstructured"` tähendab, et Eesti maksel väljastatakse Ustrd ja Strd; välisriigi kontole viitega maksel ainult Strd. Muudel profiilidel säilib AddtlRmtInf.

## Uus pain.001.001.09 pangaprofiil

1. Hangi panga ametlik impordispetsifikatsioon, originaalne XSD koos kõigi imporditud skeemidega ja panga kinnitatud näidisfail. Ära kopeeri teise panga reegleid ilma kontrollimata.
2. Pane skeemid `docs/bank-specs/<pank>/xsd/` kausta ja lisa näidisfail oma `golden/` kausta.
3. Lisa `src/lib/bank-profiles/<pank>.ts`, mis rakendab `BankProfile` liidest. Määra BIC, Eesti kontode pangakoodid, aadressinõuded, XML-i erisused, põhiskeem ja imporditud skeemide täpsed nimed ning kohalikud failiteed. `null` tähendab XML-elemendi puudumist; `false` tähendab sõnaselget väärtust `false`.
4. Lisa profiil `bankProfiles` registrisse. Pangavalik, seadete valideerimine ning standardadapter lisanduvad automaatselt. Failinimes ja andmebaasis kasutatakse stabiilset registrivõtit.
5. Lisa panga konto ja oodatud erisused testidesse. Testi puuduvat kohustuslikku välja, vale panga kontot, vigast XML-i, puuduvaid skeeme, mitut maksepäeva, summasid ja viiteid. Olemasolevad SEB/LHV testid peavad jääma roheliseks.
6. Koosta Windowsi pakett ja kontrolli ka portable-versioonis XML-i loomist. Pakendaja lisab kõigi pangakaustade `xsd/` sisu automaatselt; Nexti failijälitus katab sama struktuuri.
7. Tee kontrollitud internetipanga import ja dokumenteeri tulemus. XSD läbimine ei võrdu panga impordi kinnitusega; kuni katseni peab profiili `importNote` seda ütlema.

## Kui formaat erineb

Ühine `Pain001BankAdapter` toetab praegust EUR pain.001.001.09 maksetöövoogu. Ainult nimeruumi muutmine ei tee sellest teise ISO-versiooni adapterit. Oluliselt erineva XML-i korral rakenda `BankAdapter` liides eraldi moodulis ja registreeri see `banks.ts` adapteriregistris vastava ID all. Vajadusel laienda profiili nõuetega koos testidega; ära lisa ühisesse koodi panganimede võrdlusi. Välisvaluuta või täiesti uute makseandmete tugi nõuab eraldi domeenimuudatust.

Skeemid peavad olema kohalikud. Kontrollija lubab ainult profiilis kirjeldatud lisaskeemid ning ebaõnnestunud või puuduva XSD korral jääb eksport blokeerituks. Kasutajaliidesest ei saa suvalisi skeeme ega pangakoode aktiveerida.
