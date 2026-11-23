# 2026-11-22 SRS v3.0 policy confirmations

**Recorded:** Monday, November 23, 2026 — 20:42:32 +08:00  
**Authority:** Project-owner confirmation supplied in the revised SRS v3.0 reconciliation directive. These are engineering policy directions, not evidence of school institutional approval, deployment, legal compliance, backup recovery, or UAT sign-off.

## Confirmed policy baseline

| Key | Direction | Reconciliation status at this record |
| --- | --- | --- |
| SRS-01 | Registrar alone manages guardian creation, updates, links and unlinks. Cashier and Accounting retain only authorized contact context. | Implemented and feature-tested in the isolated SQLite suite. Shared-contact edits and primary-contact replacement/unlink remain blocked pending policy. |
| SRS-02 | Cashier prepares financial ledger batches; Accounting reviews and confirms; nothing posts before confirmation. | Policy confirmed; posting contract remains blocked. Required input fields, historical-payment/account semantics, duplicate handling, receipt/date rules, and close-out interaction are not specified. |
| SRS-03 | Cashier directly finalizes reasoned/audited adjustments; no Accounting approval threshold. | Existing direct, audited Cashier adjustment authorization remains the implementation. Installment redistribution after an adjustment remains unspecified. |
| SRS-04 | Propose ten-year audit-log and five-year other-personal-information retention, subject to institutional approval. | Policy documented; enforcement deferred. No generalized purge or change to the separate 30-day archived-staff lifecycle is authorized. |
| SRS-05 | Only Super Admin assigns Accounting Officer accounts. | Implemented and feature-tested in the isolated SQLite suite. |
| SRS-06 | Daily automated local backup plus Administrator-authorized manual backup. | Implementation and operational verification remain pending. Destination, time, rotation, host scheduler, backup tool, and isolated restore evidence are not confirmed. |
| SRS-07 | Propose performance targets from local deployment measurements. | Pending: no approved local MySQL deployment hardware/fixture benchmark exists. Targets are proposals, not SLAs. |
| SRS-08 | The approved receipt title is exactly `Acknowledgment Receipt`. | API default and Administrator validation reconciled; existing persisted historical settings are not rewritten. Receipt IDs, sequences, and payment history are unchanged. |
| SRS-09 | UAT participants are school representatives and Project Supervisor Coleen Creus. | Planning/evidence work is pending. Actual evaluators, dates, scenarios performed, and signed acceptance remain unconfirmed. |

## Remaining policy decisions

1. Ledger import: approved source template and fields; whether it covers opening balances, accounts, historical payments, fee items, or another bounded set; historical receipts/dates/duplicates; posting/allocation/correction/notification treatment.
2. Guardians: shared identity/contact edit authority; how a primary guardian is chosen, replaced, or unlinked; whether a student may have no primary guardian.
3. Adjustments: how changed total due is redistributed over future installments without rewriting paid allocation history.
4. Retention: formal approval, per-record start events, holds/exceptions, disposal/anonymization, copied/exported data, backup rotation, enforcement authorization and audit evidence.
5. Backup: protected destination, daily time, rotation, native MySQL backup tool, scheduler host operation, available storage, restore owner and isolated recovery exercise.
6. Performance/UAT: deployment hardware and synthetic benchmark fixture; designated school representatives, dates, final acceptance instrument and signatures.

## Explicit safeguards preserved

- No financial or audit hard deletes, no changed receipt sequence/identifier, no new payment methods, no active clearance/permit workflow, no production secrets, data, backup artifacts, deployment, or destructive migration.
- “Verified” in this repository means a relevant test environment only. It does not mean a live MySQL deployment or institutional acceptance.
