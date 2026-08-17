import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:5000";

function App() {
  const [page, setPage] = useState("triage");

  const [language, setLanguage] = useState("English");
  const [symptoms, setSymptoms] = useState("");

  const [answers, setAnswers] = useState({
    duration: "",
    worsening: "",
    breathing: "",
    chestPain: "",
    fainting: "",
    medicalHistory: "",
  });

  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnswer = (field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // =====================================================
  // PATIENT TRIAGE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setTriageResult(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          symptoms,
          answers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail
            ? JSON.stringify(data.detail)
            : `Server returned ${response.status}`
        );
      }

      setTriageResult(data);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to the safety engine. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESET PATIENT ASSESSMENT
  // =====================================================

  const startNewAssessment = () => {
    setSymptoms("");

    setAnswers({
      duration: "",
      worsening: "",
      breathing: "",
      chestPain: "",
      fainting: "",
      medicalHistory: "",
    });

    setTriageResult(null);
    setError("");
  };

  // =====================================================
  // PATIENT RESULT PAGE
  // =====================================================

  if (triageResult) {
    return (
      <div className="app">
        <Navbar
          page="patient"
          onDoctorClick={() => setPage("doctor")}
        />

        <main className="result-page">
          <div className="result-card">
            <div className="result-icon">🚨</div>

            <div className="result-label">
              TRIAGE PRIORITY
            </div>

            <h1 className="result-priority">
              {triageResult.priority || "EMERGENCY"}
            </h1>

            <h2>
              {triageResult.message ||
                "Immediate medical attention may be needed"}
            </h2>

            <p className="result-description">
              {triageResult.reason ||
                "Your answers contain one or more warning signs that should not wait in a routine queue."}
            </p>

            {triageResult.patient_id && (
              <div className="patient-id-card">
                <span>Your queue ID</span>

                <strong>
                  #{triageResult.queue_number || "—"}{" "}
                  · {triageResult.patient_id}
                </strong>
              </div>
            )}

            {triageResult.factors &&
              Array.isArray(triageResult.factors) &&
              triageResult.factors.length > 0 && (
                <div className="result-box warning-box">
                  <h3>⚠️ Factors identified</h3>

                  <ul>
                    {triageResult.factors.map(
                      (factor, index) => (
                        <li key={index}>{factor}</li>
                      )
                    )}
                  </ul>
                </div>
              )}

            <div className="result-box">
              <h3>Why this priority?</h3>

              <p>
                {triageResult.reason ||
                  "A potentially serious warning sign was identified during the safety assessment."}
              </p>
            </div>

            <div className="important-box">
              <h3>🧑‍⚕️ Important</h3>

              <p>
                This is a triage recommendation, not a
                diagnosis. A healthcare professional must make
                the final clinical decision.
              </p>
            </div>
          </div>

          <button
            className="new-assessment-button"
            onClick={startNewAssessment}
          >
            Start new assessment
          </button>

          <button
            className="secondary-dashboard-button"
            onClick={() => setPage("doctor")}
          >
            👨‍⚕️ Open Doctor Queue
          </button>
        </main>
      </div>
    );
  }

  // =====================================================
  // DOCTOR DASHBOARD
  // =====================================================

  if (page === "doctor") {
    return (
      <DoctorDashboard
        onBack={() => setPage("triage")}
      />
    );
  }

  // =====================================================
  // PATIENT TRIAGE PAGE
  // =====================================================

  return (
    <div className="app">
      <Navbar
        page="patient"
        onDoctorClick={() => setPage("doctor")}
      />

      <main className="main-page">
        <section className="hero">
          <div className="hero-badge">
            AI-POWERED TRIAGE
          </div>

          <h1>
            Help us understand
            <br />
            <span>what you need.</span>
          </h1>

          <p>
            Answer a few simple questions. LifeLine identifies
            warning signs that may need urgent medical
            attention.
          </p>
        </section>

        <form
          className="assessment-card"
          onSubmit={handleSubmit}
        >
          <div className="section-header">
            <div className="section-number">
              01
            </div>

            <div>
              <h2>
                Tell us about the problem
              </h2>

              <p>
                Start with the main symptom or concern.
              </p>
            </div>
          </div>

          <div className="field">
            <label>
              Preferred language
            </label>

            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value)
              }
            >
              <option>English</option>
              <option>Tamil</option>
              <option>Hindi</option>
            </select>
          </div>

          <div className="field">
            <label>
              What is bothering you?
            </label>

            <textarea
              value={symptoms}
              onChange={(e) =>
                setSymptoms(e.target.value)
              }
              placeholder="Example: I have fever and feel weak..."
              rows="4"
              required
            />
          </div>

          <div className="section-divider"></div>

          <div className="section-header">
            <div className="section-number">
              02
            </div>

            <div>
              <h2>
                Safety questions
              </h2>

              <p>
                These questions help identify important
                warning signs.
              </p>
            </div>
          </div>

          <div className="questions-grid">
            <Question
              label="How long have you had these symptoms?"
              value={answers.duration}
              options={[
                "Today",
                "1–3 days",
                "4–7 days",
                "More than a week",
              ]}
              onChange={(value) =>
                handleAnswer("duration", value)
              }
            />

            <Question
              label="Are your symptoms getting worse?"
              value={answers.worsening}
              options={["Yes", "No"]}
              onChange={(value) =>
                handleAnswer("worsening", value)
              }
            />

            <Question
              label="Are you having difficulty breathing?"
              value={answers.breathing}
              options={["Yes", "No"]}
              onChange={(value) =>
                handleAnswer("breathing", value)
              }
            />

            <Question
              label="Are you experiencing severe or concerning chest pain?"
              value={answers.chestPain}
              options={["Yes", "No"]}
              onChange={(value) =>
                handleAnswer("chestPain", value)
              }
            />

            <Question
              label="Have you fainted or nearly fainted?"
              value={answers.fainting}
              options={["Yes", "No"]}
              onChange={(value) =>
                handleAnswer("fainting", value)
              }
            />

            <Question
              label="Do you have important medical history?"
              value={answers.medicalHistory}
              options={["Yes", "No"]}
              onChange={(value) =>
                handleAnswer(
                  "medicalHistory",
                  value
                )
              }
            />
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="submit-area">
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading
                ? "Assessing..."
                : "Submit for triage →"}
            </button>

            <p>
              🔒 Your responses are used only for this
              triage assessment.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}


// =======================================================
// NAVBAR
// =======================================================

function Navbar({
  page,
  onDoctorClick,
}) {
  return (
    <header className="navbar">
      <div className="logo">
        <span className="logo-heart">
          ♥
        </span>

        LifeLine
      </div>

      <div className="navbar-right">
        <div className="status-pill">
          <span className="status-dot"></span>

          {page === "doctor"
            ? "Doctor Dashboard"
            : "Safe AI Triage"}
        </div>

        {page !== "doctor" && (
          <button
            className="doctor-nav-button"
            onClick={onDoctorClick}
          >
            👨‍⚕️ Doctor Queue
          </button>
        )}
      </div>
    </header>
  );
}


// =======================================================
// DOCTOR DASHBOARD
// =======================================================

function DoctorDashboard({
  onBack,
}) {
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);

  const [selectedPatient, setSelectedPatient] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);


  // =====================================================
  // LOAD QUEUE
  // =====================================================

  const loadQueue = async () => {

    try {

      setRefreshing(true);
      setError("");

      const [queueResponse, statsResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/queue`),
          fetch(`${API_URL}/api/queue/stats`),
        ]);

      if (!queueResponse.ok) {
        throw new Error(
          "Unable to load queue"
        );
      }

      if (!statsResponse.ok) {
        throw new Error(
          "Unable to load statistics"
        );
      }

      const queueData =
        await queueResponse.json();

      const statsData =
        await statsResponse.json();

      setPatients(
        queueData.patients || []
      );

      setStats(statsData);

    } catch (err) {

      console.error(err);

      setError(
        "Unable to connect to the doctor queue. Make sure the backend is running on port 5000."
      );

    } finally {

      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {

    loadQueue();

    const interval =
      setInterval(
        loadQueue,
        5000
      );

    return () =>
      clearInterval(interval);

  }, []);


  // =====================================================
  // UPDATE STATUS
  // =====================================================

  const updateStatus =
    async (
      patientId,
      status
    ) => {

      try {

        const response =
          await fetch(
            `${API_URL}/api/queue/${patientId}/status`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                status,
              }),
            }
          );

        if (!response.ok) {
          throw new Error(
            "Status update failed"
          );
        }

        await loadQueue();

        if (
          selectedPatient &&
          selectedPatient.id === patientId
        ) {

          setSelectedPatient(
            (prev) => ({
              ...prev,
              status,
            })
          );
        }

      } catch (err) {

        console.error(err);

        setError(
          "Could not update patient status."
        );
      }
    };


  // =====================================================
  // PRIORITY OVERRIDE
  // =====================================================

  const changePriority =
    async (
      patientId,
      priority
    ) => {

      try {

        const response =
          await fetch(
            `${API_URL}/api/queue/${patientId}/override`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                priority,
                doctor: "Doctor",
              }),
            }
          );

        if (!response.ok) {
          throw new Error(
            "Priority update failed"
          );
        }

        await loadQueue();

        if (
          selectedPatient &&
          selectedPatient.id === patientId
        ) {

          setSelectedPatient(
            (prev) => ({
              ...prev,
              priority,
            })
          );
        }

      } catch (err) {

        console.error(err);

        setError(
          "Could not change patient priority."
        );
      }
    };


  // =====================================================
  // PRIORITY CLASS
  // =====================================================

  const getPriorityClass =
    (priority) => {

      if (
        priority === "EMERGENCY"
      ) {
        return "priority-emergency";
      }

      if (
        priority === "URGENT"
      ) {
        return "priority-urgent";
      }

      return "priority-routine";
    };


  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass =
    (status) => {

      if (
        status === "in_consultation"
      ) {
        return "status-consultation";
      }

      if (
        status === "completed"
      ) {
        return "status-completed";
      }

      if (
        status === "called"
      ) {
        return "status-called";
      }

      return "status-waiting";
    };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <div className="app">

        <Navbar page="doctor" />

        <main className="doctor-page">

          <div className="dashboard-loading">

            <div className="loading-spinner">
              ⟳
            </div>

            <h2>
              Loading doctor queue...
            </h2>

            <p>
              Connecting to the LifeLine
              safety engine.
            </p>

          </div>

        </main>

      </div>
    );
  }


  return (
    <div className="app">

      <Navbar page="doctor" />

      <main className="doctor-page">

        {/* =========================================
            DASHBOARD HEADER
        ========================================== */}

        <div className="dashboard-header">

          <div>

            <div className="hero-badge">
              CLINICAL DASHBOARD
            </div>

            <h1>
              Doctor <span>Queue</span>
            </h1>

            <p>
              Patients are automatically organized
              by triage priority.
            </p>

          </div>

          <div className="dashboard-actions">

            <button
              className="refresh-button"
              onClick={loadQueue}
              disabled={refreshing}
            >
              {refreshing
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

            <button
              className="back-button"
              onClick={onBack}
            >
              ← Patient View
            </button>

          </div>

        </div>


        {/* =========================================
            ERROR
        ========================================== */}

        {error && (

          <div className="error-message">
            ⚠️ {error}
          </div>

        )}


        {/* =========================================
            STATISTICS
        ========================================== */}

        <div className="stats-grid">

          <StatCard
            title="Waiting"
            value={stats?.waiting || 0}
            icon="👥"
            className="stat-purple"
          />

          <StatCard
            title="Emergency"
            value={stats?.emergency || 0}
            icon="🚨"
            className="stat-red"
          />

          <StatCard
            title="Urgent"
            value={stats?.urgent || 0}
            icon="⚠️"
            className="stat-orange"
          />

          <StatCard
            title="Routine"
            value={stats?.routine || 0}
            icon="🟢"
            className="stat-green"
          />

        </div>


        {/* =========================================
            QUEUE
        ========================================== */}

        <section className="queue-section">

          <div className="queue-section-header">

            <div>

              <h2>
                Today's Queue
              </h2>

              <p>
                Highest-risk patients appear first.
              </p>

            </div>

            <div className="live-indicator">

              <span></span>

              LIVE

            </div>

          </div>


          {patients.length === 0 ? (

            <div className="empty-queue">

              <div>
                🩺
              </div>

              <h3>
                No patients in queue
              </h3>

              <p>
                Patients will appear here after
                completing a triage assessment.
              </p>

            </div>

          ) : (

            <div className="queue-list">

              {patients.map(
                (patient, index) => (

                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    index={index}
                    priorityClass={getPriorityClass(
                      patient.priority
                    )}
                    statusClass={getStatusClass(
                      patient.status
                    )}
                    onSelect={() =>
                      setSelectedPatient(
                        patient
                      )
                    }
                    onStatusChange={
                      updateStatus
                    }
                  />

                )
              )}

            </div>

          )}

        </section>


        {/* =========================================
            PATIENT DETAIL MODAL
        ========================================== */}

        {selectedPatient && (

          <PatientModal
            patient={
              selectedPatient
            }
            onClose={() =>
              setSelectedPatient(null)
            }
            onStatusChange={
              updateStatus
            }
            onPriorityChange={
              changePriority
            }
            getPriorityClass={
              getPriorityClass
            }
          />

        )}

      </main>

    </div>
  );
}


// =======================================================
// STAT CARD
// =======================================================

function StatCard({
  title,
  value,
  icon,
  className,
}) {

  return (

    <div
      className={`stat-card ${className}`}
    >

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <div className="stat-value">
          {value}
        </div>

        <div className="stat-title">
          {title}
        </div>

      </div>

    </div>
  );
}


// =======================================================
// PATIENT CARD
// =======================================================

function PatientCard({
  patient,
  index,
  priorityClass,
  statusClass,
  onSelect,
  onStatusChange,
}) {

  const statusText =
    patient.status ===
    "in_consultation"
      ? "In consultation"
      : patient.status ===
        "completed"
      ? "Completed"
      : patient.status ===
        "called"
      ? "Called"
      : "Waiting";


  return (

    <div
      className={`patient-card ${priorityClass}`}
    >

      {/* Queue number */}

      <div className="queue-number">

        <span>
          #{index + 1}
        </span>

      </div>


      {/* Main information */}

      <div className="patient-main">

        <div className="patient-top-row">

          <div>

            <h3>
              Patient{" "}
              {patient.id}
            </h3>

            <span
              className={`priority-badge ${priorityClass}`}
            >
              {patient.priority}
            </span>

          </div>

          <span
            className={`patient-status ${statusClass}`}
          >
            {statusText}
          </span>

        </div>


        <p className="patient-symptoms">

          {patient.symptoms ||
            "No symptom description provided."}

        </p>


        <div className="patient-meta">

          <span>
            🕐{" "}
            {patient.answers?.duration ||
              "Duration unknown"}
          </span>

          <span>
            🌐{" "}
            {patient.language ||
              "English"}
          </span>

          {patient.answers?.worsening ===
            "Yes" && (
            <span>
              📈 Worsening
            </span>
          )}

        </div>

      </div>


      {/* Actions */}

      <div className="patient-actions">

        {patient.status ===
          "waiting" && (

          <button
            className="call-button"
            onClick={() =>
              onStatusChange(
                patient.id,
                "called"
              )
            }
          >
            📢 Call
          </button>

        )}

        {patient.status ===
          "called" && (

          <button
            className="consult-button"
            onClick={() =>
              onStatusChange(
                patient.id,
                "in_consultation"
              )
            }
          >
            🩺 Consult
          </button>

        )}

        {patient.status ===
          "in_consultation" && (

          <button
            className="complete-button"
            onClick={() =>
              onStatusChange(
                patient.id,
                "completed"
              )
            }
          >
            ✓ Complete
          </button>

        )}

        <button
          className="view-button"
          onClick={onSelect}
        >
          View
        </button>

      </div>

    </div>
  );
}


// =======================================================
// PATIENT MODAL
// =======================================================

function PatientModal({
  patient,
  onClose,
  onStatusChange,
  onPriorityChange,
  getPriorityClass,
}) {

  return (

    <div
      className="modal-overlay"
      onClick={onClose}
    >

      <div
        className="patient-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="modal-header">

          <div>

            <span className="modal-label">
              PATIENT DETAILS
            </span>

            <h2>
              Patient {patient.id}
            </h2>

          </div>

          <button
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {/* Priority */}

        <div className="modal-priority">

          <div>

            <span>
              Current priority
            </span>

            <strong
              className={getPriorityClass(
                patient.priority
              )}
            >
              {patient.priority}
            </strong>

          </div>


          <div className="priority-controls">

            <button
              onClick={() =>
                onPriorityChange(
                  patient.id,
                  "EMERGENCY"
                )
              }
            >
              Emergency
            </button>

            <button
              onClick={() =>
                onPriorityChange(
                  patient.id,
                  "URGENT"
                )
              }
            >
              Urgent
            </button>

            <button
              onClick={() =>
                onPriorityChange(
                  patient.id,
                  "ROUTINE"
                )
              }
            >
              Routine
            </button>

          </div>

        </div>


        {/* Symptoms */}

        <div className="detail-box">

          <h3>
            Chief complaint
          </h3>

          <p>
            {patient.symptoms ||
              "Not provided"}
          </p>

        </div>


        {/* Summary */}

        <div className="detail-grid">

          <DetailItem
            label="Duration"
            value={
              patient.answers?.duration ||
              "Not provided"
            }
          />

          <DetailItem
            label="Worsening"
            value={
              patient.answers?.worsening ||
              "Not provided"
            }
          />

          <DetailItem
            label="Breathing difficulty"
            value={
              patient.answers?.breathing ||
              "Not provided"
            }
          />

          <DetailItem
            label="Chest pain"
            value={
              patient.answers?.chestPain ||
              "Not provided"
            }
          />

          <DetailItem
            label="Fainting"
            value={
              patient.answers?.fainting ||
              "Not provided"
            }
          />

          <DetailItem
            label="Medical history"
            value={
              patient.answers?.medicalHistory ||
              "Not provided"
            }
          />

        </div>


        {/* Warning factors */}

        {patient.factors &&
          patient.factors.length > 0 && (

          <div className="modal-warning">

            <h3>
              ⚠️ Triage warning signs
            </h3>

            <ul>

              {patient.factors.map(
                (factor, index) => (
                  <li key={index}>
                    {factor}
                  </li>
                )
              )}

            </ul>

          </div>

        )}


        {/* Rationale */}

        <div className="detail-box">

          <h3>
            Triage rationale
          </h3>

          <p>
            {patient.reason ||
              "No rationale available."}
          </p>

        </div>


        {/* Consultation controls */}

        <div className="modal-actions">

          {patient.status ===
            "waiting" && (

            <button
              className="call-button large"
              onClick={() => {

                onStatusChange(
                  patient.id,
                  "called"
                );

                onClose();

              }}
            >
              📢 Call Patient
            </button>

          )}

          {patient.status ===
            "called" && (

            <button
              className="consult-button large"
              onClick={() => {

                onStatusChange(
                  patient.id,
                  "in_consultation"
                );

                onClose();

              }}
            >
              🩺 Start Consultation
            </button>

          )}

          {patient.status ===
            "in_consultation" && (

            <button
              className="complete-button large"
              onClick={() => {

                onStatusChange(
                  patient.id,
                  "completed"
                );

                onClose();

              }}
            >
              ✓ Complete Consultation
            </button>

          )}

        </div>

      </div>

    </div>
  );
}


// =======================================================
// DETAIL ITEM
// =======================================================

function DetailItem({
  label,
  value,
}) {

  return (

    <div className="detail-item">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


// =======================================================
// QUESTION COMPONENT
// =======================================================

function Question({
  label,
  value,
  options,
  onChange,
}) {

  return (

    <div className="question">

      <label>
        {label}
      </label>

      <div className="option-row">

        {options.map(
          (option) => (

            <button
              type="button"
              key={option}
              className={`option-button ${
                value === option
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                onChange(option)
              }
            >
              {option}
            </button>

          )
        )}

      </div>

    </div>
  );
}


export default App;