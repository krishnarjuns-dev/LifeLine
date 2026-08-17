import React, { useMemo, useState } from "react";
import "./DoctorDashboard.css";

const initialPatients = [
  {
    id: "LL-1042",
    priority: "EMERGENCY",
    complaint: "Severe chest pain and difficulty breathing",
    flags: ["Severe or concerning chest pain", "Severe difficulty breathing"],
    reason: "Safety-critical red flags identified.",
    waiting: "2 min",
  },
  {
    id: "LL-1039",
    priority: "EMERGENCY",
    complaint: "Sudden severe chest pain",
    flags: ["Severe or concerning chest pain"],
    reason: "Safety-critical red flag identified.",
    waiting: "5 min",
  },
  {
    id: "LL-1047",
    priority: "URGENT",
    complaint: "High fever and increasing weakness",
    flags: [],
    reason: "Symptoms require prompt clinical assessment.",
    waiting: "8 min",
  },
  {
    id: "LL-1045",
    priority: "ROUTINE",
    complaint: "Mild fever and tiredness",
    flags: [],
    reason: "No immediate warning signs identified.",
    waiting: "12 min",
  },
  {
    id: "LL-1049",
    priority: "ROUTINE",
    complaint: "Headache and mild body pain",
    flags: [],
    reason: "No immediate warning signs identified.",
    waiting: "15 min",
  },
];

function DoctorDashboard() {
  const [patients] = useState(initialPatients);
  const [filter, setFilter] = useState("ALL");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const counts = useMemo(() => {
    return {
      emergency: patients.filter(
        (patient) => patient.priority === "EMERGENCY"
      ).length,

      urgent: patients.filter(
        (patient) => patient.priority === "URGENT"
      ).length,

      routine: patients.filter(
        (patient) => patient.priority === "ROUTINE"
      ).length,
    };
  }, [patients]);

  const filteredPatients =
    filter === "ALL"
      ? patients
      : patients.filter((patient) => patient.priority === filter);

  const getPriorityClass = (priority) => {
    if (priority === "EMERGENCY") return "emergency";
    if (priority === "URGENT") return "urgent";
    return "routine";
  };

  return (
    <div className="dashboard-page">

      {/* HEADER */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">♥</div>

          <div>
            <h1>LifeLine</h1>
            <span>Clinical Triage Dashboard</span>
          </div>
        </div>

        <div className="doctor-status">
          <span className="status-dot"></span>
          Doctor Dashboard
        </div>
      </header>

      {/* MAIN */}
      <main className="dashboard-container">

        {/* TITLE */}
        <section className="dashboard-title">
          <div>
            <p className="eyebrow">CLINICAL OVERVIEW</p>

            <h2>Patient Priority Queue</h2>

            <p>
              Patients are organized by triage priority so safety-critical
              cases can be reviewed first.
            </p>
          </div>

          <div className="live-indicator">
            <span></span>
            Queue Active
          </div>
        </section>

        {/* STAT CARDS */}
        <section className="stats-grid">

          <div className="stat-card emergency-card">
            <div className="stat-top">
              <span className="stat-icon">🚨</span>
              <span className="stat-label">EMERGENCY</span>
            </div>

            <strong>{counts.emergency}</strong>

            <p>Requires immediate attention</p>
          </div>

          <div className="stat-card urgent-card">
            <div className="stat-top">
              <span className="stat-icon">⚠️</span>
              <span className="stat-label">URGENT</span>
            </div>

            <strong>{counts.urgent}</strong>

            <p>Needs prompt assessment</p>
          </div>

          <div className="stat-card routine-card">
            <div className="stat-top">
              <span className="stat-icon">✓</span>
              <span className="stat-label">ROUTINE</span>
            </div>

            <strong>{counts.routine}</strong>

            <p>Can follow normal queue</p>
          </div>

          <div className="stat-card total-card">
            <div className="stat-top">
              <span className="stat-icon">👥</span>
              <span className="stat-label">TOTAL PATIENTS</span>
            </div>

            <strong>{patients.length}</strong>

            <p>Currently in triage queue</p>
          </div>

        </section>

        {/* QUEUE */}
        <section className="queue-section">

          <div className="queue-header">
            <div>
              <h3>Live Patient Queue</h3>
              <p>
                Highest-risk patients appear first.
              </p>
            </div>

            <div className="filter-buttons">

              <button
                className={filter === "ALL" ? "active" : ""}
                onClick={() => setFilter("ALL")}
              >
                All
              </button>

              <button
                className={filter === "EMERGENCY" ? "active emergency-filter" : ""}
                onClick={() => setFilter("EMERGENCY")}
              >
                Emergency
              </button>

              <button
                className={filter === "URGENT" ? "active urgent-filter" : ""}
                onClick={() => setFilter("URGENT")}
              >
                Urgent
              </button>

              <button
                className={filter === "ROUTINE" ? "active routine-filter" : ""}
                onClick={() => setFilter("ROUTINE")}
              >
                Routine
              </button>

            </div>
          </div>

          {/* PATIENT LIST */}
          <div className="patient-list">

            {filteredPatients.map((patient, index) => (

              <div
                className="patient-row"
                key={patient.id}
              >

                {/* NUMBER */}
                <div className="queue-number">
                  {index + 1}
                </div>

                {/* PRIORITY */}
                <div className="patient-priority">
                  <div
                    className={`priority-badge ${getPriorityClass(
                      patient.priority
                    )}`}
                  >
                    <span></span>
                    {patient.priority}
                  </div>

                  <small>
                    Waiting {patient.waiting}
                  </small>
                </div>

                {/* PATIENT INFO */}
                <div className="patient-info">

                  <div className="patient-id">
                    Patient {patient.id}
                  </div>

                  <div className="patient-complaint">
                    {patient.complaint}
                  </div>

                  {patient.flags.length > 0 && (
                    <div className="flag-preview">
                      ⚠️ {patient.flags.length} safety flag
                      {patient.flags.length > 1 ? "s" : ""} identified
                    </div>
                  )}

                </div>

                {/* ACTION */}
                <button
                  className="view-button"
                  onClick={() => setSelectedPatient(patient)}
                >
                  View Assessment
                  <span>→</span>
                </button>

              </div>

            ))}

          </div>

        </section>

        {/* SAFETY MESSAGE */}
        <section className="safety-message">

          <div className="safety-icon">🛡️</div>

          <div>
            <h4>Clinical Safety Notice</h4>

            <p>
              LifeLine provides triage recommendations based on submitted
              information. The final clinical decision always remains with
              a qualified healthcare professional.
            </p>
          </div>

        </section>

      </main>

      {/* MODAL */}
      {selectedPatient && (

        <div
          className="modal-overlay"
          onClick={() => setSelectedPatient(null)}
        >

          <div
            className="assessment-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <button
              className="close-button"
              onClick={() => setSelectedPatient(null)}
            >
              ×
            </button>

            <p className="eyebrow">PATIENT ASSESSMENT</p>

            <h2>
              Patient {selectedPatient.id}
            </h2>

            <div
              className={`modal-priority ${getPriorityClass(
                selectedPatient.priority
              )}`}
            >
              {selectedPatient.priority}
            </div>

            <div className="assessment-block">

              <span>Chief Complaint</span>

              <strong>
                {selectedPatient.complaint}
              </strong>

            </div>

            <div className="assessment-block">

              <span>Why this priority?</span>

              <strong>
                {selectedPatient.reason}
              </strong>

            </div>

            <div className="assessment-block">

              <span>Safety Flags</span>

              {selectedPatient.flags.length > 0 ? (

                <ul>
                  {selectedPatient.flags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>

              ) : (

                <strong className="no-flags">
                  No safety flags identified
                </strong>

              )}

            </div>

            <div className="modal-footer">
              <span>
                Waiting time: <strong>{selectedPatient.waiting}</strong>
              </span>

              <button
                onClick={() => setSelectedPatient(null)}
              >
                Close Assessment
              </button>
            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default DoctorDashboard;