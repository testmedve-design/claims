"""
Resources API routes for reference data
"""
from flask import Blueprint, request, jsonify
from firebase_config import get_firestore
from middleware import require_claims_access

resources_bp = Blueprint('resources', __name__)

@resources_bp.route('/payers', methods=['GET'])
def get_payers():
    """Get hospital-specific payers from payer_affiliations collection"""
    try:
        # Get hospital_id from query parameter or authentication
        hospital_id = request.args.get('hospital_id') or getattr(request, 'hospital_id', '')
        
        if not hospital_id:
            return jsonify({
                "success": False,
                "error": "Hospital ID is required",
                "message": "Please provide hospital_id parameter or ensure user is authenticated"
            }), 400
        
        # Get real data from Firestore
        db = get_firestore()
        affiliations_ref = db.collection('payer_affiliations')
        
        # Filter by hospital
        affiliations_query = affiliations_ref.where('hospital_id', '==', hospital_id)
        affiliations_docs = affiliations_query.get()
        
        payers = []
        for doc in affiliations_docs:
            affiliation_data = doc.to_dict()
            affiliated_payers = affiliation_data.get('affiliated_payers', [])
            
            # Extract payer information from affiliations
            for payer_affiliation in affiliated_payers:
                payer_data = {
                    'payer_id': payer_affiliation.get('payer_id'),
                    'payer_name': payer_affiliation.get('payer_name'),
                    'payer_type': payer_affiliation.get('payer_type'),
                    'payer_code': payer_affiliation.get('payer_code'),
                    'affiliated_at': payer_affiliation.get('affiliated_at'),
                    'affiliated_by': payer_affiliation.get('affiliated_by'),
                    'affiliated_by_email': payer_affiliation.get('affiliated_by_email')
                }
                payers.append(payer_data)
        
        # If no payers found, provide helpful message
        if len(payers) == 0:
            return jsonify({
                "success": True,
                "payers": [],
                "total": 0,
                "message": f"No payers found for hospital {hospital_id}. Please contact administrator to add payer affiliations for your hospital."
            }), 200
        
        return jsonify({
            "success": True,
            "payers": payers,
            "total": len(payers)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch payers",
            "details": str(e)
        }), 500

@resources_bp.route('/specialties', methods=['GET'])
def get_specialties():
    """Get specialties from Firestore filtered by hospital"""
    try:
        # Get hospital_id from query parameter or authentication
        hospital_id = request.args.get('hospital_id') or getattr(request, 'hospital_id', '')
        
        if not hospital_id:
            return jsonify({
                "success": False,
                "error": "Hospital ID is required",
                "message": "Please provide hospital_id parameter or ensure user is authenticated"
            }), 400
        
        # Get real data from Firestore
        db = get_firestore()
        
        # Get the specialty_affiliations document for this hospital
        affiliation_doc = db.collection('specialty_affiliations').document(hospital_id).get()
        
        if not affiliation_doc.exists:
            return jsonify({
                "success": False,
                "error": "Hospital not found",
                "message": f"Hospital with ID {hospital_id} not found in specialty_affiliations"
            }), 404
        
        affiliation_data = affiliation_doc.to_dict()
        affiliated_specialties = affiliation_data.get('affiliated_specialties', [])
        
        specialties = []
        for specialty in affiliated_specialties:
            # Only include active specialties
            if specialty.get('status') == 'active':
                specialties.append({
                    'specialty_id': specialty.get('specialty_id', ''),
                    'specialty_name': specialty.get('specialty_name', ''),
                    'description': specialty.get('description', ''),
                    'status': specialty.get('status', ''),
                    'affiliated_at': specialty.get('affiliated_at', ''),
                    'hospital_id': hospital_id,
                    'hospital_name': affiliation_data.get('hospital_name', '')
                })
        
        # If no specialties found for this hospital, provide helpful message
        if len(specialties) == 0:
            return jsonify({
                "success": True,
                "specialties": [],
                "total": 0,
                "message": f"No specialties found for hospital {hospital_id}. Please contact administrator to add specialties for your hospital."
            }), 200
        
        return jsonify({
            "success": True,
            "specialties": specialties,
            "total": len(specialties)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch specialties",
            "details": str(e)
        }), 500

@resources_bp.route('/insurers', methods=['GET'])
def get_insurers():
    """Get hospital-specific insurers from payer_affiliations collection (same as payers)"""
    try:
        # Get hospital_id from query parameter or authentication
        hospital_id = request.args.get('hospital_id') or getattr(request, 'hospital_id', '')
        
        if not hospital_id:
            return jsonify({
                "success": False,
                "error": "Hospital ID is required",
                "message": "Please provide hospital_id parameter or ensure user is authenticated"
            }), 400
        
        # Get real data from Firestore
        db = get_firestore()
        affiliations_ref = db.collection('payer_affiliations')
        
        # Filter by hospital
        affiliations_query = affiliations_ref.where('hospital_id', '==', hospital_id)
        affiliations_docs = affiliations_query.get()
        
        insurers = []
        for doc in affiliations_docs:
            affiliation_data = doc.to_dict()
            affiliated_payers = affiliation_data.get('affiliated_payers', [])
            
            # Extract insurer information from affiliations (same as payers)
            for payer_affiliation in affiliated_payers:
                # Only include payers that are insurers (payer_type = 'Insurance Company')
                if payer_affiliation.get('payer_type') == 'Insurance Company':
                    insurer_data = {
                        'insurer_id': payer_affiliation.get('payer_id'),
                        'insurer_name': payer_affiliation.get('payer_name'),
                        'insurer_type': payer_affiliation.get('payer_type'),
                        'insurer_code': payer_affiliation.get('payer_code'),
                        'affiliated_at': payer_affiliation.get('affiliated_at'),
                        'affiliated_by': payer_affiliation.get('affiliated_by'),
                        'affiliated_by_email': payer_affiliation.get('affiliated_by_email')
                    }
                    insurers.append(insurer_data)
        
        # If no insurers found, provide helpful message
        if len(insurers) == 0:
            return jsonify({
                "success": True,
                "insurers": [],
                "total": 0,
                "message": f"No insurers found for hospital {hospital_id}. Please contact administrator to add insurer affiliations for your hospital."
            }), 200
        
        return jsonify({
            "success": True,
            "insurers": insurers,
            "total": len(insurers)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch insurers",
            "details": str(e)
        }), 500

@resources_bp.route('/ward-types', methods=['GET'])
def get_ward_types():
    """Get ward types from Firestore (GLOBAL - not hospital-specific)"""
    try:
        # Get real data from Firestore
        db = get_firestore()
        wards_ref = db.collection('wards')
        
        # Get all wards (global collection)
        wards_docs = wards_ref.get()
        
        ward_types = []
        for doc in wards_docs:
            ward_data = doc.to_dict()
            ward_data['ward_type_id'] = doc.id  # Use document ID as ward_type_id
            ward_types.append(ward_data)
        
        # If no wards found, provide helpful message
        if len(ward_types) == 0:
            return jsonify({
                "success": True,
                "ward_types": [],
                "total": 0,
                "message": "No ward types found in the system. Please contact administrator to add ward types."
            }), 200
        
        return jsonify({
            "success": True,
            "ward_types": ward_types,
            "total": len(ward_types)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch ward types",
            "details": str(e)
        }), 500

@resources_bp.route('/doctors', methods=['GET'])
def get_doctors():
    """Get doctors by specialty and hospital from Firestore"""
    try:
        # Get hospital_id from query parameter or authentication
        hospital_id = request.args.get('hospital_id') or getattr(request, 'hospital_id', '')
        specialty = request.args.get('specialty')
        
        if not hospital_id:
            return jsonify({
                "success": False,
                "error": "Hospital ID is required",
                "message": "Please provide hospital_id parameter or ensure user is authenticated"
            }), 400
        
        # Get real data from Firestore
        db = get_firestore()
        doctors_ref = db.collection('doctors')
        
        # Build query based on filters
        if specialty:
            doctors_query = doctors_ref.where('hospital_id', '==', hospital_id).where('specialty_name', '==', specialty)
        else:
            doctors_query = doctors_ref.where('hospital_id', '==', hospital_id)
        
        doctors_docs = doctors_query.get()
        
        doctors = []
        for doc in doctors_docs:
            doctor_data = doc.to_dict()
            doctor_data['doctor_id'] = doc.id  # Use document ID as doctor_id
            doctors.append(doctor_data)
        
        # If no doctors found, provide helpful message
        if len(doctors) == 0:
            message = f"No doctors found for hospital {hospital_id}"
            if specialty:
                message += f" and specialty '{specialty}'"
            message += ". Please contact administrator to add doctors for your hospital."
            
            return jsonify({
                "success": True,
                "doctors": [],
                "total": 0,
                "message": message
            }), 200
        
        return jsonify({
            "success": True,
            "doctors": doctors,
            "total": len(doctors)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch doctors",
            "details": str(e)
        }), 500

@resources_bp.route('/couriers', methods=['GET'])
def get_couriers():
    """Get available couriers from Firestore"""
    try:
        # Get real data from Firestore
        db = get_firestore()
        couriers_ref = db.collection('couriers')
        couriers_docs = couriers_ref.get()
        
        couriers = []
        for doc in couriers_docs:
            courier_data = doc.to_dict()
            courier_data['courier_id'] = doc.id  # Use document ID as courier_id
            couriers.append(courier_data)
        
        # If no couriers found, provide sample data
        if len(couriers) == 0:
            sample_couriers = [
                {
                    "courier_id": "bluedart",
                    "courier_name": "Blue Dart",
                    "contact_number": "+91-1800-233-1234",
                    "status": "active"
                },
                {
                    "courier_id": "dtdc",
                    "courier_name": "DTDC",
                    "contact_number": "+91-1800-233-1234",
                    "status": "active"
                },
                {
                    "courier_id": "fedex",
                    "courier_name": "FedEx",
                    "contact_number": "+91-1800-233-1234",
                    "status": "active"
                },
                {
                    "courier_id": "ups",
                    "courier_name": "UPS",
                    "contact_number": "+91-1800-233-1234",
                    "status": "active"
                }
            ]
            return jsonify({
                "success": True,
                "couriers": sample_couriers,
                "total": len(sample_couriers),
                "message": "Using sample courier data"
            }), 200
        
        return jsonify({
            "success": True,
            "couriers": couriers,
            "total": len(couriers)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch couriers",
            "details": str(e)
        }), 500

@resources_bp.route('/treatment-lines', methods=['GET'])
def get_treatment_lines():
    """Get treatment lines from Firestore (GLOBAL - not hospital-specific)"""
    try:
        specialty = request.args.get('specialty')
        
        # Get real data from Firestore
        db = get_firestore()
        treatment_lines_ref = db.collection('treatment_lines')
        
        # Get all treatment lines (global collection)
        treatment_lines_docs = treatment_lines_ref.get()
        
        treatment_lines = []
        for doc in treatment_lines_docs:
            treatment_line_data = doc.to_dict()
            treatment_line_data['treatment_line_id'] = doc.id  # Use document ID as treatment_line_id
            treatment_lines.append(treatment_line_data)
        
        # Filter by specialty if provided
        if specialty:
            treatment_lines = [tl for tl in treatment_lines if tl.get('specialty') == specialty]
        
        # If no treatment lines found, provide helpful message
        if len(treatment_lines) == 0:
            return jsonify({
                "success": True,
                "treatment_lines": [],
                "total": 0,
                "message": "No treatment lines found in the system. Please contact administrator to add treatment lines."
            }), 200
        
        return jsonify({
            "success": True,
            "treatment_lines": treatment_lines,
            "total": len(treatment_lines)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch treatment lines",
            "details": str(e)
        }), 500

@resources_bp.route('/id-card-types', methods=['GET'])
def get_id_card_types():
    """Get available ID card types from Firestore (GLOBAL - not hospital-specific)"""
    try:
        # Get real data from Firestore
        db = get_firestore()
        id_card_types_ref = db.collection('id_card_types')
        
        # Get all ID card types (global collection)
        id_card_types_docs = id_card_types_ref.get()
        
        id_card_types = []
        for doc in id_card_types_docs:
            id_card_type_data = doc.to_dict()
            id_card_type_data['id_card_type_id'] = doc.id  # Use document ID as id_card_type_id
            id_card_types.append(id_card_type_data)
        
        # If no ID card types found, provide helpful message
        if len(id_card_types) == 0:
            return jsonify({
                "success": True,
                "id_card_types": [],
                "total": 0,
                "message": "No ID card types found in the system. Please contact administrator to add ID card types."
            }), 200
        
        return jsonify({
            "success": True,
            "id_card_types": id_card_types,
            "total": len(id_card_types)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch ID card types",
            "details": str(e)
        }), 500

@resources_bp.route('/beneficiary-types', methods=['GET'])
def get_beneficiary_types():
    """Get available beneficiary types from Firestore (GLOBAL - not hospital-specific)"""
    try:
        # Get real data from Firestore
        db = get_firestore()
        beneficiary_types_ref = db.collection('beneficiary_types')
        
        # Get all beneficiary types (global collection)
        beneficiary_types_docs = beneficiary_types_ref.get()
        
        beneficiary_types = []
        for doc in beneficiary_types_docs:
            beneficiary_type_data = doc.to_dict()
            beneficiary_type_data['beneficiary_type_id'] = doc.id  # Use document ID as beneficiary_type_id
            beneficiary_types.append(beneficiary_type_data)
        
        # If no beneficiary types found, provide helpful message
        if len(beneficiary_types) == 0:
            return jsonify({
                "success": True,
                "beneficiary_types": [],
                "total": 0,
                "message": "No beneficiary types found in the system. Please contact administrator to add beneficiary types."
            }), 200
        
        return jsonify({
            "success": True,
            "beneficiary_types": beneficiary_types,
            "total": len(beneficiary_types)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch beneficiary types",
            "details": str(e)
        }), 500

@resources_bp.route('/relationships', methods=['GET'])
def get_relationships():
    """Get available relationship types from Firestore (GLOBAL - not hospital-specific)"""
    try:
        # Get real data from Firestore
        db = get_firestore()
        relationships_ref = db.collection('relationships')
        
        # Get all relationships (global collection)
        relationships_docs = relationships_ref.get()
        
        relationships = []
        for doc in relationships_docs:
            relationship_data = doc.to_dict()
            relationship_data['relationship_id'] = doc.id  # Use document ID as relationship_id
            relationships.append(relationship_data)
        
        # If no relationships found, provide helpful message
        if len(relationships) == 0:
            return jsonify({
                "success": True,
                "relationships": [],
                "total": 0,
                "message": "No relationships found in the system. Please contact administrator to add relationships."
            }), 200
        
        return jsonify({
            "success": True,
            "relationships": relationships,
            "total": len(relationships)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch relationships",
            "details": str(e)
        }), 500

@resources_bp.route('/payer-types', methods=['GET'])
def get_payer_types():
    """Get available payer types from Firestore (GLOBAL - not hospital-specific)"""
    try:
        # Get real data from Firestore
        db = get_firestore()
        payer_types_ref = db.collection('payer_types')
        
        # Get all payer types (global collection)
        payer_types_docs = payer_types_ref.get()
        
        payer_types = []
        for doc in payer_types_docs:
            payer_type_data = doc.to_dict()
            payer_type_data['payer_type_id'] = doc.id  # Use document ID as payer_type_id
            payer_types.append(payer_type_data)
        
        # If no payer types found, provide helpful message
        if len(payer_types) == 0:
            return jsonify({
                "success": True,
                "payer_types": [],
                "total": 0,
                "message": "No payer types found in the system. Please contact administrator to add payer types."
            }), 200
        
        return jsonify({
            "success": True,
            "payer_types": payer_types,
            "total": len(payer_types)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch payer types",
            "details": str(e)
        }), 500

@resources_bp.route('/claim-types', methods=['GET'])
def get_claim_types():
    """Get available claim types from Firestore (GLOBAL - not hospital-specific)"""
    try:
        # Get real data from Firestore
        db = get_firestore()
        claim_types_ref = db.collection('claim_types')
        
        # Get all claim types (global collection)
        claim_types_docs = claim_types_ref.get()
        
        claim_types = []
        for doc in claim_types_docs:
            claim_type_data = doc.to_dict()
            claim_type_data['claim_type_id'] = doc.id  # Use document ID as claim_type_id
            claim_types.append(claim_type_data)
        
        # If no claim types found, provide helpful message
        if len(claim_types) == 0:
            return jsonify({
                "success": True,
                "claim_types": [],
                "total": 0,
                "message": "No claim types found in the system. Please contact administrator to add claim types."
            }), 200
        
        return jsonify({
            "success": True,
            "claim_types": claim_types,
            "total": len(claim_types)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch claim types",
            "details": str(e)
        }), 500

@resources_bp.route('/banks', methods=['GET'])
def get_banks():
    """Get available banks from Firestore (GLOBAL - not hospital-specific)"""
    try:
        # Get real data from Firestore
        db = get_firestore()
        banks_ref = db.collection('banks')
        
        # Get all banks (global collection)
        banks_docs = banks_ref.get()
        
        banks = []
        for doc in banks_docs:
            bank_data = doc.to_dict()
            bank_data['bank_id'] = doc.id  # Use document ID as bank_id
            banks.append(bank_data)
        
        # If no banks found, provide helpful message
        if len(banks) == 0:
            return jsonify({
                "success": True,
                "banks": [],
                "total": 0,
                "message": "No banks found in the system. Please contact administrator to add banks."
            }), 200
        
        return jsonify({
            "success": True,
            "banks": banks,
            "total": len(banks)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch banks",
            "details": str(e)
        }), 500

@resources_bp.route('/admission-types', methods=['GET'])
def get_admission_types():
    """Get available admission types from Firestore (GLOBAL - not hospital-specific)"""
    try:
        # Get real data from Firestore
        db = get_firestore()
        admission_types_ref = db.collection('admission_types')
        
        # Get all admission types (global collection)
        admission_types_docs = admission_types_ref.get()
        
        admission_types = []
        for doc in admission_types_docs:
            admission_type_data = doc.to_dict()
            admission_type_data['admission_type_id'] = doc.id  # Use document ID as admission_type_id
            admission_types.append(admission_type_data)
        
        # If no admission types found, provide helpful message
        if len(admission_types) == 0:
            return jsonify({
                "success": True,
                "admission_types": [],
                "total": 0,
                "message": "No admission types found in the system. Please contact administrator to add admission types."
            }), 200
        
        return jsonify({
            "success": True,
            "admission_types": admission_types,
            "total": len(admission_types)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to fetch admission types",
            "details": str(e)
        }), 500

