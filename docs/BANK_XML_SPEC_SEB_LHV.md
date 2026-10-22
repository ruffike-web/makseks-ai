# SEB + LHV pain.001.001.09 implementation spec

## Documentation status update — 2026-10-22

The user has confirmed successful real internet-bank imports of SEB and LHV `pain.001.001.09` XML payment files. Actual Coop Pank and Swedbank imports remain unverified. This is a user report, not official bank certification or proof that every acceptance-test scenario below has been exercised. See the [current import status and scope](bank-specs/README.md#praegune-impordistaatus).

LHV's official supplementary XSD was integrated on 2026-10-07; see the [LHV profile](bank-specs/lhv/README.md). The original implementation baseline below, including its then-incomplete golden-file validation record and acceptance checklist, is preserved unchanged as historical source material. Its missing-schema and untested-import statements describe that earlier state, not the current implementation.

## Original implementation baseline

Status: implementation baseline for the invoice-to-bank-import MVP.

## Source material used

SEB:
- pain.001.001.09_SEBv2.xsd
- SEB_pain001_SEPA_2024.xml
- SEB_pain001_SEPA_full_2024_hybrid_address.xml
- SEB_pain001_SEPA_full_2024_structured_address.xml

LHV:
- pain.001.001.09.xml (LHV pain.001.001.09 schema)
- PAYMENT_PAIN.001.xml
- PAYMENT_PAIN.001 (1).xml
- PAYMENT_PAIN.001 (2).xml (bulk example)

## Scope of MVP

- Credit transfers only (`PmtMtd=TRF`).
- EUR / SEPA supplier payments first.
- One payer account per export file.
- Multiple invoices/payments per file.
- No direct bank API initiation; file generation only.
- Human review is mandatory before export.

## Critical design rule: group by execution date

`ReqdExctnDt` belongs to `PmtInf`, not to each `CdtTrfTxInf` transaction.

Therefore invoices with different execution dates MUST NOT be put into one `PmtInf` block.
The generator must group approved payments by effective execution date. Each date gets a separate `PmtInf` block.

Example:
- Invoice A execution date 2026-10-20 -> PmtInf #1
- Invoice B execution date 2026-10-25 -> PmtInf #2

At `GrpHdr` level:
- `NbOfTxs` = total transactions across all PmtInf blocks.
- `CtrlSum` = total amount across all transactions.

At each `PmtInf` level:
- `NbOfTxs` = transactions in that block.
- `CtrlSum` = sum of that block.

## Payment date rule

Default effective execution date:

1. If invoice due date is today or future -> due date.
2. If invoice due date is in the past -> current Estonia local date.
3. If due date is missing -> REVIEW_REQUIRED; do not export until reviewed.
4. User may override with "today" or a manually selected date.

Use a date-only value (`YYYY-MM-DD`) and do not let UTC conversion shift the date.

## Common normalized Payment model

```ts
interface Payment {
  creditorName: string;
  creditorIban: string;
  creditorBic?: string | null;
  creditorAddressLine?: string | null;
  creditorPostalCode?: string | null;
  creditorTown?: string | null;
  creditorCountry?: string | null; // ISO 3166-1 alpha-2
  amount: Decimal;
  currency: "EUR";
  invoiceNumber: string;
  customerNumber?: string | null;
  referenceNumber?: string | null;
  description: string;
  executionDate: LocalDate;
}
```

## Shared XML structure used by the app

```text
Document
└─ CstmrCdtTrfInitn
   ├─ GrpHdr
   │  ├─ MsgId
   │  ├─ CreDtTm
   │  ├─ NbOfTxs
   │  ├─ CtrlSum
   │  └─ InitgPty/Nm
   └─ PmtInf [one per execution-date group]
      ├─ PmtInfId
      ├─ PmtMtd = TRF
      ├─ NbOfTxs
      ├─ CtrlSum
      ├─ PmtTpInf
      ├─ ReqdExctnDt/Dt
      ├─ Dbtr/Nm
      ├─ DbtrAcct/Id/IBAN
      ├─ DbtrAgt/FinInstnId/BICFI
      └─ CdtTrfTxInf [1..n]
         ├─ PmtId/EndToEndId
         ├─ Amt/InstdAmt[@Ccy="EUR"]
         ├─ Cdtr/Nm
         ├─ Cdtr/PstlAdr (when supplied/required)
         ├─ CdtrAcct/Id/IBAN
         └─ RmtInf
```

## SEB adapter rules

Golden file: `SEB_golden_reference_pain001_001_09.xml`

- Namespace: `urn:iso:std:iso:20022:tech:xsd:pain.001.001.09`
- `PmtMtd`: `TRF`.
- `NbOfTxs` and `CtrlSum` are emitted at group and payment-info level.
- Debtor account is emitted as IBAN.
- Debtor agent BIC is emitted as `BICFI`.
- For SEPA: `PmtTpInf/SvcLvl/Cd = SEPA`.
- If `PstlAdr` is emitted, app uses structured/hybrid address data. For the SEB schema used here, `TwnNm` and `Ctry` are mandatory inside `PstlAdr`.
- A valid creditor reference is emitted as structured remittance: `RmtInf/Strd/CdtrRefInf/.../Cd=SCOR` + `Ref`.
- For an invoice with a structured reference, invoice/customer text is placed in `Strd/AddtlRmtInf` in the golden reference. This must still be verified with a real SEB import test for desired internet-bank presentation.
- Without a reference number, use `RmtInf/Ustrd` for the description.

## LHV adapter rules

Golden file: `LHV_golden_reference_pain001_001_09.xml`

- Namespace: `urn:iso:std:iso:20022:tech:xsd:pain.001.001.09`.
- `PmtMtd`: `TRF`.
- `BtchBookg=false` follows the supplied LHV samples; expose as an adapter default, not a domain-model field.
- `NbOfTxs` and `CtrlSum` are emitted at group and payment-info level.
- Debtor account is emitted as IBAN.
- Debtor agent BIC is emitted as `BICFI`; for an LHV payer account use LHV's actual BIC from payer configuration / trusted bank config, never AI-generated data.
- The supplied LHV bulk sample uses `PmtTpInf/SvcLvl/Prtry = SEPA`; the golden reference follows that sample.
- The supplied LHV reference sample demonstrates `SCOR` structured creditor reference.
- Without a reference number, use `RmtInf/Ustrd`.
- With a reference number, the golden reference uses `Strd/CdtrRefInf` and `AddtlRmtInf` for invoice/customer text. Verify display/acceptance in an actual LHV internet-bank import before declaring production-ready.
- `ChrgBr=SHAR` follows the supplied LHV sample and is adapter-specific.

## SEB vs LHV differences relevant to the MVP

| Concern | SEB | LHV | App decision |
|---|---|---|---|
| pain version | 001.001.09 | 001.001.09 | shared core |
| payment method | TRF | TRF | fixed TRF |
| batch count/sum | required by supplied schema | required by supplied schema | always emit |
| service level example | `SvcLvl/Cd=SEPA` | bulk sample uses `SvcLvl/Prtry=SEPA` | bank adapter owns representation |
| debtor account | SEB schema restricts app path to IBAN | LHV schema allows broader account choice | app uses IBAN only |
| debtor agent | SEB-specific financial institution type | LHV EST-specific type | adapter emits BICFI |
| batch booking | optional; sample varies | sample uses false | adapter default |
| charge bearer | optional; full SEB sample uses SLEV | LHV sample uses SHAR | adapter-specific; no shared hardcoded value |
| structured reference | SCOR supported | SCOR supported | shared reference model, adapter renders |
| address | SEB schema makes town/country mandatory when PstlAdr exists | LHV schema fields are structurally optional; current bank rules still need separate operational verification | never invent; review if required data missing |
| supplementary data | not needed for MVP | LHV schema can import supplementary schema | omit from MVP |

## Remittance rules

### Valid reference number

- Normalize spaces out.
- Validate digits and Estonian 7-3-1 check digit where it is an Estonian domestic reference.
- Use structured reference (`SCOR`).
- Keep invoice/customer text in structured additional remittance information only if adapter/import tests confirm desired behavior.

### No reference number

Use unstructured description:

`Arve {invoiceNumber}`

or

`Arve {invoiceNumber}, klient {customerNumber}`

Max lengths must be enforced before XML generation. Never silently truncate critical identifiers; warn/review when a configured template exceeds bank/schema limits.

## IDs

- `MsgId`: unique per generated export.
- `PmtInfId`: unique per payment-info group.
- `InstrId`: optional; LHV golden uses invoice-derived value, SEB golden omits it.
- `EndToEndId`: required by both supplied schemas. Generate deterministic-safe unique value <= 35 chars. Do not use a reference number as a substitute for `EndToEndId`.

## Money

- Never use IEEE floating point for money.
- Use decimal arithmetic or integer cents.
- EUR is serialized with exactly two decimal places.
- `GrpHdr/CtrlSum` and each `PmtInf/CtrlSum` are computed, never AI-provided.

## Human-review safety rules

Block export when:
- IBAN missing/invalid.
- creditor name missing.
- amount missing/invalid/non-positive.
- execution date unresolved.
- currency unsupported.
- duplicate suspected and not reviewed.
- critical AI-extracted value is below configured confidence threshold and not confirmed.
- selected bank adapter requires address data that is missing.

Never let AI generate or "repair" an IBAN, BIC, reference number, amount or date. AI extracts candidates; deterministic code validates them.

## Supplier memory

Store confirmed supplier data separately from raw extraction:
- legal name
- registration code
- trusted IBANs
- BIC if confirmed
- address / town / country

If a known supplier arrives with a new IBAN, show a high-severity warning and require explicit confirmation. Do not automatically replace trusted banking details.

## Duplicate detection

Warn on either:
- identical SHA-256 source file hash; or
- same normalized supplier + invoice number + amount.

Do not auto-delete duplicates.

## Validation status of supplied golden files

- SEB golden reference: validated successfully against the supplied `pain.001.001.09_SEBv2.xsd`.
- LHV golden reference: validates against the supplied LHV main pain.001.001.09 schema when the missing imported supplementary namespace is satisfied by a local minimal schema stub. This is NOT equivalent to validating against LHV's official `supl.001.001.01.xsd`.
- Therefore LHV is not to be marked production-ready until the official supplementary XSD (if required by the current package) and a real LHV internet-bank import test are completed.
- Both banks require real import testing before production-ready status.

## Acceptance tests before production

1. Generate one EUR payment without reference.
2. Generate one EUR payment with valid Estonian reference.
3. Generate 10 payments same execution date -> one PmtInf.
4. Generate payments with 3 execution dates -> three PmtInf blocks.
5. Verify total transaction counts and sums at all levels.
6. Verify XML escaping with `&`, `<`, `>` and non-ASCII Estonian characters.
7. Import test in SEB internet bank.
8. Import test in LHV internet bank.
9. Check that reference and invoice/customer description are shown as intended.
10. Confirm bank does not alter or reject requested execution dates.
