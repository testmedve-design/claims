# Resources API Documentation

## Overview
The resources API provides master data and dropdown options for the claims form.

**Base URL**: `http://localhost:5002`
**Required Auth**: None (public endpoints) or Token (for hospital-specific resources)

---

## Table of Contents
1. [Get Specialties](#1-get-specialties)
2. [Get Doctors](#2-get-doctors)
3. [Get Treatment Lines](#3-get-treatment-lines)
4. [Get ID Card Types](#4-get-id-card-types)
5. [Get Beneficiary Types](#5-get-beneficiary-types)
6. [Get Relationships](#6-get-relationships)
7. [Get Payer Types](#7-get-payer-types)
8. [Get Claim Types](#8-get-claim-types)
9. [Get Admission Types](#9-get-admission-types)
10. [Get Hospitalization Types](#10-get-hospitalization-types)
11. [Get Ward Types](#11-get-ward-types)

---

## 1. Get Specialties

**Endpoint**: `GET /api/resources/specialties`

**Description**: Get all medical specialties.

**Headers**:
```http
Authorization: Bearer <token>  // Optional for global resources
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchSpecialties = async () => {
  const response = await fetch(
    'http://localhost:5002/api/resources/specialties',
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "specialties": [
    {
      "specialty_id": "specialty_001",
      "name": "Cardiology",
      "code": "CARD",
      "description": "Heart and cardiovascular system",
      "is_active": true
    },
    {
      "specialty_id": "specialty_002",
      "name": "Neurology",
      "code": "NEURO",
      "description": "Brain and nervous system",
      "is_active": true
    },
    {
      "specialty_id": "specialty_003",
      "name": "Orthopedics",
      "code": "ORTHO",
      "description": "Bones and joints",
      "is_active": true
    }
  ],
  "total": 3
}
```

---

## 2. Get Doctors

**Endpoint**: `GET /api/resources/doctors`

**Description**: Get all doctors for a specific hospital.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| specialty | string | No | Filter by specialty |
| hospital_id | string | No | Filter by hospital ID |

**Example Request**:
```typescript
const fetchDoctors = async (specialty?: string) => {
  const token = localStorage.getItem('auth_token');
  const url = new URL('http://localhost:5002/api/resources/doctors');
  
  if (specialty) {
    url.searchParams.append('specialty', specialty);
  }
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "doctors": [
    {
      "doctor_id": "doctor_001",
      "name": "Dr. John Smith",
      "specialty": "Cardiology",
      "registration_number": "REG12345",
      "hospital_id": "hospital_123",
      "hospital_name": "City Hospital",
      "is_active": true
    },
    {
      "doctor_id": "doctor_002",
      "name": "Dr. Sarah Johnson",
      "specialty": "Cardiology",
      "registration_number": "REG67890",
      "hospital_id": "hospital_123",
      "hospital_name": "City Hospital",
      "is_active": true
    }
  ],
  "total": 2
}
```

---

## 3. Get Treatment Lines

**Endpoint**: `GET /api/resources/treatment-lines`

**Description**: Get all treatment lines for a specialty.

**Headers**:
```http
Content-Type: application/json
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| specialty | string | No | Filter by specialty |

**Example Request**:
```typescript
const fetchTreatmentLines = async (specialty: string) => {
  const url = new URL('http://localhost:5002/api/resources/treatment-lines');
  url.searchParams.append('specialty', specialty);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "treatment_lines": [
    {
      "treatment_line_id": "treatment_001",
      "name": "Medical Management",
      "specialty": "Cardiology",
      "description": "Non-surgical treatment",
      "is_active": true
    },
    {
      "treatment_line_id": "treatment_002",
      "name": "Surgical",
      "specialty": "Cardiology",
      "description": "Surgical intervention",
      "is_active": true
    }
  ],
  "total": 2
}
```

---

## 4. Get ID Card Types

**Endpoint**: `GET /api/resources/id-card-types`

**Description**: Get all available ID card types.

**Headers**:
```http
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchIdCardTypes = async () => {
  const response = await fetch(
    'http://localhost:5002/api/resources/id-card-types',
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "id_card_types": [
    {
      "id_card_type_id": "id_001",
      "name": "Aadhar",
      "description": "Aadhar Card",
      "is_active": true
    },
    {
      "id_card_type_id": "id_002",
      "name": "PAN",
      "description": "PAN Card",
      "is_active": true
    },
    {
      "id_card_type_id": "id_003",
      "name": "Driving License",
      "description": "Driving License",
      "is_active": true
    },
    {
      "id_card_type_id": "id_004",
      "name": "Passport",
      "description": "Passport",
      "is_active": true
    }
  ],
  "total": 4
}
```

---

## 5. Get Beneficiary Types

**Endpoint**: `GET /api/resources/beneficiary-types`

**Description**: Get all available beneficiary types.

**Headers**:
```http
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchBeneficiaryTypes = async () => {
  const response = await fetch(
    'http://localhost:5002/api/resources/beneficiary-types',
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "beneficiary_types": [
    {
      "beneficiary_type_id": "beneficiary_001",
      "name": "Self",
      "description": "Self",
      "is_active": true
    },
    {
      "beneficiary_type_id": "beneficiary_002",
      "name": "Dependent",
      "description": "Dependent",
      "is_active": true
    }
  ],
  "total": 2
}
```

---

## 6. Get Relationships

**Endpoint**: `GET /api/resources/relationships`

**Description**: Get all available relationship types.

**Headers**:
```http
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchRelationships = async () => {
  const response = await fetch(
    'http://localhost:5002/api/resources/relationships',
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "relationships": [
    {
      "relationship_id": "relationship_001",
      "name": "Self",
      "description": "Self",
      "is_active": true
    },
    {
      "relationship_id": "relationship_002",
      "name": "Spouse",
      "description": "Spouse",
      "is_active": true
    },
    {
      "relationship_id": "relationship_003",
      "name": "Child",
      "description": "Child",
      "is_active": true
    },
    {
      "relationship_id": "relationship_004",
      "name": "Parent",
      "description": "Parent",
      "is_active": true
    }
  ],
  "total": 4
}
```

---

## 7. Get Payer Types

**Endpoint**: `GET /api/resources/payer-types`

**Description**: Get all available payer types.

**Headers**:
```http
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchPayerTypes = async () => {
  const response = await fetch(
    'http://localhost:5002/api/resources/payer-types',
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "payer_types": [
    {
      "payer_type_id": "payer_001",
      "name": "TPA",
      "description": "Third Party Administrator",
      "is_active": true
    },
    {
      "payer_type_id": "payer_002",
      "name": "Insurance",
      "description": "Insurance Company",
      "is_active": true
    },
    {
      "payer_type_id": "payer_003",
      "name": "Corporate",
      "description": "Corporate Sponsor",
      "is_active": true
    }
  ],
  "total": 3
}
```

---

## 8. Get Claim Types

**Endpoint**: `GET /api/resources/claim-types`

**Description**: Get all available claim types.

**Headers**:
```http
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchClaimTypes = async () => {
  const response = await fetch(
    'http://localhost:5002/api/resources/claim-types',
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "claim_types": [
    {
      "claim_type_id": "claim_001",
      "name": "Inpatient",
      "description": "Inpatient Claim",
      "is_active": true
    },
    {
      "claim_type_id": "claim_002",
      "name": "Outpatient",
      "description": "Outpatient Claim",
      "is_active": true
    }
  ],
  "total": 2
}
```

---

## 9. Get Admission Types

**Endpoint**: `GET /api/resources/admission-types`

**Description**: Get all available admission types.

**Headers**:
```http
Content-Type: application/json
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "admission_types": [
    {
      "admission_type_id": "admission_001",
      "name": "Emergency",
      "description": "Emergency Admission",
      "is_active": true
    },
    {
      "admission_type_id": "admission_002",
      "name": "Planned",
      "description": "Planned Admission",
      "is_active": true
    }
  ],
  "total": 2
}
```

---

## 10. Get Hospitalization Types

**Endpoint**: `GET /api/resources/hospitalization-types`

**Description**: Get all available hospitalization types.

**Headers**:
```http
Content-Type: application/json
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "hospitalization_types": [
    {
      "hospitalization_type_id": "hospitalization_001",
      "name": "Emergency",
      "description": "Emergency Hospitalization",
      "is_active": true
    },
    {
      "hospitalization_type_id": "hospitalization_002",
      "name": "Planned",
      "description": "Planned Hospitalization",
      "is_active": true
    }
  ],
  "total": 2
}
```

---

## 11. Get Ward Types

**Endpoint**: `GET /api/resources/ward-types`

**Description**: Get all available ward types.

**Headers**:
```http
Content-Type: application/json
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "ward_types": [
    {
      "ward_type_id": "ward_001",
      "name": "General Ward",
      "description": "General Ward",
      "is_active": true
    },
    {
      "ward_type_id": "ward_002",
      "name": "Private Room",
      "description": "Private Room",
      "is_active": true
    },
    {
      "ward_type_id": "ward_003",
      "name": "ICU",
      "description": "Intensive Care Unit",
      "is_active": true
    }
  ],
  "total": 3
}
```

---

## Cascading Dropdowns

### Specialty → Doctors → Treatment Lines

```typescript
// 1. Load specialties on page load
const specialties = await fetchSpecialties();

// 2. When user selects a specialty, load doctors for that specialty
const handleSpecialtyChange = async (specialty: string) => {
  const doctors = await fetchDoctors(specialty);
  const treatmentLines = await fetchTreatmentLines(specialty);
  
  // Update form dropdowns
  setDoctorOptions(doctors.doctors);
  setTreatmentLineOptions(treatmentLines.treatment_lines);
};

// 3. User can now select doctor and treatment line
```

---

## Caching Strategy

```typescript
// Cache resources to avoid repeated API calls
const resourceCache = new Map<string, any>();

const getCachedResource = async (
  key: string,
  fetchFunction: () => Promise<any>,
  ttl: number = 60 * 60 * 1000 // 1 hour
) => {
  const cached = resourceCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await fetchFunction();
  resourceCache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  return data;
};

// Usage
const specialties = await getCachedResource(
  'specialties',
  fetchSpecialties
);
```

---

## Complete Form Loading Example

```typescript
const loadFormResources = async () => {
  try {
    // Load all resources in parallel
    const [
      specialties,
      idCardTypes,
      beneficiaryTypes,
      relationships,
      payerTypes,
      claimTypes,
      admissionTypes,
      hospitalizationTypes,
      wardTypes
    ] = await Promise.all([
      fetchSpecialties(),
      fetchIdCardTypes(),
      fetchBeneficiaryTypes(),
      fetchRelationships(),
      fetchPayerTypes(),
      fetchClaimTypes(),
      fetchAdmissionTypes(),
      fetchHospitalizationTypes(),
      fetchWardTypes()
    ]);

    // Set form options
    setSpecialtyOptions(specialties.specialties);
    setIdCardTypeOptions(idCardTypes.id_card_types);
    setBeneficiaryTypeOptions(beneficiaryTypes.beneficiary_types);
    setRelationshipOptions(relationships.relationships);
    setPayerTypeOptions(payerTypes.payer_types);
    setClaimTypeOptions(claimTypes.claim_types);
    setAdmissionTypeOptions(admissionTypes.admission_types);
    setHospitalizationTypeOptions(hospitalizationTypes.hospitalization_types);
    setWardTypeOptions(wardTypes.ward_types);
    
    console.log('✅ All form resources loaded');
  } catch (error) {
    console.error('❌ Error loading form resources:', error);
  }
};
```

---

## Best Practices

1. **Parallel Loading** - Load all resources in parallel using `Promise.all()`
2. **Caching** - Cache resources to reduce API calls
3. **Error Handling** - Show error messages if resources fail to load
4. **Loading State** - Show loading indicators while fetching
5. **Fallback Values** - Provide default options if API fails
6. **Cascading Dropdowns** - Load dependent dropdowns dynamically
7. **Pre-loading** - Load resources on app initialization

