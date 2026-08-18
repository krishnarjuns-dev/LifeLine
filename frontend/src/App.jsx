import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:5000";

const emptyAnswers = {
  duration: "",
  worsening: "",
  breathing: "",
  chestPain: "",
  fainting: "",
  medicalHistory: "",
};

function App() {
  const [page, setPage] = useState("triage");

  const [language, setLanguage] = useState("English");
  const [symptoms, setSymptoms] = useState("");
  const [answers, setAnswers] = useState(emptyAnswers);

  const [triageResult, setTriageResult] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [patients, setPatients] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);

  const [error, setError] = useState("");

  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState(
    "Tap the microphone and describe the patient's problem"
  );

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
  }, []);

  /* =========================================================
     ANSWERS
  ========================================================= */

  const handleAnswer = (field, value) => {
    setAnswers((previous) => ({
      ...previous,
      [field]: value,
    }));
  };
  /* =========================================================
     VOICE
  ========================================================= */

  const getSpeechLanguage = () => {
    if (language === "Tamil") return "ta-IN";
    if (language === "Hindi") return "hi-IN";
    return "en-IN";
  };

  const startVoiceInput = () => {
    if (!voiceSupported) {
      setVoiceStatus(
        "Voice input is not supported. Please use Google Chrome."
      );
      return;
    }

    if (listening) return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.lang = getSpeechLanguage();

    // IMPORTANT FIX
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);

    setVoiceStatus(
      `Listening in ${language}... Speak clearly.`
    );

    recognition.onresult = (event) => {
      if (!event.results || !event.results[0]) {
        return;
      }

      const transcript =
        event.results[0][0].transcript.trim();

      if (transcript) {
        // Replace the text once.
        // Do NOT append recognition results.
        setSymptoms(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);

      if (event.error === "not-allowed") {
        setVoiceStatus(
          "Microphone permission was denied."
        );
      } else if (event.error === "no-speech") {
        setVoiceStatus(
          "No speech detected. Please try again."
        );
      } else {
        setVoiceStatus(
          "Voice input failed. Please try again."
        );
      }

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);

      setVoiceStatus(
        "Voice captured. You can edit the text before submitting."
      );
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Speech start error:", error);
      setListening(false);

      setVoiceStatus(
        "Voice input could not be started. Please try again."
      );
    }
  };
  /* =========================================================
     TRIAGE
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!symptoms.trim()) {
      setError(
        "Please describe the patient's main problem."
      );
      return;
    }

    setLoading(true);
    setError("");
    setTriageResult(null);

    try {
      const response = await fetch(
        `${API_URL}/api/triage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            language,
            symptoms,
            answers,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          `Server returned ${response.status}`
        );
      }

      setTriageResult(data);

      await loadQueue();

      setPage("result");
    } catch (error) {
      console.error(error);

      setError(
        "Unable to connect to LifeLine safety engine. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     QUEUE
  ========================================================= */

  const loadQueue = async () => {
    setQueueLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/patients`
      );

      const data = await response.json();

      if (response.ok) {
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error("Queue error:", error);
    } finally {
      setQueueLoading(false);
    }
  };

  const openQueue = async () => {
    setPage("queue");

    await loadQueue();
  };

  /* =========================================================
     ANALYTICS
  ========================================================= */

  const loadAnalytics = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/analytics`
      );

      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Analytics error:", error);
    }
  };

  const openAnalytics = async () => {
    setPage("analytics");

    await loadAnalytics();
  };

  /* =========================================================
     PATIENT DETAILS
  ========================================================= */

  const openPatient = (patient) => {
    setSelectedPatient(patient);
    setPage("patient");
  };

  /* =========================================================
     DOCTOR OVERRIDE
  ========================================================= */

  const overridePriority = async (patientId, priority) => {
    try {
      const response = await fetch(
        `${API_URL}/api/patients/${patientId}/priority`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priority,
            reason:
              "Doctor reviewed and manually adjusted triage priority.",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update priority");
      }

      const updated = await response.json();

      setSelectedPatient(updated.patient);

      await loadQueue();
      await loadAnalytics();
    } catch (error) {
      console.error(error);
      alert("Unable to update patient priority.");
    }
  };

  /* =========================================================
     PATIENT STATUS
  ========================================================= */

  const updatePatientStatus = async (
    patientId,
    status
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/api/patients/${patientId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update status");
      }

      const updated = await response.json();

      setSelectedPatient(updated.patient);

      await loadQueue();
      await loadAnalytics();
    } catch (error) {
      console.error(error);
      alert("Unable to update patient status.");
    }
  };

  /* =========================================================
     SECOND LOOK
  ========================================================= */

  const secondLook = async (patientId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/patients/${patientId}/second-look`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Second-look failed"
        );
      }

      setSelectedPatient(data.patient);

      await loadQueue();
      await loadAnalytics();

      alert(
        data.message ||
        "Second-look assessment completed."
      );
    } catch (error) {
      console.error(error);
      alert(
        "Unable to perform second-look assessment."
      );
    }
  };

  /* =========================================================
     NEW ASSESSMENT
  ========================================================= */

  const startNewAssessment = () => {
    setSymptoms("");
    setAnswers(emptyAnswers);

    setTriageResult(null);
    setSelectedPatient(null);

    setError("");

    setListening(false);

    setVoiceStatus(
      "Tap the microphone and describe the patient's problem"
    );

    setPage("triage");
  };

  /* =========================================================
     PRIORITY STYLE
  ========================================================= */

  const getPriorityClass = (priority) => {
    const value = String(
      priority || ""
    ).toLowerCase();

    if (value.includes("emergency")) {
      return "priority-emergency";
    }

    if (value.includes("urgent")) {
      return "priority-urgent";
    }

    return "priority-routine";
  };

  /* =========================================================
     RESULT PAGE
  ========================================================= */

  if (page === "result" && triageResult) {
    return (
      <div className="app">
        <Navbar
          page={page}
          setPage={setPage}
          openQueue={openQueue}
          openAnalytics={openAnalytics}
        />

        <main className="result-page">
          <div className="result-card">
            <div className="result-icon">
              ⚕
            </div>

            <div className="result-label">
              TRIAGE ASSESSMENT
            </div>

            <h1
              className={`result-priority ${getPriorityClass(
                triageResult.priority
              )}`}
            >
              {triageResult.priority ||
                "ROUTINE"}
            </h1>

            <div className="risk-score">
              <div>
                <span>Risk score</span>
                <strong>
                  {triageResult.risk_score || 0}
                  /100
                </strong>
              </div>

              <div className="score-bar">
                <div
                  style={{
                    width: `${Math.min(
                      triageResult.risk_score || 0,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <h2>
              {triageResult.message ||
                "Assessment completed"}
            </h2>

            <p className="result-description">
              {triageResult.reason ||
                "The assessment has been completed."}
            </p>

            {triageResult.factors?.length > 0 && (
              <div className="result-box warning-box">
                <h3>
                  Why LifeLine flagged this case
                </h3>

                <ul>
                  {triageResult.factors.map(
                    (factor, index) => (
                      <li key={index}>
                        {factor}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            <div className="result-box">
              <h3>
                Patient token
              </h3>

              <div className="token-display">
                {triageResult.token ||
                  "Generating..."}
              </div>

              <p>
                Use this token to identify the
                patient without displaying
                personally identifiable information.
              </p>
            </div>

            <div className="important-box">
              <h3>
                Clinical decision support
              </h3>

              <p>
                LifeLine provides a triage
                recommendation, not a diagnosis.
                A qualified healthcare professional
                must make the final clinical
                decision.
              </p>
            </div>
          </div>

          <button
            className="primary-button"
            onClick={startNewAssessment}
          >
            Start new assessment
          </button>
        </main>
      </div>
    );
  }

  /* =========================================================
     PATIENT DETAILS
  ========================================================= */

  if (
    page === "patient" &&
    selectedPatient
  ) {
    return (
      <div className="app">
        <Navbar
          page={page}
          setPage={setPage}
          openQueue={openQueue}
          openAnalytics={openAnalytics}
        />

        <main className="dashboard-page">
          <button
            className="back-button"
            onClick={openQueue}
          >
            ← Back to queue
          </button>

          <section className="patient-header-card">
            <div>
              <div className="eyebrow">
                ONE-MINUTE PATIENT VIEW
              </div>

              <h1>
                {selectedPatient.token}
              </h1>

              <p>
                Privacy-friendly patient
                identifier
              </p>
            </div>

            <div
              className={`priority-badge large ${getPriorityClass(
                selectedPatient.priority
              )}`}
            >
              {selectedPatient.priority}
            </div>
          </section>

          <div className="patient-grid">
            <section className="doctor-card">
              <h2>Clinical summary</h2>

              <div className="summary-item">
                <span>Main complaint</span>
                <strong>
                  {selectedPatient.symptoms}
                </strong>
              </div>

              <div className="summary-grid">
                <div>
                  <span>Duration</span>
                  <strong>
                    {
                      selectedPatient.answers
                        ?.duration
                    }
                  </strong>
                </div>

                <div>
                  <span>Worsening</span>
                  <strong>
                    {
                      selectedPatient.answers
                        ?.worsening
                    }
                  </strong>
                </div>

                <div>
                  <span>Breathing difficulty</span>
                  <strong>
                    {
                      selectedPatient.answers
                        ?.breathing
                    }
                  </strong>
                </div>

                <div>
                  <span>Chest pain</span>
                  <strong>
                    {
                      selectedPatient.answers
                        ?.chestPain
                    }
                  </strong>
                </div>

                <div>
                  <span>Fainting</span>
                  <strong>
                    {
                      selectedPatient.answers
                        ?.fainting
                    }
                  </strong>
                </div>

                <div>
                  <span>Medical history</span>
                  <strong>
                    {
                      selectedPatient.answers
                        ?.medicalHistory
                    }
                  </strong>
                </div>
              </div>
            </section>

            <section className="doctor-card">
              <h2>
                Why LifeLine flagged it
              </h2>

              {selectedPatient.factors?.length >
                0 ? (
                <ul className="doctor-factors">
                  {selectedPatient.factors.map(
                    (factor, index) => (
                      <li key={index}>
                        ✓ {factor}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="muted">
                  No major warning signs
                  identified.
                </p>
              )}

              <div className="doctor-reason">
                {selectedPatient.reason}
              </div>
            </section>

            <section className="doctor-card">
              <h2>
                Doctor decision
              </h2>

              <p className="muted">
                AI recommendation:
                <strong>
                  {" "}
                  {selectedPatient.ai_priority}
                </strong>
              </p>

              <div className="override-buttons">
                <button
                  onClick={() =>
                    overridePriority(
                      selectedPatient.id,
                      "EMERGENCY"
                    )
                  }
                  className="override emergency"
                >
                  Emergency
                </button>

                <button
                  onClick={() =>
                    overridePriority(
                      selectedPatient.id,
                      "URGENT"
                    )
                  }
                  className="override urgent"
                >
                  Urgent
                </button>

                <button
                  onClick={() =>
                    overridePriority(
                      selectedPatient.id,
                      "ROUTINE"
                    )
                  }
                  className="override routine"
                >
                  Routine
                </button>
              </div>
            </section>

            <section className="doctor-card">
              <h2>
                Patient journey
              </h2>

              <div className="journey">
                <JourneyStep
                  title="Triage"
                  active
                />

                <JourneyStep
                  title="Doctor review"
                  active={
                    selectedPatient.status !==
                    "WAITING"
                  }
                />

                <JourneyStep
                  title="Treatment"
                  active={[
                    "TREATMENT",
                    "FOLLOW_UP",
                    "RECOVERED",
                  ].includes(
                    selectedPatient.status
                  )}
                />

                <JourneyStep
                  title="Follow-up"
                  active={[
                    "FOLLOW_UP",
                    "RECOVERED",
                  ].includes(
                    selectedPatient.status
                  )}
                />

                <JourneyStep
                  title="Recovered"
                  active={
                    selectedPatient.status ===
                    "RECOVERED"
                  }
                />
              </div>

              <select
                value={
                  selectedPatient.status
                }
                onChange={(event) =>
                  updatePatientStatus(
                    selectedPatient.id,
                    event.target.value
                  )
                }
              >
                <option value="WAITING">
                  Waiting
                </option>

                <option value="IN_REVIEW">
                  Doctor reviewing
                </option>

                <option value="TREATMENT">
                  Treatment
                </option>

                <option value="FOLLOW_UP">
                  Follow-up
                </option>

                <option value="RECOVERED">
                  Recovered
                </option>
              </select>
            </section>

            <section className="doctor-card rescue-card">
              <h2>
                Queue Rescue
              </h2>

              <p>
                Waiting:
                <strong>
                  {" "}
                  {selectedPatient.wait_minutes}{" "}
                  minutes
                </strong>
              </p>

              {selectedPatient.rescue_required ? (
                <div className="rescue-alert">
                  ⚠ This patient has exceeded
                  the recommended waiting
                  threshold.
                </div>
              ) : (
                <p className="muted">
                  Waiting time is currently
                  within the expected range.
                </p>
              )}

              <button
                className="secondary-button full"
                onClick={() =>
                  secondLook(
                    selectedPatient.id
                  )
                }
              >
                Run second-look assessment
              </button>
            </section>
          </div>
        </main>
      </div>
    );
  }

  /* =========================================================
     QUEUE
  ========================================================= */

  if (page === "queue") {
    return (
      <div className="app">
        <Navbar
          page={page}
          setPage={setPage}
          openQueue={openQueue}
          openAnalytics={openAnalytics}
        />

        <main className="dashboard-page">
          <section className="dashboard-header">
            <div>
              <div className="eyebrow">
                CLINICAL OPERATIONS
              </div>

              <h1>
                Doctor Queue
              </h1>

              <p>
                Patients are prioritized using
                risk and waiting time.
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={loadQueue}
            >
              {queueLoading
                ? "Refreshing..."
                : "Refresh queue"}
            </button>
          </section>

          <section className="stats-grid">
            <StatCard
              title="Patients"
              value={patients.length}
              subtitle="Current assessments"
            />

            <StatCard
              title="Emergency"
              value={
                patients.filter(
                  (p) =>
                    p.priority ===
                    "EMERGENCY"
                ).length
              }
              subtitle="Immediate review"
            />

            <StatCard
              title="Urgent"
              value={
                patients.filter(
                  (p) =>
                    p.priority ===
                    "URGENT"
                ).length
              }
              subtitle="Priority review"
            />

            <StatCard
              title="Queue rescue"
              value={
                patients.filter(
                  (p) =>
                    p.rescue_required
                ).length
              }
              subtitle="Waiting too long"
            />
          </section>

          <section className="queue-card">
            <div className="queue-card-header">
              <div>
                <h2>
                  Smart patient queue
                </h2>

                <p>
                  Click a patient for the
                  one-minute clinical view.
                </p>
              </div>

              <span className="live-status">
                <span />
                Live
              </span>
            </div>

            {patients.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ☰
                </div>

                <h3>
                  No patients in queue
                </h3>

                <p>
                  Completed triage
                  assessments will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="patient-list">
                {patients.map(
                  (patient, index) => (
                    <div
                      className={`patient-row ${patient.rescue_required
                          ? "rescue-row"
                          : ""
                        }`}
                      key={patient.id}
                      onClick={() =>
                        openPatient(
                          patient
                        )
                      }
                    >
                      <div className="patient-number">
                        {index + 1}
                      </div>

                      <div className="patient-info">
                        <strong>
                          {patient.token}
                        </strong>

                        <span>
                          {patient.symptoms}
                        </span>
                      </div>

                      <div className="wait-time">
                        {patient.wait_minutes}{" "}
                        min
                      </div>

                      {patient.rescue_required && (
                        <span className="rescue-mini">
                          RESCUE
                        </span>
                      )}

                      <div
                        className={`priority-badge ${getPriorityClass(
                          patient.priority
                        )}`}
                      >
                        {
                          patient.priority
                        }
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  /* =========================================================
     ANALYTICS
  ========================================================= */

  if (page === "analytics") {
    return (
      <div className="app">
        <Navbar
          page={page}
          setPage={setPage}
          openQueue={openQueue}
          openAnalytics={openAnalytics}
        />

        <main className="dashboard-page">
          <section className="dashboard-header">
            <div>
              <div className="eyebrow">
                CLINIC INTELLIGENCE
              </div>

              <h1>
                Analytics
              </h1>

              <p>
                Understand patient flow and
                clinic workload.
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={loadAnalytics}
            >
              Refresh
            </button>
          </section>

          {analytics ? (
            <>
              <section className="stats-grid">
                <StatCard
                  title="Total patients"
                  value={
                    analytics.total_patients
                  }
                  subtitle="Assessments today"
                />

                <StatCard
                  title="Emergency"
                  value={
                    analytics.emergency
                  }
                  subtitle="Critical cases"
                />

                <StatCard
                  title="Urgent"
                  value={
                    analytics.urgent
                  }
                  subtitle="Priority cases"
                />

                <StatCard
                  title="Avg wait"
                  value={`${analytics.average_wait} min`}
                  subtitle="Current average"
                />
              </section>

              <div className="analytics-grid">
                <section className="analytics-card">
                  <h2>
                    Patient distribution
                  </h2>

                  <div className="distribution">
                    <AnalyticsBar
                      label="Emergency"
                      value={
                        analytics.emergency
                      }
                      total={
                        analytics.total_patients
                      }
                      className="bar-emergency"
                    />

                    <AnalyticsBar
                      label="Urgent"
                      value={
                        analytics.urgent
                      }
                      total={
                        analytics.total_patients
                      }
                      className="bar-urgent"
                    />

                    <AnalyticsBar
                      label="Routine"
                      value={
                        analytics.routine
                      }
                      total={
                        analytics.total_patients
                      }
                      className="bar-routine"
                    />
                  </div>
                </section>

                <section className="analytics-card">
                  <h2>
                    Patient recovery
                  </h2>

                  <div className="recovery-grid">
                    <RecoveryStat
                      label="Waiting"
                      value={
                        analytics.statuses
                          ?.WAITING || 0
                      }
                    />

                    <RecoveryStat
                      label="In review"
                      value={
                        analytics.statuses
                          ?.IN_REVIEW || 0
                      }
                    />

                    <RecoveryStat
                      label="Treatment"
                      value={
                        analytics.statuses
                          ?.TREATMENT || 0
                      }
                    />

                    <RecoveryStat
                      label="Follow-up"
                      value={
                        analytics.statuses
                          ?.FOLLOW_UP || 0
                      }
                    />

                    <RecoveryStat
                      label="Recovered"
                      value={
                        analytics.statuses
                          ?.RECOVERED || 0
                      }
                    />
                  </div>
                </section>
              </div>

              <section className="analytics-card wide">
                <h2>
                  Operational insights
                </h2>

                <div className="insight-grid">
                  <div>
                    <strong>
                      {analytics.rescue_cases}
                    </strong>

                    <span>
                      Queue rescue cases
                    </span>
                  </div>

                  <div>
                    <strong>
                      {analytics.second_looks}
                    </strong>

                    <span>
                      Second-look assessments
                    </span>
                  </div>

                  <div>
                    <strong>
                      {analytics.recovered}
                    </strong>

                    <span>
                      Patients marked recovered
                    </span>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="empty-state">
              Loading analytics...
            </div>
          )}
        </main>
      </div>
    );
  }

  /* =========================================================
     TRIAGE PAGE
  ========================================================= */

  return (
    <div className="app">
      <Navbar
        page={page}
        setPage={setPage}
        openQueue={openQueue}
        openAnalytics={openAnalytics}
      />

      <main className="main-page">
        <section className="hero">
          <div className="eyebrow">
            CLINICAL DECISION SUPPORT
          </div>

          <h1>
            Identify who needs
            <br />
            <span>attention first.</span>
          </h1>

          <p>
            LifeLine helps frontline healthcare
            teams identify warning signs through
            structured, multilingual triage.
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
                Patient information
              </h2>

              <p>
                Start with the patient's main
                concern.
              </p>
            </div>
          </div>

          <div className="field">
            <label>
              Preferred language
            </label>

            <select
              value={language}
              onChange={(event) =>
                setLanguage(
                  event.target.value
                )
              }
            >
              <option>
                English
              </option>

              <option>
                Tamil
              </option>

              <option>
                Hindi
              </option>
            </select>
          </div>

          <div className="field">
            <div className="label-row">
              <label>
                What is bothering you?
              </label>

              <span className="input-hint">
                Type or speak
              </span>
            </div>

            <div
              className={`voice-box ${listening
                  ? "listening"
                  : ""
                }`}
            >
              <textarea
                value={symptoms}
                onChange={(event) =>
                  setSymptoms(
                    event.target.value
                  )
                }
                placeholder="Describe the patient's symptoms or concerns..."
                rows="5"
                required
              />

              <div className="voice-controls">
                <button
                  type="button"
                  className={`mic-button ${listening
                      ? "mic-active"
                      : ""
                    }`}
                  onClick={
                    startVoiceInput
                  }
                  disabled={
                    !voiceSupported ||
                    listening
                  }
                >
                  <span className="mic-icon">
                    {listening
                      ? "●"
                      : "🎙"}
                  </span>

                  <span>
                    {listening
                      ? "Listening..."
                      : "Speak symptoms"}
                  </span>
                </button>

                <span className="voice-language">
                  {language}
                </span>
              </div>

              <div className="voice-status">
                {voiceStatus}
              </div>
            </div>
          </div>

          <div className="section-divider" />

          <div className="section-header">
            <div className="section-number">
              02
            </div>

            <div>
              <h2>
                Safety questions
              </h2>

              <p>
                These questions identify
                important warning signs.
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
                handleAnswer(
                  "duration",
                  value
                )
              }
            />

            <Question
              label="Are your symptoms getting worse?"
              value={answers.worsening}
              options={[
                "Yes",
                "No",
              ]}
              onChange={(value) =>
                handleAnswer(
                  "worsening",
                  value
                )
              }
            />

            <Question
              label="Are you having difficulty breathing?"
              value={answers.breathing}
              options={[
                "Yes",
                "No",
              ]}
              onChange={(value) =>
                handleAnswer(
                  "breathing",
                  value
                )
              }
            />

            <Question
              label="Are you experiencing severe or concerning chest pain?"
              value={answers.chestPain}
              options={[
                "Yes",
                "No",
              ]}
              onChange={(value) =>
                handleAnswer(
                  "chestPain",
                  value
                )
              }
            />

            <Question
              label="Have you fainted or nearly fainted?"
              value={answers.fainting}
              options={[
                "Yes",
                "No",
              ]}
              onChange={(value) =>
                handleAnswer(
                  "fainting",
                  value
                )
              }
            />

            <Question
              label="Do you have important medical history?"
              value={answers.medicalHistory}
              options={[
                "Yes",
                "No",
              ]}
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
              ⚠ {error}
            </div>
          )}

          <div className="submit-area">
            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Assessing patient..."
                : "Submit for triage →"}
            </button>

            <p>
              Clinical decision support only.
              Final decisions remain with
              qualified healthcare
              professionals.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Navbar({
  page,
  setPage,
  openQueue,
  openAnalytics,
}) {
  return (
    <header className="navbar">
      <div
        className="logo"
        onClick={() =>
          setPage("triage")
        }
      >
        <span className="logo-mark">
          +
        </span>

        LifeLine
      </div>

      <nav className="nav-links">
        <button
          className={
            page === "triage"
              ? "nav-active"
              : ""
          }
          onClick={() =>
            setPage("triage")
          }
        >
          Triage
        </button>

        <button
          className={
            page === "queue"
              ? "nav-active"
              : ""
          }
          onClick={openQueue}
        >
          Doctor Queue
        </button>

        <button
          className={
            page === "analytics"
              ? "nav-active"
              : ""
          }
          onClick={openAnalytics}
        >
          Analytics
        </button>
      </nav>

      <div className="status-pill">
        <span className="status-dot" />
        System operational
      </div>
    </header>
  );
}

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
              className={`option-button ${value === option
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

function StatCard({
  title,
  value,
  subtitle,
}) {
  return (
    <div className="stat-card">
      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {subtitle}
      </small>
    </div>
  );
}

function JourneyStep({
  title,
  active,
}) {
  return (
    <div
      className={`journey-step ${active ? "active" : ""
        }`}
    >
      <div className="journey-dot">
        {active ? "✓" : ""}
      </div>

      <span>
        {title}
      </span>
    </div>
  );
}

function AnalyticsBar({
  label,
  value,
  total,
  className,
}) {
  const percentage =
    total > 0
      ? (value / total) * 100
      : 0;

  return (
    <div className="analytics-bar">
      <div className="bar-label">
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

      <div className="bar-track">
        <div
          className={className}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function RecoveryStat({
  label,
  value,
}) {
  return (
    <div className="recovery-stat">
      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>
    </div>
  );
}

export default App;