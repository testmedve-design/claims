# Claim Model Assessment

This document outlines the structure of the Claim model as implemented in the application, covering both the backend (Firestore/Python) and frontend (TypeScript) definitions.

## Overview

The application uses a flexible data model where the core "Claim" entity is stored in Firestore. The model consists of top-level metadata fields and a nested `form_data` object that contains the detailed clinical and financial information.

## Backend Structure (Firestore)

The backend interacts with the `claims` (or `direct_claims`) collection in Firestore. The data structure is implicit in the route handlers (e.g., `backend/routes/claims.py`).

### Top-Level Fields
These fields are directly on the Firestore document:

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `claim_id` | String | Unique identifier for the claim (e.g., "CSHLSIP-...", "CLS-..."). |
| `claim_status` | String | Current status (e.g., "pending", "approved", "rejected", "draft"). |
| `hospital_id` | String | ID of the hospital the claim belongs to. |
| `hospital_name` | String | Name of the hospital. |
| `created_at` | Timestamp | When the claim was created. |
| `submission_date` | Timestamp | When the claim was submitted. |
| `created_by_email` | String | Email of the user who created the claim. |
| `submitted_by_email` | String | Email of the user who submitted the claim. |
| `processing_remarks` | String | Remarks added during processing. |
| `processed_by` | String | ID of the processor. |
| `documents` | Array | List of associated documents. |
| `form_data` | Map | **Core Data**: Contains the detailed claim information (maps to Frontend `ClaimFormData`). |

## Frontend Structure (TypeScript)

The frontend defines the detailed structure of the claim form data in `frontend/src/types/claims.ts`.

### `ClaimFormData` Interface
This interface likely maps to the `form_data` field in the backend.

**Patient Details**
*   `patient_name`: string
*   `patient_id`: string
*   `date_of_birth`: string
*   `age`: number (optional)
*   `gender`: string
*   `id_card_type`: string
*   `id_card_number`: string
*   `patient_contact_number`: string
*   `patient_email_id`: string
*   `beneficiary_type`: string
*   `relationship`: string

**Payer Details**
*   `payer_patient_id`: string
*   `authorization_number`: string
*   `total_authorized_amount`: number
*   `payer_type`: string
*   `payer_name`: string
*   `insurer_name`: string (optional)
*   `policy_number`: string (optional)
*   `sponsorer_corporate_name`: string (optional)

**Provider Details**
*   `patient_registration_number`: string
*   `doctor`: string
*   `treatment_line`: string
*   `policy_type`: string
*   `claim_type`: string
*   `service_start_date`: string
*   `service_end_date`: string
*   `inpatient_number`: string
*   `admission_type`: string
*   `hospitalization_type`: string
*   `ward_type`: string
*   `final_diagnosis`: string
*   `icd_10_code`: string
*   `treatment_done`: string
*   `pcs_code`: string

**Bill Details**
*   `bill_number`: string
*   `bill_date`: string
*   `security_deposit`: number
*   `total_bill_amount`: number
*   `patient_discount_amount`: number
*   `amount_paid_by_patient`: number
*   `total_patient_paid_amount`: number
*   `amount_charged_to_payer`: number
*   `mou_discount_amount`: number
*   `claimed_amount`: number
*   `submission_remarks`: string

**Legacy Fields**
*   `admission_date`, `discharge_date`, `diagnosis`, `treatment`, `total_amount`, `specialty`

## Observations

1.  **Data Mapping**: The backend `form_data` field serves as a container for the fields defined in the frontend `ClaimFormData` interface. This allows for flexibility but requires careful synchronization to ensure the backend can process/search specific fields if needed.
2.  **Redundancy**: Some fields like `patient_name`, `payer_name`, `claimed_amount`, and `specialty` appear to be promoted to the top-level Firestore document (or extracted during query time) for easier filtering and listing, while also existing within `form_data`.
3.  **Validation**: Validation likely happens primarily on the frontend (via the `ClaimFormData` type) and potentially in the backend route handlers before saving to Firestore.
