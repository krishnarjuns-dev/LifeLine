from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="LifeLine Safety Engine")


# Allow the React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# DATA MODELS
# --------------------------------------------------

class Answers(BaseModel):
    duration: str
    worsening: str
    breathing: str
    chestPain: str
    fainting: str
    medicalHistory: str


class TriageRequest(BaseModel):
    language: str
    symptoms: str
    answers: Answers


# --------------------------------------------------
# HOME ROUTE
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "LifeLine Safety Engine is running"
    }


# --------------------------------------------------
# TRIAGE ENGINE
# --------------------------------------------------

@app.post("/triage")
def triage(data: TriageRequest):

    red_flags = []

    # ----------------------------------------------
    # SAFETY-CRITICAL HARD RULES
    # ----------------------------------------------

    if data.answers.breathing == "Yes":
        red_flags.append("Severe difficulty breathing")

    if data.answers.chestPain == "Yes":
        red_flags.append("Severe or concerning chest pain")

    if data.answers.fainting == "Yes":
        red_flags.append("Fainting or loss of consciousness")

    # ----------------------------------------------
    # EMERGENCY
    # ----------------------------------------------

    if red_flags:

        return {
            "priority": "EMERGENCY",
            "source": "HARD_RULE",
            "red_flags": red_flags,
            "rationale": (
                "A safety-critical red flag was identified. "
                "Immediate clinical assessment is required."
            ),
        }

    # ----------------------------------------------
    # URGENT
    # ----------------------------------------------

    if data.answers.worsening == "Yes":

        return {
            "priority": "URGENT",
            "source": "HARD_RULE",
            "red_flags": [],
            "rationale": (
                "Symptoms are reported to be worsening. "
                "Clinical assessment should be prioritised."
            ),
        }

    # ----------------------------------------------
    # ROUTINE
    # ----------------------------------------------

    return {
        "priority": "ROUTINE",
        "source": "HARD_RULE",
        "red_flags": [],
        "rationale": (
            "No immediate safety-critical red flags were identified."
        ),
    }