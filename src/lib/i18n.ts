// UI copy is keyed by its original Estonian text. User-entered data is never passed here.
export type Language = "et" | "en";
const entries = `
PDF-i lehekülje mõõtmed on pildiks teisendamiseks liiga suured. Kasuta teist teenusepakkujat või sisesta andmed käsitsi.|The PDF page dimensions are too large to render. Use another provider or enter the details manually.
Tarnija nimi ja IBAN viitavad eri salvestatud tarnijatele. Kontrolli algdokumenti ning paranda nimi või konto.|The supplier name and IBAN identify different saved suppliers. Check the original document and correct the name or account.
Tarnija pangakontod|Supplier bank accounts
Vali saaja konto|Select recipient account
Arvelt või tarnijaregistrist leiti mitu kontot. Vali õige konto ja salvesta muudatused; valik ei kinnita arvet automaatselt.|Multiple accounts were found on the invoice or in saved supplier details. Select the correct account and save changes; selecting an account does not approve the invoice automatically.
Andmete lugemine|Data reading
AI kasutamiseks sisesta API-võti ülal ja salvesta. Võtmeta saad kasutada kohalikku PDF-i lugemist või käsitsi sisestamist.|To use AI, enter and save an API key above. Without a key, you can use local PDF reading or manual entry.
PDF-i tekstist ei leitud üheselt loetavaid makseandmeid. Sisesta andmed käsitsi või vali AI lugemine.|No unambiguous payment details were found in the PDF text. Enter details manually or select AI reading.
Kohalik lugemine — ilma AI-teenuseta|Local reading — without an AI service
AI lugemine|AI reading
Käsitsi sisestamine|Manual entry
Loeb tekstiga PDF-i selles arvutis. Võtit ega internetti pole vaja. Pildid ja skannid tuleb täita käsitsi; kontrolli alati leitud andmeid.|Reads text PDFs on this computer. No key or internet is needed. Images and scans require manual entry; always check the extracted details.
Arve saadetakse seadetes valitud AI-teenusele.|The invoice is sent to the AI service selected in settings.
Fail jääb võrdluseks; makseandmed sisestad ise.|The file is kept for comparison; you enter the payment details.
Kohalik lugemine on kasutusvalmis. AI lugemise saad lubada seadetes.|Local reading is ready. You can enable AI reading in settings.
AI lugemine vajab API-võtit ja selle ettevõtte nõusolekut seadetes.|AI reading requires an API key and this company's consent in settings.
Andmed loeti kohalikult PDF-i tekstist ilma AI-teenuseta. Kontrolli kõiki makseandmeid; ebaselged väljad tuleb täita käsitsi.|Details were read locally from PDF text without an AI service. Check all payment details; fill in unclear fields manually.
Kohalik lugemine vajab tekstiga PDF-i. Pildilt või skannilt andmeid ei loeta. Sisesta andmed käsitsi või vali AI lugemine.|Local reading requires a text PDF. Images and scans are not read. Enter details manually or select AI reading.
Sisesta arve andmed käsitsi.|Enter the invoice details manually.
Toiming ebaõnnestus.|Action failed.
AI ühendus|AI connection
Groq: Qwen 3.8 loeb JPG/PNG pilte ja kuni 3-leheküljelisi PDF-e. PDF-i leheküljed teisendatakse selles arvutis piltideks. Tasuta kvoot sõltub kontost.|Groq: Qwen 3.8 reads JPG/PNG images and PDFs of up to 3 pages. PDF pages are converted to images on this computer. Free quota depends on your account.
Mistral Document AI loeb PDF-i ja pilte OCR-mudeliga. Vali mistral-ocr mudel. Tasuta konto ei taga dokumendilugemise tasuta kvooti; kontrolli Mistrali konto kasutuspiire.|Mistral Document AI reads PDFs and images using an OCR model. Select a mistral-ocr model. A free account does not guarantee free document processing; check your Mistral account limits.
Teenusepakkuja ja mudel on ühised kõigile ettevõtetele. Iga teenuse API-võti salvestatakse eraldi selles arvutis; võtit ei kuvata tagasi brauseris ega lisata maksefaili.|The provider and model are shared by all companies. Each service's API key is stored separately on this computer; the key is never displayed in the browser or included in payment files.
AI teenusepakkuja|AI provider
Mudelite valik|Model selection
Praegune või käsitsi sisestatud mudel|Current or manually entered model
Ametliku kataloogi mudelid (09.10.2026). Ligipääs sõltub sinu API-kontost. Võtmega laadimine asendab loendi kontole nähtavate mudelitega.|Official catalogue models (09.10.2026). Access depends on your API account. Loading with a key replaces this list with models available to your account.
API-kontole nähtavad mudelid. Vali mudel ja salvesta AI seaded.|Models available to your API account. Select a model and save the AI settings.
AI mudel|AI model
Vali laaditud loendist või sisesta PDF-i ja piltide lugemist toetava mudeli tunnus. Loend on filtreeritud mudeliperekonna järgi; konkreetse mudeli võimalused ja ligipääs sõltuvad teenusest.|Select from the loaded list or enter the ID of a model supporting PDFs and images. The list is filtered by model family; individual capabilities and access depend on the service.
API-võti|API key
Võti on salvestatud; muutmiseks sisesta uus|Key saved; enter a new one to replace it
Sisesta selle teenuse API-võti|Enter this service's API key
Võti töötab mudelite loendi jaoks. Vali mudel ja salvesta; arve lugemist see kontroll ei käivita.|The key works for listing models. Select a model and save; this check does not process an invoice.
Kontrolli võtit ja laadi mudelid|Check key and load models
Arvete lugemine kasutab valitud teenuse API-t ja võib olla tasuline. ChatGPT või Claude vestluse tellimus ei asenda selle ühenduse API-võtit.|Invoice processing uses the selected service's API and may incur charges. A ChatGPT or Claude chat subscription does not replace the API key required for this connection.
Teenuse vahetamisel lülitatakse AI lugemine kõigis ettevõtetes välja. Luba allpool arveandmete saatmine uuele teenusele ja salvesta ettevõtte seaded.|Changing the service disables AI processing for all companies. Allow invoice data to be sent to the new service below, then save the company settings.
AI seaded salvestatud. Uus valik kehtib järgmistele importidele.|AI settings saved. The new selection applies to future imports.
Salvesta AI seaded|Save AI settings
Eemaldan selle teenuse salvestatud API-võtme?|Remove the saved API key for this service?
API-võti eemaldatud.|API key removed.
Eemalda võti|Remove key
Ettevõtte andmed puuduvad. Käivita andmebaasi seadistamine.|Company data is missing. Run database setup.
Proovi uuesti|Try again
Laadin ettevõtteid…|Loading companies…
Sisesta riigikood (nt EE)|Enter country code (e.g. EE)
Käsitsi sisestatud|Entered manually
Tarnijaregistrist|From supplier register
Arvelt loetud|Read from invoice
Arvelt loetud:|Read from invoice:
puudus|missing
ARVE KONTROLL|INVOICE REVIEW
Sulge arve|Close invoice
Salvestamata muudatused lähevad kaotsi. Sulgen arve?|Unsaved changes will be lost. Close the invoice?
Algdokument|Original document
Ava eraldi|Open separately
Üleslaaditud ostuarve|Uploaded purchase invoice
Algne ostuarve|Original purchase invoice
Algdokumendi eelvaade pole saadaval.|Original document preview is unavailable.
Üleslaaditud faili eelvaade säilib selle brauserilehe sulgemiseni. Kontrolli andmeid oma originaalarvelt.|The uploaded file preview remains available until this browser tab is closed. Check the details against your original invoice.
PDF-ist loetud tekst|Text extracted from PDF
Lisaandmed ja saaja aadress|Additional details and recipient address
Siin on tarnija ehk makse saaja aadress. Seadetes olev aadress kuulub maksjale. Riigikood tuleb sisestada; näidistekst ei ole salvestatud väärtus.|This is the supplier's address, as the payment recipient. The address in Settings belongs to the payer. Enter a country code; placeholder text is not a saved value.
Kasuta salvestatud tarnijaandmeid|Use saved supplier details
Makse kuupäev|Payment date
Vajab määramist|Needs to be set
Selgitus|Payment description
Kontrollisin võimalikku duplikaati või varasemat eksporti. Selle arve lisamine on tahtlik.|I checked the possible duplicate or previous export. I intend to include this invoice.
Kontrollisin tarnija muutunud pangakonto õigsust sõltumatult.|I independently verified the supplier's changed bank account.
Jäta tarnija andmed ja see konto kinnitatud tarnijaregistrisse meelde.|Remember the supplier details and this account in the verified supplier register.
Kontrollisin algdokumendilt saajat, IBAN-i, summat, kuupäeva ja makse selgitust.|I checked the recipient, IBAN, amount, date and payment description against the original document.
Salvesta muudatused, et uuendada kontrolli tulemusi ja arve kinnitada.|Save changes to update validation results and approve the invoice.
Salvesta muudatused|Save changes
Kinnita arve|Approve invoice
Kinnitus ei algata makset.|Approval does not initiate a payment.
Maksja ettevõte|Payer company
Need andmed lisatakse igasse maksefaili.|These details are included in every payment file.
Ettevõtte nimi|Company name
Ettevõtte ametlik nimi|Official company name
Pank|Bank
Maksja IBAN|Payer IBAN
Maksja BIC (valikuline)|Payer BIC (optional)
Aadress (valikuline)|Address (optional)
Linn / asula|Town / city
Tühi BIC täidetakse valitud panga koodiga. Saaja andmeid sellest ei tuletata.|An empty BIC is filled with the selected bank's code. Recipient details are not inferred from it.
Makse kuupäev ja selgitus|Payment date and description
Vaikimisi makse kuupäev|Default payment date
Arve maksetähtpäev|Invoice due date
Tänane päev|Today
Määratud kuupäev|Specified date
Ületatud maksetähtpäeva asemel kasutatakse tänast Eesti kuupäeva.|Overdue payments use today's date in Estonia.
Selgitus ilma kliendinumbrita|Description without customer number
Selgitus kliendinumbriga|Description with customer number
Lubatud kohatäitjad:|Allowed placeholders:
ja|and
. Maksimaalselt 140 märki makses.|. Maximum 140 characters per payment.
Arvete automaatne lugemine|Automatic invoice processing
Luban selle ettevõtte arve PDF-i, teksti või pildi saata teenusele|I allow this company's invoice PDF, text or image to be sent to
andmete lugemiseks.|for data extraction.
API-võti on serveris seadistatud.|The API key is configured on the server.
Sisesta API-võti ülal jaotises AI ühendus ning salvesta. Seni saad arved käsitsi sisestada.|Enter and save an API key in the AI connection section above. Until then, you can enter invoices manually.
Algfaili serveris ei säilitata. Tuvastatud andmed salvestatakse selle arvuti andmebaasi.|The original file is not stored on the server. Extracted data is saved in this computer's database.
Salvesta seaded|Save settings
Seadete muutmise järel kontrolli ja kinnita arved uuesti.|After changing settings, review and approve invoices again.
Tarnija nimi|Supplier name
Registrikood|Registration code
Aadressirida|Address line
Tänav|Street
Maja number|Building number
Postiindeks|Postal code
Riigikood|Country code
Muuda tarnijat|Edit supplier
Sulgen salvestamata muudatused?|Close without saving changes?
Sulge|Close
Järgmistel importidel kasutatakse parandatud nime ja aadressi, kui registrikood või kinnitatud IBAN tuvastab tarnija üheselt. Olemasoleva arve saad uuendada arve kontrollivaates.|Future imports use the corrected name and address when a registration code or verified IBAN uniquely identifies the supplier. You can update an existing invoice in the invoice review view.
Kinnitatud IBAN-id (üks konto real)|Verified IBANs (one account per line)
Salvesta ainult kontrollitud pangakontod. Arvelt loetud erinev konto jääb eraldi kontrollimiseks alles. Tarnija muutmisel vajavad tema seni kinnitatud, ekspordimata arved uut kinnitamist.|Save only verified bank accounts. A different account read from an invoice is retained for separate review. Editing a supplier requires their approved, unexported invoices to be approved again.
Salvesta tarnija|Save supplier
Arvete import|Invoice import
Arvete kontroll|Invoice review
Maksefail|Payment file
Tarnijad|Suppliers
Seaded|Settings
Arvest maksefailini.|From invoice to payment file.
Lisa ostuarved, kontrolli andmed ja valmista maksed pangale ette.|Add purchase invoices, check the details and prepare payments for your bank.
Vaata makseandmed algdokumendilt üle. Sina annad lõpliku kinnituse.|Check payment details against the original document. You give the final approval.
Vali kinnitatud arved ja laadi maksefail internetipanka importimiseks alla.|Select approved invoices and download a payment file to import into online banking.
Sinu kinnitatud andmed aitavad märgata muutunud pangakontosid.|Your verified details help detect changed bank accounts.
Maksja andmed, maksekuupäevad ja arvete automaatne lugemine.|Payer details, payment dates and automatic invoice processing.
Ettevõtte vahetamisel sulgub praegune vaade ja salvestamata muudatused lähevad kaotsi. Jätkan?|Switching companies closes this view and discards unsaved changes. Continue?
Lisa korraga kuni 50 arvet.|Add up to 50 invoices at a time.
Import ebaõnnestus|Import failed
Vaate värskendamine ebaõnnestus. Laadi leht uuesti.|Could not refresh the view. Reload the page.
Maksefail on valmis. Laadi see alla ja impordi internetipanka.|The payment file is ready. Download it and import it into online banking.
Arveid kokku|Total invoices
Valmis makseid|Ready payments
Vajab kontrolli|Needs review
Vigaseid arveid|Invalid invoices
Vali kõik valmis maksed|Select all ready payments
Tarnija / arve|Supplier / invoice
Staatus|Status
Maksetähtpäev|Due date
Summa|Amount
Tegevused|Actions
Tarnija määramata|Supplier not specified
Kontrolli|Review
 · varem eksporditud| · previously exported
Kustutan selle arve kohalikust registrist?|Delete this invoice from the local register?
Makseks AI avaleht|Makseks AI home
MAKSETE TÖÖLAUD|PAYMENTS WORKSPACE
Põhinavigatsioon|Main navigation
Sinu kontrolli all|You're in control
Makseid kinnitad ise internetipangas.|You approve payments yourself in online banking.
Kohalik tööruum|Local workspace
Töölaud|Workspace
Ettevõte|Company
Aktiivne ettevõte|Active company
Lisa ettevõte|Add company
Ettevõtte seaded|Company settings
OSTUARVED → PANGAMAKSED|PURCHASE INVOICES → BANK PAYMENTS
Maksefaili juurde|Go to payment file
Sulge teade|Dismiss notification
Laadin töölauda…|Loading workspace…
Valmis maksete summa|Ready payments total
Lisa ostuarved|Add purchase invoices
1. samm|Step 1
Töötlen arveid…|Processing invoices…
Lohista arved siia|Drag invoices here
või vali failid oma arvutist|or choose files from your computer
Vali arvefailid|Choose invoice files
PDF, JPG või PNG · vaikimisi kuni 10 MB / fail|PDF, JPG or PNG · default limit 10 MB / file
Arve pole failina?|No invoice file?
Lisa käsitsi|Add manually
KOLM LIHTSAT SAMMU|THREE SIMPLE STEPS
Ülevaade enne|A clear view before
iga makset.|every payment.
Lisa arved|Add invoices
Laadi üles üks arve või terve kaustatäis.|Upload one invoice or a whole folder.
Kontrolli andmeid|Check the details
Vaata üle saaja, pangakonto, summa ja kuupäev.|Review the recipient, bank account, amount and date.
Laadi maksefail alla|Download payment file
Impordi XML valitud panga internetipanka.|Import the XML into your chosen bank's online banking.
Ükski makse ei liigu sinu kinnituseta.|No payment is made without your approval.
Käsitsi sisestamise režiim.|Manual entry mode.
Automaatse lugemise saad sisse lülitada seadetes.|You can enable automatic processing in settings.
Ava seaded|Open settings
Viimati lisatud arved|Recently added invoices
Vaata kõiki|View all
Sinu esimene arve ootab lisamist|Add your first invoice
Lisatud arved ja nende kontrolli tulemused ilmuvad siia.|Added invoices and their validation results appear here.
Kõik arved|All invoices
Valmis arved|Ready invoices
Otsi arveid|Search invoices
Otsi tarnijat või arvet|Search supplier or invoice
Lisa arve|Add invoice
Siin pole veel arveid|No invoices here yet
Lisa uus arve või muuda otsingut ja filtrit.|Add a new invoice or change your search and filter.
Ekspordiks valmis|Ready to export
makset|payments
Kinnita kõigepealt arved|Approve invoices first
Siia ilmuvad ainult kontrollitud ja kinnitatud maksed.|Only reviewed and approved payments appear here.
Kontrolli makseid|Review payments
MAKSEFAILI KOKKUVÕTE|PAYMENT FILE SUMMARY
maksed|payments
Valitud arveid|Selected invoices
Maksekuupäevi|Payment dates
Maksja|Payer
Määramata|Not specified
Kokku|Total
Genereeri maksefail|Generate payment file
Iga maksekuupäev saab failis oma maksegrupi. Makse kinnitad internetipangas.|Each payment date has its own group in the file. You approve payments in online banking.
Maksefail on valmis|Payment file ready
Laadi XML alla|Download XML
Registrikood puudub|No registration code
Kinnitatud kontod|Verified accounts
Eemaldan tarnija meelde jäetud andmed? Arved jäävad alles.|Remove the saved supplier details? Invoices will remain.
Kinnitatud tarnijad ilmuvad siia|Verified suppliers appear here
Arve kinnitamisel saad tarnija andmed meelde jätta.|You can save supplier details when approving an invoice.
Uue pangakonto korral küsime eraldi kinnitust.|A new bank account requires separate confirmation.
Arvete juurde|Go to invoices
Seaded on salvestatud.|Settings saved.
· EUR maksed|· EUR payments
Muudatused salvestatud. Kontrolli tulemused üle ja kinnita arve.|Changes saved. Review the results and approve the invoice.
Arve on kinnitatud ja maksefailiks valmis.|Invoice approved and ready for the payment file.
Uue ettevõtte nimi|New company name
Uuele ettevõttele luuakse eraldi arved, tarnijad ja makseajalugu. Maksja konto ning muud andmed saad sisestada Seadetes.|The new company gets separate invoices, suppliers and payment history. Enter the payer account and other details in Settings.
Loo ettevõte|Create company
Tarnija andmed salvestatud. Järgmistel importidel kasutatakse parandatud andmeid.|Supplier details saved. Future imports will use the corrected details.
Saaja IBAN|Recipient IBAN
Saaja BIC|Recipient BIC
Arve number|Invoice number
Kliendinumber|Customer number
Viitenumber|Reference number
Tasumisele kuuluv summa|Amount due
Valuuta|Currency
Arve kuupäev|Invoice date
Saaja linn / asula|Recipient town / city
Saaja riigikood|Recipient country code
Valmis|Ready
Eksporditud|Exported
Vigane|Invalid
Päring ebaõnnestus.|Request failed.
Keele salvestamine ebaõnnestus. Proovi uuesti.|Could not save the language. Try again.
Kasutajaliidese keel|Interface language
Keel muutub kohe ja salvestatakse kõigile ettevõtetele.|The language changes immediately and is saved for all companies.
Qwen 3.8 27B (pildid ja PDF kuni 3 lk)|Qwen 3.8 27B (images and PDFs up to 3 pages)
Keele-eelistuse laadimine ebaõnnestus. Vali keel uuesti.|Could not load the language preference. Select the language again.
Vali arve {number}|Select invoice {number}
Kustuta arve {number}|Delete invoice {number}
Unusta tarnija {name}|Forget supplier {name}
 · kindlus {percent}%| · confidence {percent}%
{count} arvet lisatud. Kontrolli ja kinnita makseandmed.|{count} invoices added. Review and approve the payment details.
AI seadistuse lugemine ebaõnnestus.|Could not read the AI configuration.
Mudelite laadimine ebaõnnestus. Kontrolli valitud teenuse API-võtit, võrguühendust ja ligipääsu.|Could not load models. Check the selected service's API key, network connection and access.
XML-i välised olemid ei ole lubatud.|External XML entities are not allowed.
Vali 1–500 kinnitatud makset.|Select 1–500 approved payments.
Makse sisaldab vigaseid või puuduvaid andmeid.|The payment contains invalid or missing details.
Vigane tehniline identifikaator.|Invalid technical identifier.
Sisesta korrektne maksja ettevõtte nimi.|Enter a valid payer company name.
Maksja IBAN puudub või on vigane.|Payer IBAN is missing or invalid.
Maksja BIC on vigane.|Payer BIC is invalid.
Maksja BIC ei vasta valitud pangale.|Payer BIC does not match the selected bank.
Selgituse mallis on tundmatu kohatäitja või keelatud märk.|The description template contains an unknown placeholder or a disallowed character.
Saaja IBAN ei läbi kontrolli.|Recipient IBAN fails validation.
Saaja konto riik jääb selle rakenduse SEPA ulatusest välja.|The recipient account's country is outside this application's SEPA scope.
Summa peab olema positiivne, kuni kahe komakohaga ja kuni 999 999 999,99 EUR.|The amount must be positive, with up to two decimal places, and no more than EUR 999,999,999.99.
Toetatud on ainult EUR-maksed.|Only EUR payments are supported.
Viitenumber ei läbi 7-3-1 kontrolli (2–20 numbrit). Paranda või eemalda see teadlikult.|The reference number fails the 7-3-1 check (2–20 digits). Correct it or deliberately remove it.
Saaja BIC on vigane.|Recipient BIC is invalid.
Makse kuupäev puudub või on minevikus. Kontrolli maksetähtpäeva ja kuupäeva seadeid.|The payment date is missing or in the past. Check the due date and date settings.
Riigikood peab sisaldama kahte suurtähte.|The country code must contain two uppercase letters.
Makse selgitus on liiga pikk (kuni 140 märki) või sisaldab keelatud märki.|The payment description is too long (maximum 140 characters) or contains a disallowed character.
See arve on juba maksefaili lisatud. Kinnita korduv eksport eraldi.|This invoice has already been included in a payment file. Approve the repeat export separately.
Võimalik duplikaatarve. Kontrolli, et makset ei tehta kaks korda.|Possible duplicate invoice. Check that the payment will not be made twice.
Saaja konto erineb selle tarnija varem kinnitatud kontost.|The recipient account differs from the supplier's previously verified account.
Kontrolli makseandmeid ja kinnita arve enne eksporti.|Review payment details and approve the invoice before export.
Arve ei ole ekspordiks kinnitatud või sisaldab vigu.|The invoice is not approved for export or contains errors.
Faili sisu ei vasta PDF-, JPG- või PNG-vormingule.|The file content is not in PDF, JPG or PNG format.
Lubatud on PDF, JPG, JPEG ja PNG failid.|PDF, JPG, JPEG and PNG files are allowed.
AI lugemine pole seadistatud või sisse lülitatud. Sisesta andmed käsitsi.|AI processing is not configured or enabled. Enter the details manually.
Arve automaatne lugemine ebaõnnestus. Sisesta andmed käsitsi või proovi uuesti; teised arved jäävad alles.|Automatic invoice processing failed. Enter the details manually or try again; other invoices are retained.
GEMINI_API_KEY puudub.|GEMINI_API_KEY is missing.
OpenAI API-võti puudub.|OpenAI API key is missing.
OpenAI lugemine ebaõnnestus.|OpenAI processing failed.
Anthropic API-võti puudub.|Anthropic API key is missing.
Claude lugemine ebaõnnestus.|Claude processing failed.
AI keeldus lugemisest.|AI declined to process the document.
AI vastus puudub.|AI response is missing.
Groq vajab arve pilti või PDF-faili.|Groq requires an invoice image or PDF file.
Groq toetab kuni 3-leheküljelist PDF-i. Vali pikema arve jaoks teine teenusepakkuja või sisesta andmed käsitsi.|Groq supports PDFs of up to 3 pages. Choose another provider for longer invoices or enter the details manually.
Groq API-võti puudub.|Groq API key is missing.
Groqi päring on liiga suur. Vali teine teenusepakkuja või väiksem arvefail.|The Groq request is too large. Choose another provider or a smaller invoice file.
Groq lugemine ebaõnnestus.|Groq processing failed.
Mistrali võti või dokument puudub.|Mistral key or document is missing.
Mistrali lugemine ebaõnnestus.|Mistral processing failed.
Ava rakendus Windowsi programmi aknas.|Open the application in its Windows program window.
Rakendus on mõeldud kasutamiseks ainult selles arvutis.|This application is intended for use only on this computer.
Päringu päritolu ei ole lubatud. Ava rakendus kohalikul aadressil.|The request origin is not allowed. Open the application at its local address.
Päring on liiga suur.|The request is too large.
Sisesta ettevõtte nimi (kuni 140 märki).|Enter a company name (up to 140 characters).
Ettevõtet ei leitud. Vali ettevõte uuesti.|Company not found. Select the company again.
AI pakkus saajaks maksja ettevõtte nime. Nimi eemaldati; kontrolli tegelikku tarnijat algdokumendilt.|AI suggested the payer company as the recipient. The name was removed; check the actual supplier against the original document.
Arve on vahepeal muutunud. Värskenda vaadet ja kontrolli uuesti.|The invoice has changed. Refresh the view and review it again.
Kinnitatud tarnijaandmed puuduvad.|Verified supplier details are missing.
Arve on vahepeal muutunud. Värskenda vaadet.|The invoice has changed. Refresh the view.
Kinnita, et kontrollisid andmeid algdokumendilt.|Confirm that you checked the details against the original document.
Arvet ei leitud.|Invoice not found.
Makse seaded või kuupäev on vahepeal muutunud. Sulge arve, värskenda lehte ja kontrolli makseandmed uuesti.|The payment settings or date have changed. Close the invoice, refresh the page and review the payment details again.
Vali 1–500 erinevat kinnitatud arvet.|Select 1–500 distinct approved invoices.
Valitud arvet ei leitud.|Selected invoice not found.
Vigane IBAN|Invalid IBAN
Kasuta kahetähelist riigikoodi|Use a two-letter country code
Vali kehtiv ettevõte. Värskenda vajadusel lehte.|Select a valid company. Refresh the page if needed.
Vali arvefail.|Select an invoice file.
AI-teenusepakkuja on muutunud. Värskenda lehte ja luba arveandmete saatmine valitud teenusele uuesti.|The AI provider has changed. Refresh the page and allow invoice data to be sent to the selected service again.
Päringut ei leitud.|Request not found.
Sisestatud andmed ei vasta oodatud vormingule.|The entered data does not match the expected format.
Andmete salvestamine ebaõnnestus. Kontrolli, et andmebaas on seadistatud ja proovi uuesti.|Could not save the data. Check that the database is configured and try again.
Coop Panga internetipanga import on veel katsetamata.|Import into Coop Pank online banking has not yet been tested.
LHV internetipanga import on veel katsetamata.|Import into LHV online banking has not yet been tested.
SEB maksefaili import õnnestus kasutaja kinnituse põhjal 07.10.2026.|SEB payment file import succeeded according to user confirmation on 07.10.2026.
Swedbanki internetipanga import on veel katsetamata.|Import into Swedbank online banking has not yet been tested.
`;
export const translations: Readonly<Record<string, string>> =
  Object.fromEntries(
    entries
      .trim()
      .split("\n")
      .map((line) => {
        const split = line.indexOf("|");
        return [line.slice(0, split), line.slice(split + 1)];
      }),
  );
export function translate(language: Language, source: string, values?: Record<string, string | number>): string {
  const text = language === "en" ? (translations[source] ?? source) : source;
  return values ? text.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] === undefined ? placeholder : String(values[key])) : text;
}

const messagePatterns: Array<[RegExp, (...values: string[]) => string]> = [
  [/^(.+?) puudub\./, (field) => `${translate("en", field)} is missing.`],
  [
    /^(.+?) ei ole kehtiv kuupäev\./,
    (field) => `${translate("en", field)} is not a valid date.`,
  ],
  [
    /^(.+?) sisaldab XML-is keelatud märki\./,
    (field) =>
      `${translate("en", field)} contains a character disallowed in XML.`,
  ],
  [
    /^(.+?) on liiga pikk \(kuni (\d+) märki\)\./,
    (field, length) =>
      `${translate("en", field)} is too long (maximum ${length} characters).`,
  ],
  [
    /^Maksja Eesti IBAN ei kuulu valitud (.+?) pangaprofiilile\./,
    (bank) =>
      `The payer's Estonian IBAN does not belong to the selected ${bank} bank profile.`,
  ],
  [
    /^(.+?) makse saaja aadressis puudub linn \/ asula\. Täida arve lisaandmetes saaja linn \/ asula ja salvesta muudatused\./,
    (bank) =>
      `${bank} payment recipient address is missing a town / city. Enter the recipient town / city in the invoice's additional details and save changes.`,
  ],
  [
    /^(.+?) makse saaja aadressis puudub riigikood\. Täida arve lisaandmetes saaja riigikood \(Eesti puhul EE\) ja salvesta muudatused\./,
    (bank) =>
      `${bank} payment recipient address is missing a country code. Enter the recipient country code (EE for Estonia) in the invoice's additional details and save changes.`,
  ],
  [
    /^Selgitus ja viitenumber võivad kokku olla kuni (\d+) märki\./,
    (length) =>
      `The description and reference number may total up to ${length} characters.`,
  ],
  [
    /^(.+?): selgitus ja viitenumber võivad kokku olla kuni (\d+) märki\./,
    (bank, length) =>
      `${bank}: the description and reference number may total up to ${length} characters.`,
  ],
  [
    /^Kontrolli algdokumendilt: ([^.]+)\./,
    (fields) =>
      `Check against the original document: ${fields
        .split(", ")
        .map((field) =>
          translate(
            "en",
            field.charAt(0).toUpperCase() + field.slice(1),
          ).toLowerCase(),
        )
        .join(", ")}.`,
  ],
  [/^Sisesta (.+?) API-võti\./, (provider) => `Enter the ${provider} API key.`],
  [
    /^Fail on tühi või ületab (\d+(?:\.\d+)?) MB piiri\./,
    (limit) => `The file is empty or exceeds the ${limit} MB limit.`,
  ],
  [
    /^(.+?) XML läbis panga täieliku XSD kontrolli\./,
    (bank) => `${bank} XML passed the bank's complete XSD validation.`,
  ],
  [
    /^(.+?) XML ei läbinud panga XSD kontrolli\. Kontrolli makseandmeid ja skeemifailide olemasolu\./,
    (bank) =>
      `${bank} XML failed the bank's XSD validation. Check the payment details and that the schema files are present.`,
  ],
];
const sentences = Object.keys(translations)
  .filter((key) => /[.!?]$/.test(key))
  .sort((a, b) => b.length - a.length);

/** Translate only application messages at display boundaries, never invoice data. */
export function translateMessage(language: Language, source: string): string {
  if (language === "et") return source;
  if (translations[source]) return translations[source];
  let remaining = source;
  let result = "";
  while (remaining) {
    const whitespace = /^\s+/.exec(remaining);
    if (whitespace) {
      result += whitespace[0];
      remaining = remaining.slice(whitespace[0].length);
      continue;
    }
    const key = sentences.find(
      (candidate) =>
        remaining.startsWith(candidate) &&
        (remaining.length === candidate.length ||
          /\s/.test(remaining[candidate.length])),
    );
    if (key) {
      result += translations[key];
      remaining = remaining.slice(key.length);
      continue;
    }
    let matched = false;
    for (const [pattern, render] of messagePatterns) {
      const match = pattern.exec(remaining);
      if (!match) continue;
      result += render(...match.slice(1));
      remaining = remaining.slice(match[0].length);
      matched = true;
      break;
    }
    if (!matched) return result + remaining;
  }
  return result;
}
