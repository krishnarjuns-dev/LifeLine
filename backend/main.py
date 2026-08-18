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


# =========================================================
# TRIAGE ENGINE
# =========================================================

def calculate_triage(symptoms, answers):
    symptoms = (symptoms or "").lower()

    duration = answers.get("duration", "")
    worsening = answers.get("worsening", "")
    breathing = answers.get("breathing", "")
    chest_pain = answers.get("chestPain", "")
    fainting = answers.get("fainting", "")
    medical_history = answers.get("medicalHistory", "")

    factors = []
    emergency_score = 0
    urgent_score = 0

    # -----------------------------------------------------
    # HIGH-RISK WARNING SIGNS
    # -----------------------------------------------------

    if breathing == "Yes":
        emergency_score += 4
        factors.append("Difficulty breathing")

    if chest_pain == "Yes":
        emergency_score += 4
        factors.append("Severe or concerning chest pain")

    if fainting == "Yes":
        emergency_score += 4
        factors.append("Fainting or near-fainting")

    # -----------------------------------------------------
    # ADDITIONAL RISK SIGNALS
    # -----------------------------------------------------

    if worsening == "Yes":
        urgent_score += 2
        factors.append("Symptoms are getting worse")

    if medical_history == "Yes":
        urgent_score += 1
        factors.append("Important medical history")

    if duration == "More than a week":
        urgent_score += 1
        factors.append("Symptoms have persisted for more than a week")

    # -----------------------------------------------------
    # SYMPTOM KEYWORDS
    # -----------------------------------------------------

    emergency_keywords = [
        "unconscious",
        "unresponsive",
        "severe chest pain",
        "heart attack",
        "can't breathe",
        "cannot breathe",
        "not breathing",
        "blue lips",
        "seizure",
    ]

    for keyword in emergency_keywords:
        if keyword in symptoms:
            emergency_score += 5

            readable = keyword.replace("can't", "cannot")
            factors.append(f"Reported warning sign: {readable}")

    urgent_keywords = [
        "severe pain",
        "high fever",
        "persistent vomiting",
        "confusion",
        "dizziness",
        "weakness",
        "blood",
    ]

    for keyword in urgent_keywords:
        if keyword in symptoms:
            urgent_score += 2

            readable = keyword.capitalize()
            factors.append(f"Reported symptom: {readable}")

    # -----------------------------------------------------
    # PRIORITY
    # -----------------------------------------------------

    if emergency_score >= 4:
        priority = "EMERGENCY"

        message = (
            "This patient may require immediate medical attention."
        )

        reason = (
            "One or more high-risk warning signs were identified. "
            "The patient should be moved ahead in the clinical queue "
            "for rapid assessment."
        )

    elif urgent_score >= 2:
        priority = "URGENT"

        message = (
            "This patient should receive attention sooner than a routine case."
        )

        reason = (
            "The assessment contains symptoms or circumstances that "
            "may warrant an earlier clinical review."
        )

    else:
        priority = "ROUTINE"

        message = (
            "This patient appears suitable for routine triage review."
        )

        reason = (
            "No major high-risk warning signs were identified from "
            "the information provided."
        )

    # Remove duplicate factors
    factors = list(dict.fromkeys(factors))

    return priority, message, reason, factors


# =========================================================
# TRIAGE API
# =========================================================

@app.route("/api/triage", methods=["POST"])
def triage():
    try:
        data = request.get_json(silent=True) or {}

        language = data.get("language", "English")
        symptoms = data.get("symptoms", "")
        answers = data.get("answers", {}) or {}

        if not symptoms.strip():
            return jsonify({
                "message": "Please describe the patient's symptoms."
            }), 400

        priority, message, reason, factors = calculate_triage(
            symptoms,
            answers
        )

        patient_id = "LL-" + uuid.uuid4().hex[:6].upper()

        patient = {
            "id": patient_id,
            "patient_name": f"Patient {patient_id[-4:]}",
            "symptoms": symptoms,
            "language": language,
            "answers": answers,
            "priority": priority,
            "status": "Waiting",
            "created_at": datetime.now().strftime("%H:%M"),
            "wait_time": "Just now",
            "factors": factors,
        }

        patient_queue.append(patient)

        return jsonify({
            "success": True,
            "patient_id": patient_id,
            "priority": priority,
            "message": message,
            "reason": reason,
            "factors": factors,
            "language": language,
        })

    except Exception as error:
        print("TRIAGE ERROR:", error)

        return jsonify({
            "message": "An error occurred while processing the triage assessment."
        }), 500


# =========================================================
# QUEUE API
# =========================================================

@app.route("/api/queue", methods=["GET"])
def get_queue():

    priority_order = {
        "EMERGENCY": 0,
        "URGENT": 1,
        "ROUTINE": 2
    }

    sorted_queue = sorted(
        patient_queue,
        key=lambda patient: priority_order.get(
            patient.get("priority", "ROUTINE"),
            3
        )
    )

    return jsonify({
        "success": True,
        "queue": sorted_queue
    })


# =========================================================
# QUEUE RESCUE / PRIORITY UPDATE
# =========================================================

@app.route("/api/queue/<patient_id>/priority", methods=["PUT"])
def update_priority(patient_id):

    data = request.get_json(silent=True) or {}

    new_priority = data.get("priority")

    allowed = ["EMERGENCY", "URGENT", "ROUTINE"]

    if new_priority not in allowed:
        return jsonify({
            "message": "Invalid priority."
        }), 400

    for patient in patient_queue:
        if patient["id"] == patient_id:
            patient["priority"] = new_priority

            return jsonify({
                "success": True,
                "patient": patient
            })

    return jsonify({
        "message": "Patient not found."
    }), 404


# =========================================================
# PATIENT STATUS
# =========================================================

@app.route("/api/queue/<patient_id>/status", methods=["PUT"])
def update_status(patient_id):

    data = request.get_json(silent=True) or {}

    new_status = data.get("status")

    allowed = [
        "Waiting",
        "In Consultation",
        "Under Observation",
        "Recovered"
    ]

    if new_status not in allowed:
        return jsonify({
            "message": "Invalid status."
        }), 400

    for patient in patient_queue:

        if patient["id"] == patient_id:

            patient["status"] = new_status

            return jsonify({
                "success": True,
                "patient": patient
            })

    return jsonify({
        "message": "Patient not found."
    }), 404


# =========================================================
# ANALYTICS
# =========================================================

@app.route("/api/analytics", methods=["GET"])
def analytics():

    total = len(patient_queue)

    emergency = sum(
        1 for p in patient_queue
        if p.get("priority") == "EMERGENCY"
    )

    urgent = sum(
        1 for p in patient_queue
        if p.get("priority") == "URGENT"
    )

    routine = sum(
        1 for p in patient_queue
        if p.get("priority") == "ROUTINE"
    )

    recovered = sum(
        1 for p in patient_queue
        if p.get("status") == "Recovered"
    )

    waiting = sum(
        1 for p in patient_queue
        if p.get("status") == "Waiting"
    )

    in_consultation = sum(
        1 for p in patient_queue
        if p.get("status") == "In Consultation"
    )

    return jsonify({
        "success": True,
        "total_patients": total,
        "emergency": emergency,
        "urgent": urgent,
        "routine": routine,
        "recovered": recovered,
        "waiting": waiting,
        "in_consultation": in_consultation,
        "average_wait_time": "—"
    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/api/health", methods=["GET"])
def health():

    return jsonify({
        "status": "online",
        "service": "LifeLine Triage Engine"
    })


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "service": "LifeLine",
        "message": "LifeLine backend is running.",
        "status": "online"
    })


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":
    print("=" * 60)
    print("LIFELINE BACKEND")
    print("=" * 60)
    print("Triage API  : http://127.0.0.1:5000/api/triage")
    print("Queue API   : http://127.0.0.1:5000/api/queue")
    print("Analytics   : http://127.0.0.1:5000/api/analytics")
    print("Health      : http://127.0.0.1:5000/api/health")
    print("=" * 60)

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )