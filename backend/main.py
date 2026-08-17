from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)


# =========================================================
# IN-MEMORY DATA
# =========================================================

patient_queue = []
patient_statuses = {}


# =========================================================
# TRIAGE ENGINE
# =========================================================

def run_triage(symptoms, answers):

    symptoms_text = (symptoms or "").lower()

    duration = answers.get("duration", "")
    worsening = answers.get("worsening", "")
    breathing = answers.get("breathing", "")
    chest_pain = answers.get("chestPain", "")
    fainting = answers.get("fainting", "")
    medical_history = answers.get("medicalHistory", "")

    emergency_factors = []
    urgent_factors = []

    # -----------------------------
    # EMERGENCY SAFETY RULES
    # -----------------------------

    if breathing == "Yes":
        emergency_factors.append("Difficulty breathing")

    if chest_pain == "Yes":
        emergency_factors.append(
            "Severe or concerning chest pain"
        )

    if fainting == "Yes":
        emergency_factors.append(
            "Fainting or near-fainting"
        )

    emergency_keywords = [
        "severe chest pain",
        "crushing chest pain",
        "pressure in chest",
        "can't breathe",
        "cannot breathe",
        "difficulty breathing",
        "shortness of breath",
        "unconscious",
        "unresponsive",
        "fainted",
        "passing out",
        "severe bleeding",
        "heavy bleeding",
        "stroke",
        "seizure"
    ]

    for keyword in emergency_keywords:

        if keyword in symptoms_text:

            emergency_factors.append(
                f"Possible warning sign: {keyword}"
            )

    # -----------------------------
    # URGENT FACTORS
    # -----------------------------

    if worsening == "Yes":
        urgent_factors.append(
            "Symptoms are getting worse"
        )

    if medical_history == "Yes":
        urgent_factors.append(
            "Important medical history reported"
        )

    if duration == "More than a week":
        urgent_factors.append(
            "Symptoms have persisted for more than a week"
        )

    # -----------------------------
    # PRIORITY
    # -----------------------------

    if emergency_factors:

        return {
            "priority": "EMERGENCY",
            "message": "Immediate medical attention may be needed",
            "reason": (
                "Your answers contain one or more warning signs "
                "that should not wait in a routine queue."
            ),
            "factors": emergency_factors
        }

    elif urgent_factors:

        return {
            "priority": "URGENT",
            "message": "Prompt medical attention is recommended",
            "reason": (
                "One or more factors suggest that this case "
                "may need earlier clinical review."
            ),
            "factors": urgent_factors
        }

    else:

        return {
            "priority": "ROUTINE",
            "message": "Routine medical review may be appropriate",
            "reason": (
                "No immediate warning signs were identified "
                "from the information provided."
            ),
            "factors": []
        }


# =========================================================
# PATIENT SUMMARY
# =========================================================

def create_patient_summary(symptoms, answers, result):

    red_flags = (
        ", ".join(result["factors"])
        if result["factors"]
        else "None identified"
    )

    history = (
        "Important medical history reported"
        if answers.get("medicalHistory") == "Yes"
        else "No important medical history reported"
    )

    return {
        "chief_complaint": symptoms,
        "duration": answers.get(
            "duration",
            "Not provided"
        ),
        "red_flags": red_flags,
        "relevant_history": history,
        "priority_rationale": result["reason"]
    }


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "LifeLine backend is running",
        "service": "LifeLine Safe AI Triage Engine",
        "queue_size": len(patient_queue)
    })


# =========================================================
# PATIENT TRIAGE
# =========================================================

@app.route("/api/triage", methods=["POST"])
def triage():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "detail": "No JSON data received"
            }), 400

        language = data.get(
            "language",
            "English"
        )

        symptoms = data.get(
            "symptoms",
            ""
        )

        answers = data.get(
            "answers",
            {}
        )

        if not symptoms.strip():

            return jsonify({
                "detail": (
                    "Please describe the main symptom "
                    "or concern."
                )
            }), 400

        required_answers = [
            "duration",
            "worsening",
            "breathing",
            "chestPain",
            "fainting",
            "medicalHistory"
        ]

        for field in required_answers:

            if not answers.get(field):

                return jsonify({
                    "detail":
                        f"Please answer the question: {field}"
                }), 400

        # Run triage
        result = run_triage(
            symptoms,
            answers
        )

        # Generate patient ID
        patient_id = str(
            uuid.uuid4()
        )[:8].upper()

        # Create doctor summary
        summary = create_patient_summary(
            symptoms,
            answers,
            result
        )

        # Create queue patient
        patient = {

            "id": patient_id,

            "queue_number":
                len(patient_queue) + 1,

            "created_at":
                datetime.now().isoformat(),

            "language":
                language,

            "symptoms":
                symptoms,

            "answers":
                answers,

            "priority":
                result["priority"],

            "original_priority":
                result["priority"],

            "message":
                result["message"],

            "reason":
                result["reason"],

            "factors":
                result["factors"],

            "summary":
                summary,

            "status":
                "waiting",

            "override_log":
                []
        }

        # Add patient to queue
        patient_queue.append(patient)

        # Store status
        patient_statuses[
            patient_id
        ] = "waiting"

        return jsonify({

            **result,

            "patient_id":
                patient_id,

            "queue_number":
                patient["queue_number"]

        }), 200

    except Exception as error:

        print(
            "TRIAGE ERROR:",
            error
        )

        return jsonify({
            "detail": str(error)
        }), 500


# =========================================================
# GET DOCTOR QUEUE
# =========================================================

@app.route(
    "/api/queue",
    methods=["GET"]
)
def get_queue():

    priority_order = {

        "EMERGENCY": 0,

        "URGENT": 1,

        "ROUTINE": 2
    }

    sorted_queue = sorted(

        patient_queue,

        key=lambda patient: (

            priority_order.get(
                patient["priority"],
                3
            ),

            patient["created_at"]
        )
    )

    # Make sure latest status is included
    for patient in sorted_queue:

        patient["status"] = patient_statuses.get(
            patient["id"],
            "waiting"
        )

    return jsonify({

        "patients":
            sorted_queue,

        "total":
            len(sorted_queue)

    })


# =========================================================
# GET SINGLE PATIENT
# =========================================================

@app.route(
    "/api/queue/<patient_id>",
    methods=["GET"]
)
def get_patient(patient_id):

    for patient in patient_queue:

        if patient["id"] == patient_id:

            patient["status"] = patient_statuses.get(
                patient_id,
                "waiting"
            )

            return jsonify(patient), 200

    return jsonify({
        "detail": "Patient not found"
    }), 404


# =========================================================
# DOCTOR PRIORITY OVERRIDE
# =========================================================

@app.route(
    "/api/queue/<patient_id>/override",
    methods=["PATCH"]
)
def override_priority(patient_id):

    data = request.get_json(
        silent=True
    ) or {}

    new_priority = data.get(
        "priority"
    )

    doctor = data.get(
        "doctor",
        "Doctor"
    )

    valid_priorities = [
        "EMERGENCY",
        "URGENT",
        "ROUTINE"
    ]

    if new_priority not in valid_priorities:

        return jsonify({

            "detail":
                "Invalid priority",

            "allowed":
                valid_priorities

        }), 400

    for patient in patient_queue:

        if patient["id"] == patient_id:

            old_priority = (
                patient["priority"]
            )

            patient["priority"] = (
                new_priority
            )

            patient["override_log"].append({

                "doctor":
                    doctor,

                "from":
                    old_priority,

                "to":
                    new_priority,

                "timestamp":
                    datetime.now().isoformat()
            })

            return jsonify({

                "message":
                    "Priority updated",

                "patient":
                    patient

            }), 200

    return jsonify({
        "detail": "Patient not found"
    }), 404


# =========================================================
# QUEUE STATISTICS
# =========================================================

@app.route(
    "/api/queue/stats",
    methods=["GET"]
)
def queue_stats():

    emergency = sum(

        1 for patient
        in patient_queue

        if patient["priority"]
        == "EMERGENCY"
    )

    urgent = sum(

        1 for patient
        in patient_queue

        if patient["priority"]
        == "URGENT"
    )

    routine = sum(

        1 for patient
        in patient_queue

        if patient["priority"]
        == "ROUTINE"
    )

    waiting = sum(

        1 for patient
        in patient_queue

        if patient_statuses.get(
            patient["id"],
            "waiting"
        ) == "waiting"
    )

    in_consultation = sum(

        1 for patient
        in patient_queue

        if patient_statuses.get(
            patient["id"],
            "waiting"
        ) == "in_consultation"
    )

    completed = sum(

        1 for patient
        in patient_queue

        if patient_statuses.get(
            patient["id"],
            "waiting"
        ) == "completed"
    )

    return jsonify({

        "total":
            len(patient_queue),

        "emergency":
            emergency,

        "urgent":
            urgent,

        "routine":
            routine,

        "waiting":
            waiting,

        "in_consultation":
            in_consultation,

        "completed":
            completed

    })


# =========================================================
# UPDATE PATIENT STATUS
# =========================================================

@app.route(
    "/api/queue/<patient_id>/status",
    methods=["PATCH"]
)
def update_patient_status(patient_id):

    data = request.get_json(
        silent=True
    ) or {}

    status = data.get(
        "status"
    )

    allowed_statuses = [

        "waiting",

        "called",

        "in_consultation",

        "completed"
    ]

    if status not in allowed_statuses:

        return jsonify({

            "error":
                "Invalid status",

            "allowed_statuses":
                allowed_statuses

        }), 400

    # Check patient exists
    patient_exists = any(

        patient["id"] == patient_id

        for patient in patient_queue
    )

    if not patient_exists:

        return jsonify({

            "error":
                "Patient not found"

        }), 404

    # Update status
    patient_statuses[
        patient_id
    ] = status

    return jsonify({

        "success":
            True,

        "patient_id":
            patient_id,

        "status":
            status

    }), 200


# =========================================================
# RESET QUEUE
# =========================================================

@app.route(
    "/api/queue/reset",
    methods=["POST"]
)
def reset_queue():

    patient_queue.clear()

    patient_statuses.clear()

    return jsonify({

        "success":
            True,

        "message":
            "Queue reset successfully"

    }), 200


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    app.run(

        host="0.0.0.0",

        port=5000,

        debug=True
    )