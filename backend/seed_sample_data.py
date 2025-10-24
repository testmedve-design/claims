#!/usr/bin/env python3
"""
Script to seed Firebase collections with sample hospital-specific data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config.firebase_config import get_firestore
from firebase_admin import firestore
import json
from datetime import datetime

def seed_sample_data():
    """Seed Firebase collections with sample data for hospital W9TVTnuE1hIFgeFYi68c"""
    try:
        db = get_firestore()
        hospital_id = "W9TVTnuE1hIFgeFYi68c"
        hospital_name = "NANO HOSPITAL"
        
        print(f"🌱 Seeding sample data for hospital: {hospital_name} ({hospital_id})")
        
        # 1. Seed Payer Affiliations
        print("📋 Seeding payer affiliations...")
        payer_affiliations_data = {
            'hospital_id': hospital_id,
            'hospital_name': hospital_name,
            'affiliated_payers': [
                {
                    'payer_id': 'cghs_001',
                    'payer_name': 'CGHS',
                    'payer_type': 'Government',
                    'payer_code': 'CGHS',
                    'affiliated_at': datetime.now(),
                    'affiliated_by': 'admin',
                    'affiliated_by_email': 'admin@nanohospital.com'
                },
                {
                    'payer_id': 'esic_001',
                    'payer_name': 'ESIC',
                    'payer_type': 'Government',
                    'payer_code': 'ESIC',
                    'affiliated_at': datetime.now(),
                    'affiliated_by': 'admin',
                    'affiliated_by_email': 'admin@nanohospital.com'
                },
                {
                    'payer_id': 'tpa_001',
                    'payer_name': 'MediAssist',
                    'payer_type': 'TPA',
                    'payer_code': 'MEDI001',
                    'affiliated_at': datetime.now(),
                    'affiliated_by': 'admin',
                    'affiliated_by_email': 'admin@nanohospital.com'
                }
            ],
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        db.collection('payer_affiliations').document(f'{hospital_id}_payers').set(payer_affiliations_data)
        print(f"✅ Added {len(payer_affiliations_data['affiliated_payers'])} payer affiliations")
        
        # 2. Seed Specialties
        print("🏥 Seeding specialties...")
        specialties_data = [
            {
                'specialty_name': 'Cardiology',
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'description': 'Heart and cardiovascular diseases treatment',
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'specialty_name': 'Neurology',
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'description': 'Brain and nervous system disorders',
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'specialty_name': 'Orthopedics',
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'description': 'Bone, joint, and muscle disorders',
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'specialty_name': 'General Medicine',
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'description': 'General medical conditions and internal medicine',
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
        ]
        
        for specialty in specialties_data:
            doc_ref = db.collection('specialties').add(specialty)
            print(f"✅ Added specialty: {specialty['specialty_name']}")
        
        # 3. Seed Doctors
        print("👨‍⚕️ Seeding doctors...")
        doctors_data = [
            {
                'doctor_name': 'Dr. Rajesh Kumar',
                'specialty': 'Cardiology',
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'qualification': 'MD, DM Cardiology',
                'experience_years': 15,
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'doctor_name': 'Dr. Priya Sharma',
                'specialty': 'Cardiology',
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'qualification': 'MD, DM Cardiology',
                'experience_years': 12,
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'doctor_name': 'Dr. Amit Singh',
                'specialty': 'Neurology',
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'qualification': 'MD, DM Neurology',
                'experience_years': 10,
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'doctor_name': 'Dr. Sunita Patel',
                'specialty': 'Orthopedics',
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'qualification': 'MS Orthopedics',
                'experience_years': 8,
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'doctor_name': 'Dr. Vikram Gupta',
                'specialty': 'General Medicine',
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'qualification': 'MD Medicine',
                'experience_years': 20,
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
        ]
        
        for doctor in doctors_data:
            doc_ref = db.collection('doctors').add(doctor)
            print(f"✅ Added doctor: {doctor['doctor_name']} ({doctor['specialty']})")
        
        # 4. Seed Ward Types (Global collection)
        print("🏥 Seeding ward types...")
        ward_types_data = [
            {
                'ward_type_name': 'General Ward',
                'description': 'Standard general ward accommodation',
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'ward_type_name': 'Private Ward',
                'description': 'Private room accommodation',
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'ward_type_name': 'ICU',
                'description': 'Intensive Care Unit',
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            },
            {
                'ward_type_name': 'Semi-Private Ward',
                'description': 'Semi-private room accommodation',
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
        ]
        
        for ward in ward_types_data:
            doc_ref = db.collection('wards').add(ward)
            print(f"✅ Added ward type: {ward['ward_type_name']}")
        
        print(f"\n🎉 Sample data seeding completed successfully!")
        print(f"📊 Summary:")
        print(f"   - Payer Affiliations: {len(payer_affiliations_data['affiliated_payers'])}")
        print(f"   - Specialties: {len(specialties_data)}")
        print(f"   - Doctors: {len(doctors_data)}")
        print(f"   - Ward Types: {len(ward_types_data)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error seeding sample data: {str(e)}")
        return False

if __name__ == "__main__":
    seed_sample_data()
