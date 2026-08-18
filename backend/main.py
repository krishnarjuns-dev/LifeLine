from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

# ============================================================
# IN-MEMORY DATABASE
# ============================================================

patients = []


# ============================================================
# PRIORITY ORDER
# ============================================================

PRIORITY_ORDER = {
    "EMERGENCY": 0,
    "URGENT": 1,
    "ROUTINE": 2,
}


# ============================================================
# TIME HELPERS
# ============================================================

def calculate_wait_minutes(created_at):
    try:
        created = datetime.fromisoformat(
            created_at
        )

        now = datetime.now()

        seconds = (
            now - created
        ).total_seconds()

        return max(
            0,
            int(seconds // 60)
        )

    except Exception:
        return 0


# ============================================================
# TRIAGE ENGINE
# ============================================================

def calculate_triage(
    symptoms,
    answers
):
    symptoms_lower = symptoms.lower()

    emergency_factors = []
    urgent_factors = []

    # --------------------------------------------------------
    # STRUCTURED QUESTIONS
    # --------------------------------------------------------

    if answers.get("breathing") == "Yes":
        emergency_factors.append(
            "Difficulty breathing"
        )

    if answers.get("chestPain") == "Yes":
        emergency_factors.append(
            "Severe or concerning chest pain"
        )

    if answers.get("fainting") == "Yes":
        emergency_factors.append(
            "Fainting or near-fainting"
        )

    if answers.get("worsening") == "Yes":
        urgent_factors.append(
            "Symptoms are getting worse"
        )

    if answers.get("medicalHistory") == "Yes":
        urgent_factors.append(
            "Important medical history"
        )

    # --------------------------------------------------------
    # TEXT RED FLAGS
    # --------------------------------------------------------

    emergency_keywords = [
        "unconscious",
        "cannot breathe",
        "can't breathe",
        "severe chest pain",
        "heart attack",
        "stroke",
        "seizure",
        "heavy bleeding",
        "not breathing",
    ]

    urgent_keywords = [
        "high fever",
        "severe pain",
        "vomiting blood",
        "blood in stool",
        "confusion",
        "very weak",
        "persistent vomiting",
    ]

    for keyword in emergency_keywords:
        if keyword in symptoms_lower:
            emergency_factors.append(
                f"Potential emergency symptom: {keyword}"
            )

    for keyword in urgent_keywords:
        if keyword in symptoms_lower:
            urgent_factors.append(
                f"Concerning symptom: {keyword}"
            )

    emergency_factors = list(
        dict.fromkeys(
            emergency_factors
        )
    )

    urgent_factors = list(
        dict.fromkeys(
            urgent_factors
        )
    )

    # --------------------------------------------------------
    # RISK SCORE
    # --------------------------------------------------------

    risk_score = 10

    risk_score += (
        len(emergency_factors) * 35
    )

    risk_score += (
        len(urgent_factors) * 15
    )

    if answers.get("duration") == "More than a week":
        risk_score += 5

    risk_score = min(
        risk_score,
        100
    )

    # --------------------------------------------------------
    # PRIORITY
    # --------------------------------------------------------

    if emergency_factors:
        priority = "EMERGENCY"

        message = (
            "Immediate medical attention may be needed."
        )

        reason = (
            "One or more potentially serious "
            "warning signs were identified."
        )

        factors = emergency_factors

    elif urgent_factors:
        priority = "URGENT"

        message = (
            "Priority medical review is recommended."
        )

        reason = (
            "The assessment identified symptoms "
            "or risk factors that may require "
            "earlier clinical evaluation."
        )

        factors = urgent_factors

    else:
        priority = "ROUTINE"

        message = (
            "Routine medical assessment is appropriate."
        )

        reason = (
            "No major emergency warning signs "
            "were identified from the information provided."
        )

        factors = []

    return {
        "priority": priority,
        "risk_score": risk_score,
        "message": message,
        "reason": reason,
        "factors": factors,
    }


# ============================================================
# QUEUE SORTING
# ============================================================

def sort_patients():
    for patient in patients:
        patient["wait_minutes"] = calculate_wait_minutes(
            patient["created_at"]
        )

        # ----------------------------------------------------
        # QUEUE RESCUE
        # ----------------------------------------------------

        if patient["priority"] == "EMERGENCY":
            threshold = 10

        elif patient["priority"] == "URGENT":
            threshold = 25

        else:
            threshold = 60

        patient["rescue_required"] = (
            patient["wait_minutes"] >= threshold
            and patient["status"] == "WAITING"
        )

    patients.sort(
        key=lambda patient: (
            0
            if patient["rescue_required"]
            else PRIORITY_ORDER.get(
                patient["priority"],
                3
            ),
            -patient["wait_minutes"],
        )
    )


# ============================================================
# TRIAGE API
# ============================================================

@app.route(
    "/api/triage",
    methods=["POST"]
)
def triage():

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "detail": "No data received"
            }), 400

        language = data.get(
            "language",
            "English"
        )

        symptoms = data.get(
            "symptoms",
            ""
        ).strip()

        answers = data.get(
            "answers",
            {}
        )

        if not symptoms:
            return jsonify({
                "detail": "Symptoms are required"
            }), 400

        result = calculate_triage(
            symptoms,
            answers
        )

        # ----------------------------------------------------
        # TOKEN
        # ----------------------------------------------------

        token = (
            "LL-"
            + str(
                len(patients) + 1
            ).zfill(3)
        )

        patient = {
            "id": str(uuid.uuid4()),

            "token": token,

            "language": language,

            "symptoms": symptoms,

            "answers": answers,

            "priority": result["priority"],

            "ai_priority": result["priority"],

            "risk_score": result["risk_score"],

            "reason": result["reason"],

            "factors": result["factors"],

            "status": "WAITING",

            "created_at": datetime.now().isoformat(),

            "doctor_override": False,

            "second_looks": 0,

            "rescue_required": False,
        }

        patients.append(
            patient
        )

        sort_patients()

        return jsonify({
            **result,
            "token": token,
        }), 200

    except Exception as error:

        print(
            "TRIAGE ERROR:",
            error
        )

        return jsonify({
            "detail": "Internal server error"
        }), 500


# ============================================================
# PATIENT QUEUE
# ============================================================

@app.route(
    "/api/patients",
    methods=["GET"]
)
def get_patients():

    sort_patients()

    return jsonify({
        "patients": patients
    }), 200


# ============================================================
# GET ONE PATIENT
# ============================================================

@app.route(
    "/api/patients/<patient_id>",
    methods=["GET"]
)
def get_patient(patient_id):

    sort_patients()

    patient = next(
        (
            p for p in patients
            if p["id"] == patient_id
        ),
        None
    )

    if not patient:
        return jsonify({
            "detail": "Patient not found"
        }), 404

    return jsonify({
        "patient": patient
    }), 200


# ============================================================
# DOCTOR PRIORITY OVERRIDE
# ============================================================

@app.route(
    "/api/patients/<patient_id>/priority",
    methods=["PUT"]
)
def update_priority(patient_id):

    data = request.get_json() or {}

    priority = data.get(
        "priority"
    )

    reason = data.get(
        "reason",
        "Doctor manually adjusted priority."
    )

    if priority not in PRIORITY_ORDER:
        return jsonify({
            "detail": "Invalid priority"
        }), 400

    patient = next(
        (
            p for p in patients
            if p["id"] == patient_id
        ),
        None
    )

    if not patient:
        return jsonify({
            "detail": "Patient not found"
        }), 404

    patient["priority"] = priority

    patient["doctor_override"] = True

    patient["override_reason"] = reason

    patient["override_at"] = (
        datetime.now().isoformat()
    )

    sort_patients()

    return jsonify({
        "patient": patient
    }), 200


# ============================================================
# PATIENT JOURNEY STATUS
# ============================================================

@app.route(
    "/api/patients/<patient_id>/status",
    methods=["PUT"]
)
def update_status(patient_id):

    data = request.get_json() or {}

    status = data.get(
        "status"
    )

    allowed_statuses = [
        "WAITING",
        "IN_REVIEW",
        "TREATMENT",
        "FOLLOW_UP",
        "RECOVERED",
    ]

    if status not in allowed_statuses:
        return jsonify({
            "detail": "Invalid status"
        }), 400

    patient = next(
        (
            p for p in patients
            if p["id"] == patient_id
        ),
        None
    )

    if not patient:
        return jsonify({
            "detail": "Patient not found"
        }), 404

    patient["status"] = status

    if status == "RECOVERED":
        patient["recovered_at"] = (
            datetime.now().isoformat()
        )

    sort_patients()

    return jsonify({
        "patient": patient
    }), 200


# ============================================================
# SECOND LOOK
# ============================================================

@app.route(
    "/api/patients/<patient_id>/second-look",
    methods=["POST"]
)
def second_look(patient_id):

    patient = next(
        (
            p for p in patients
            if p["id"] == patient_id
        ),
        None
    )

    if not patient:
        return jsonify({
            "detail": "Patient not found"
        }), 404

    patient["second_looks"] += 1

    patient["last_second_look"] = (
        datetime.now().isoformat()
    )

    # --------------------------------------------------------
    # Recalculate based on original answers.
    # In a future version this can receive NEW symptoms.
    # --------------------------------------------------------

    result = calculate_triage(
        patient["symptoms"],
        patient["answers"]
    )

    old_priority = patient["priority"]

    # Never silently downgrade a doctor override.
    if not patient["doctor_override"]:
        patient["priority"] = result[
            "priority"
        ]

        patient["risk_score"] = result[
            "risk_score"
        ]

        patient["factors"] = result[
            "factors"
        ]

        patient["reason"] = result[
            "reason"
        ]

    sort_patients()

    return jsonify({
        "message": (
            "Second-look assessment completed. "
            f"Previous priority: {old_priority}. "
            f"Current priority: {patient['priority']}."
        ),
        "patient": patient,
    }), 200


# ============================================================
# ANALYTICS
# ============================================================

@app.route(
    "/api/analytics",
    methods=["GET"]
)
def analytics():

    sort_patients()

    total = len(patients)

    emergency = sum(
        1
        for p in patients
        if p["priority"] == "EMERGENCY"
    )

    urgent = sum(
        1
        for p in patients
        if p["priority"] == "URGENT"
    )

    routine = sum(
        1
        for p in patients
        if p["priority"] == "ROUTINE"
    )

    rescue_cases = sum(
        1
        for p in patients
        if p["rescue_required"]
    )

    second_looks = sum(
        p.get(
            "second_looks",
            0
        )
        for p in patients
    )

    recovered = sum(
        1
        for p in patients
        if p["status"] == "RECOVERED"
    )

    average_wait = 0

    if total:
        average_wait = round(
            sum(
                p["wait_minutes"]
                for p in patients
            ) / total,
            1
        )

    statuses = {
        "WAITING": 0,
        "IN_REVIEW": 0,
        "TREATMENT": 0,
        "FOLLOW_UP": 0,
        "RECOVERED": 0,
    }

    for patient in patients:
        status = patient.get(
            "status",
            "WAITING"
        )

        if status in statuses:
            statuses[status] += 1

    return jsonify({
        "total_patients": total,

        "emergency": emergency,

        "urgent": urgent,

        "routine": routine,

        "average_wait": average_wait,

        "rescue_cases": rescue_cases,

        "second_looks": second_looks,

        "recovered": recovered,

        "statuses": statuses,
    }), 200


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route(
    "/",
    methods=["GET"]
)
def home():

    return jsonify({
        "status": "LifeLine backend running",

        "service": "Safe AI Triage",

        "patients": len(patients),
    })


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )