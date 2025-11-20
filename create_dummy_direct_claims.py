#!/usr/bin/env python3
"""
Utility script to seed a few dummy IP claims (CSHLSIP-*) inside direct_claims
for testing purposes. Each claim gets a transactions subcollection with one
sample entry.
"""

import uuid
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore

CLAIM_COUNT = 5
HOSPITAL_ID = "TEST_HOSPITAL_001"
HOSPITAL_NAME = "Test Hospital"


def initialise_firestore():
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate("ServiceAccountKey.json")
        firebase_admin.initialize_app(cred)


def generate_claim_payload(index: int, now: datetime):
    claim_id = f"CSHLSIP-{now.strftime('%Y%m%d')}-TEST{index:02d}"
    return claim_id, {
        "claim_id": claim_id,
        "claim_status": "qc_pending",
        "claim_type": "claims",
        "hospital_id": HOSPITAL_ID,
        "hospital_name": HOSPITAL_NAME,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
        "submission_date": firestore.SERVER_TIMESTAMP,
        "form_data": {
            "patient_name": f"Test Patient {index}",
            "payer_name": "Test Insurance",
            "specialty": "General Medicine",
            "claimed_amount": 12345 + index * 100,
        },
        "created_by": "dummy_user_id",
        "created_by_email": f"tester{index}@example.com",
        "created_by_name": f"Tester {index}",
        "created_in_module": "claims",
    }


def seed_claims():
    initialise_firestore()
    db = firestore.client()

    now = datetime.utcnow()
    for i in range(1, CLAIM_COUNT + 1):
        claim_id, payload = generate_claim_payload(i, now)
        doc_ref = db.collection("direct_claims").document(claim_id)
        doc_ref.set(payload)

        # Add a sample transaction entry
        txn_id = str(uuid.uuid4())
        doc_ref.collection("transactions").document(txn_id).set({
            "transaction_id": txn_id,
            "claim_id": claim_id,
            "transaction_type": "CREATED",
            "performed_by": "dummy_user_id",
            "performed_by_email": "dummy@example.com",
            "performed_by_name": "Dummy User",
            "performed_by_role": "hospital_user",
            "timestamp": firestore.SERVER_TIMESTAMP,
            "previous_status": None,
            "new_status": "qc_pending",
            "remarks": "Seeded dummy claim for testing",
        })

        print(f"✅ Created dummy claim {claim_id} with transaction {txn_id}")


if __name__ == "__main__":
    seed_claims()

