# 🫀 LifeLine

### Safe AI Triage for Overloaded Clinics

LifeLine is a safety-first clinical triage system designed to help overloaded clinics identify patients who may require immediate attention.

In a high-volume Primary Health Centre, patients are often handled on a first-come-first-served basis. This can cause serious cases to remain hidden behind routine complaints.

LifeLine addresses this problem by collecting a small set of structured patient responses and applying deterministic safety rules to identify critical red flags.

> ⚠️ LifeLine is a triage-support system, not a diagnostic or prescription system. Final clinical decisions remain with qualified healthcare professionals.

---

## 🚨 Problem

A rural or overloaded clinic may see hundreds of patients in a day with limited staff.

A patient with a routine fever may appear before a patient experiencing:

- Severe breathing difficulty
- Concerning chest pain
- Loss of consciousness

Without a structured triage process, these critical cases may not receive attention quickly enough.

LifeLine introduces a lightweight digital triage layer before clinical assessment.

---

## 💡 Solution

LifeLine asks patients a small set of structured questions and evaluates safety-critical responses.

The current safety engine uses deterministic hard rules to identify red flags.

### Current priority logic

| Condition | Result |
|---|---|
| Severe breathing difficulty | 🚨 Emergency |
| Concerning chest pain | 🚨 Emergency |
| Fainting / loss of consciousness | 🚨 Emergency |
| Symptoms worsening | 🔴 Urgent |
| No critical red flags | 🟢 Routine |

If a safety-critical red flag is identified, LifeLine returns:

```text
Priority: EMERGENCY
Source: HARD_RULE
Red Flags: [identified conditions]
Rationale: Immediate clinical assessment is required.
