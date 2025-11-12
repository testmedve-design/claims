# Changelog

This document records notable changes that have been implemented during the current development iteration.

## 2025-11-12

- Updated claim submission workflow and docs so DOB and age/age-unit stay in sync in both directions (auto-derivation on the backend, display updates, hospital documentation).
- Document uploads now enforce a 25 MB limit with client-side image compression where possible; docs refreshed to reflect the new cap and guidance.
- Clarified API samples by removing redundant submission timestamps and documenting new provider fields (policy type, expanded treatment lines).

## 2025-11-11

- Added structured letter metadata (approval, denial, need-more-info) at the processor stage and exposed download actions inside the transaction history for both hospital and processor users.
- Auto-generated cover letters (approval, denial, need-more-info) now attach directly to the relevant transaction so they can be re-downloaded at any time without re-processing.
- Enabled hospital users to respond to `need_more_info` requests directly from the claim details screen, including optional document uploads and status reconciliation back to `qc_answered`.
- Introduced the denial contest workflow: hospital users can submit contest remarks and evidence, which creates a dedicated `claim_contested` status, logs a new `CONTESTED` transaction, and notifies processors.
- Refined the processor inbox filters/badges so contested claims appear in the unprocessed queue with clear labelling.
- Hardened backend notification utilities with a new `notify_claim_contested` helper and added the `CONTESTED` transaction type to the audit trail.
- Updated claims API behaviour to resolve claim references in both `claims` and `direct_claims` collections, ensuring hospital responses work for all claim sources.

## 2025-11-10

- Added letter templates for claim approvals, denials, and need-more-info requests; stored under `backend/utils/letter_templates.py`.
- Attached generated letters to transaction metadata and rendered contextual download actions in the UI.
- Improved hospital claim detail UX by showing status-specific alerts and forms for QC queries and processor information requests.

## 2025-11-09

- General maintenance: authentication adjustments, lock handling improvements, and inbox refinements (see git history for granular diffs).


