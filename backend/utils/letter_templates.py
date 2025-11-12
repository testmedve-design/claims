"""
Helpers for building structured letter metadata for claim transactions.

These helpers prepare data required for rendering processor letters
such as approval, denial, and query notifications. The resulting data
is stored in transaction metadata so that the frontend can render the
letters dynamically.
"""
from __future__ import annotations

from datetime import datetime, date, timedelta
from typing import Any, Dict, Optional, Tuple


def _calculate_age_details(dob_str: Optional[str]) -> Tuple[Optional[int], Optional[str]]:
    if not dob_str:
        return None, None
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    except Exception:
        return None, None

    today = date.today()

    if dob > today:
        return 0, "DAYS"

    delta_days = (today - dob).days
    if delta_days < 30:
        return delta_days, "DAYS"

    years = today.year - dob.year
    months = today.month - dob.month
    days = today.day - dob.day

    if days < 0:
        months -= 1
    if months < 0:
        years -= 1
        months += 12

    if years <= 0:
        if months > 0:
            return months, "MONTHS"
        return delta_days, "DAYS"

    return years, "YRS"


def _calculate_dob_from_age(age_value: Optional[Any], age_unit: Optional[str]) -> Optional[str]:
    if age_value is None or age_unit not in ("DAYS", "MONTHS", "YRS"):
        return None

    try:
        age_int = int(age_value)
    except (TypeError, ValueError):
        return None

    today = date.today()
    dob = date(today.year, today.month, today.day)

    if age_unit == "DAYS":
        dob -= timedelta(days=age_int)
    elif age_unit == "MONTHS":
        month = dob.month - age_int
        year = dob.year
        while month <= 0:
            month += 12
            year -= 1
        dob = dob.replace(year=year, month=month)
    else:
        dob = dob.replace(year=dob.year - age_int)

    return dob.strftime("%Y-%m-%d")


try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover - fallback for older Python versions
    ZoneInfo = None  # type: ignore


IST_TZ = ZoneInfo("Asia/Kolkata") if ZoneInfo else None

COMPANY_INFO = {
    "name": "Medverve Healthcare Pvt Ltd",
    "address_lines": [
        "Rekha Classic Arch, 3rd Floor, #75,",
        "Panduranganagar, Bengaluru - 560076, India",
    ],
}


def _now_ist() -> datetime:
    if IST_TZ:
        return datetime.now(IST_TZ)
    return datetime.now()


def _to_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None

    if hasattr(value, "to_pydatetime"):
        try:
            return value.to_pydatetime()
        except Exception:
            return None

    if hasattr(value, "to_datetime"):
        try:
            return value.to_datetime()
        except Exception:
            return None

    if isinstance(value, datetime):
        return value

    if isinstance(value, str):
        # Try ISO format first
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            pass

        # Try basic YYYY-MM-DD
        try:
            return datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            pass

        # Try DD/MM/YYYY
        for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue

    return None


def _format_date(value: Any, default: Optional[str] = None) -> Optional[str]:
    dt_value = _to_datetime(value)
    if not dt_value:
        return default
    return dt_value.strftime("%d-%m-%Y")


def _format_currency(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    try:
        number = float(value)
        return f"{number:,.2f}"
    except (TypeError, ValueError):
        return str(value)


def _safe_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    return str(value)


def _calculate_disallowed_amount(
    claimed_amount: Any, approved_amount: Any
) -> Optional[str]:
    try:
        claimed = float(claimed_amount)
        approved = float(approved_amount)
        diff = claimed - approved
        if diff < 0:
            diff = 0.0
        return f"{diff:,.2f}"
    except (TypeError, ValueError):
        return None


def _build_hospital_info(claim_data: Dict[str, Any]) -> Dict[str, Any]:
    hospital_info = {
        "name": _safe_str(claim_data.get("hospital_name")),
        "address_lines": [],
    }

    # Hospital level details if available
    potential_keys = [
        "hospital_address",
        "hospital_address_line_1",
        "hospital_address_line_2",
        "hospital_city",
        "hospital_state",
        "hospital_pincode",
        "hospital_zipcode",
    ]

    for key in potential_keys:
        value = claim_data.get(key)
        if value:
            hospital_info["address_lines"].append(str(value))

    # Form data may also have address hints
    form_data = claim_data.get("form_data", {}) or {}
    for key in (
        "hospital_address",
        "hospital_city",
        "hospital_state",
        "hospital_pincode",
    ):
        value = form_data.get(key)
        if value and str(value) not in hospital_info["address_lines"]:
            hospital_info["address_lines"].append(str(value))

    # Ensure at least name is present
    if not hospital_info["name"]:
        hospital_info["name"] = _safe_str(form_data.get("hospital_name"))

    return hospital_info


def _build_patient_info(claim_data: Dict[str, Any]) -> Dict[str, Any]:
    form_data = claim_data.get("form_data", {}) or {}
    patient_data = claim_data.get("patient_details", {}) or {}

    admission_date = form_data.get("service_start_date") or patient_data.get(
        "admission_date"
    )
    discharge_date = form_data.get("service_end_date") or patient_data.get(
        "discharge_date"
    )

    date_of_birth = form_data.get("date_of_birth") or patient_data.get("date_of_birth")
    computed_age_value, computed_age_unit = _calculate_age_details(date_of_birth)
    if computed_age_value is not None:
        age_value = computed_age_value
        age_unit = computed_age_unit
    else:
        age_value = form_data.get("age") or patient_data.get("age")
        age_unit = form_data.get("age_unit") or patient_data.get("age_unit")
        if age_unit not in ("DAYS", "MONTHS", "YRS"):
            age_unit = None
        if age_value is not None and age_unit in ("DAYS", "MONTHS", "YRS") and not date_of_birth:
            derived_dob = _calculate_dob_from_age(age_value, age_unit)
            if derived_dob:
                date_of_birth = derived_dob

    patient_info = {
        "name": _safe_str(
            form_data.get("patient_name")
            or patient_data.get("patient_name")
            or claim_data.get("patient_name")
        ),
        "date_of_birth": _safe_str(date_of_birth),
        "age": _safe_str(age_value),
        "age_unit": _safe_str(age_unit),
        "gender": _safe_str(form_data.get("gender") or patient_data.get("gender")),
        "payer_patient_id": _safe_str(
            form_data.get("payer_patient_id") or patient_data.get("payer_patient_id")
        ),
        "admission_date": _format_date(admission_date),
        "discharge_date": _format_date(discharge_date),
        "speciality": _safe_str(
            form_data.get("specialty") or patient_data.get("speciality")
        ),
        "treated_doctor": _safe_str(
            form_data.get("doctor") or patient_data.get("treated_doctor")
        ),
        "line_of_treatment": _safe_str(
            form_data.get("treatment_line") or patient_data.get("line_of_treatment")
        ),
        "room_category": _safe_str(
            form_data.get("ward_type")
            or patient_data.get("ward_type")
            or patient_data.get("room_category")
        ),
    }

    if patient_info["age"]:
        unit_label_map = {
            "DAYS": "days",
            "MONTHS": "months",
            "YRS": "yrs",
        }
        unit_label = unit_label_map.get(str(patient_info.get("age_unit")).upper(), "")

        try:
            age_number = float(str(patient_info["age"]).split()[0])
            if age_number.is_integer():
                formatted_age = str(int(age_number))
            else:
                formatted_age = f"{age_number:.1f}"
            patient_info["age"] = (
                f"{formatted_age} {unit_label}".strip() if unit_label else formatted_age
            )
        except ValueError:
            if unit_label:
                patient_info["age"] = f"{patient_info['age']} {unit_label}".strip()

    if admission_date and discharge_date:
        start = _to_datetime(admission_date)
        end = _to_datetime(discharge_date)
        if start and end and end >= start:
            patient_info["length_of_stay"] = str((end - start).days + 1)

    return patient_info


def _build_financial_info(
    claim_data: Dict[str, Any], remarks: Optional[str]
) -> Dict[str, Any]:
    form_data = claim_data.get("form_data", {}) or {}
    financial_details = claim_data.get("financial_details", {}) or {}

    claimed_amount = (
        financial_details.get("claimed_amount") or form_data.get("claimed_amount")
    )
    approved_amount = (
        financial_details.get("approved_amount") or claim_data.get("approved_amount")
    )
    estimated_cost = (
        financial_details.get("total_bill_amount")
        or form_data.get("total_bill_amount")
        or financial_details.get("estimated_cost")
        or form_data.get("estimated_cost")
    )
    disallowed_amount = (
        financial_details.get("disallowed_amount") or form_data.get("disallowed_amount")
    )

    financials = {
        "claimed_amount": _format_currency(claimed_amount),
        "approved_amount": _format_currency(approved_amount),
        "estimated_cost": _format_currency(estimated_cost),
        "disallowed_amount": _format_currency(disallowed_amount),
        "remarks": _safe_str(remarks),
    }

    # If disallowed amount was not provided but we have claimed & approved, derive it
    if (
        disallowed_amount in (None, "", 0)
        and financials["claimed_amount"]
        and financials["approved_amount"]
    ):
        financials["disallowed_amount"] = _calculate_disallowed_amount(
            claimed_amount, approved_amount
        )

    return financials


def build_processor_letter_metadata(
    *,
    claim_id: str,
    claim_data: Dict[str, Any],
    new_status: str,
    remarks: Optional[str],
    query_details: Optional[Dict[str, Any]],
    processor_name: Optional[str] = None,
    processor_email: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Build structured letter metadata for a processor transaction.

    Returns a dictionary that can be stored under transaction metadata["letter"]
    or None if no letter should be generated for the provided status.
    """
    status_to_letter_type = {
        "claim_approved": "claim_approved",
        "claim_denial": "claim_denial",
        "need_more_info": "need_more_info",
    }

    letter_type = status_to_letter_type.get(new_status)
    if not letter_type:
        return None

    now = _now_ist()

    letter_data: Dict[str, Any] = {
        "type": letter_type,
        "generated_at": now.isoformat(),
        "letter_date": _format_date(now),
        "claim_number": _safe_str(claim_data.get("claim_id") or claim_id),
        "intimation_number": _safe_str(claim_data.get("intimation_number")),
        "submitted_on": _format_date(claim_data.get("submission_date")),
        "hospital": _build_hospital_info(claim_data),
        "patient": _build_patient_info(claim_data),
        "financials": _build_financial_info(claim_data, remarks),
        "issuer": COMPANY_INFO,
        "remarks": _safe_str(remarks),
        "generated_by": {
            "name": _safe_str(processor_name),
            "email": _safe_str(processor_email),
        },
    }

    if letter_type == "need_more_info":
        query_payload = query_details or {}
        letter_data["query_details"] = {
            "issue_categories": query_payload.get("issue_categories") or [],
            "repeat_issue": _safe_str(query_payload.get("repeat_issue")),
            "action_required": _safe_str(query_payload.get("action_required")),
            "remarks": _safe_str(query_payload.get("remarks") or remarks),
        }
    elif letter_type == "claim_denial":
        letter_data["denial_reason"] = _safe_str(remarks)
    elif letter_type == "claim_approved":
        letter_data["approval_summary"] = {
            "authorization_number": _safe_str(
                claim_data.get("authorization_number")
                or claim_data.get("authorization_no")
                or claim_data.get("form_data", {}).get("authorization_number")
            ),
            "total_authorized_amount": _format_currency(
                claim_data.get("total_authorized_amount")
                or claim_data.get("form_data", {}).get("total_authorized_amount")
            ),
        }

    return letter_data


