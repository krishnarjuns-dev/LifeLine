import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  HeartPulse,
  Home,
  Menu,
  Mic,
  MicOff,
  MoveUp,
  Phone,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
  ChevronRight,
  Siren,
} from "lucide-react";

import "./App.css";

const API_URL = "http://127.0.0.1:5000";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_082433_69699cf8-444b-4484-93cc-053e57896dfd.mp4";

const AVATARS = [
  "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100",
  "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100",
  "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100",
  "https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=100",
];

const EMPTY_ANSWERS = {
  duration: "",
  worsening: "",
  breathing: "",
  chestPain: "",
  fainting: "",
  medicalHistory: "",
};

function App() {
  const [page, setPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);

  const [language, setLanguage] = useState("English");
  const [symptoms, setSymptoms] = useState("");
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);

  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [queue, setQueue] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";

        if (transcript.trim()) {
          setSymptoms((prev) => {
            const clean = prev.trim();

            if (!clean) return transcript.trim();

            return `${clean} ${transcript.trim()}`;
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startVoiceInput = () => {
    if (!recognitionRef.current) {
      setError(
        "Speech recognition is not supported in this browser. Please use Chrome or enter your symptoms manually."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const languageMap = {
      English: "en-IN",
      Tamil: "ta-IN",
      Hindi: "hi-IN",
    };

    recognitionRef.current.lang = languageMap[language] || "en-IN";

    try {
      setError("");
      setIsListening(true);
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
    }
  };

  const navigate = (destination) => {
    setMenuOpen(false);

    if (destination === "home") {
      setPage("home");
    }

    if (destination === "triage") {
      setPage("triage");
    }

    if (destination === "queue") {
      setPage("queue");
      loadQueue();
    }

    if (destination === "analytics") {
      setPage("analytics");
      loadAnalytics();
    }
  };

  const handleAnswer = (field, value) => {
    setAnswers((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setTriageResult(null);

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
        throw new Error(data.message || "Triage request failed");
      }

      setTriageResult(data);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to the LifeLine safety engine. Make sure the Flask backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  const startNewAssessment = () => {
    setSymptoms("");
    setAnswers(EMPTY_ANSWERS);
    setTriageResult(null);
    setError("");
    setPage("triage");
  };

  const loadQueue = async () => {
    try {
      const response = await fetch(`${API_URL}/api/queue`);
      const data = await response.json();

      if (response.ok) {
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.error("Queue error:", err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/analytics`);
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Analytics error:", err);
    }
  };

  useEffect(() => {
    if (page === "queue") {
      loadQueue();
    }

    if (page === "analytics") {
      loadAnalytics();
    }
  }, [page]);

  const activePatients = queue.length;

  return (
    <div className="app-shell">
      <video
        className="background-video"
        autoPlay
        loop
        muted
        playsInline
        src={VIDEO_URL}
      />

      <div className="video-overlay" />

      <header className="navbar">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="LifeLine home"
        >
          <LifeLineLogo />
          <span>LifeLine</span>
        </button>

        <nav className="desktop-nav liquid-glass">
          <button
            className={page === "home" ? "nav-active" : ""}
            onClick={() => navigate("home")}
          >
            Home
          </button>

          <button
            className={page === "triage" ? "nav-active" : ""}
            onClick={() => navigate("triage")}
          >
            Patient Triage
          </button>

          <button
            className={page === "queue" ? "nav-active" : ""}
            onClick={() => navigate("queue")}
          >
            Doctor Queue
          </button>

          <button
            className={page === "analytics" ? "nav-active" : ""}
            onClick={() => navigate("analytics")}
          >
            Analytics
          </button>
        </nav>

        <div className="nav-right">
          <div className="desktop-avatar liquid-glass">
            <CircleUserRound size={20} strokeWidth={1.5} />
          </div>

          <button
            className="mobile-menu-button liquid-glass"
            onClick={() => setMenuOpen((previous) => !previous)}
          >
            <Menu
              className={`menu-icon ${
                menuOpen ? "menu-icon-hidden" : "menu-icon-visible"
              }`}
              size={21}
            />

            <X
              className={`menu-icon ${
                menuOpen ? "menu-icon-visible" : "menu-icon-hidden"
              }`}
              size={21}
            />
          </button>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? "mobile-menu-open" : ""}`}>
        <div className="mobile-menu-content">
          <button onClick={() => navigate("home")}>Home</button>
          <button onClick={() => navigate("triage")}>Patient Triage</button>
          <button onClick={() => navigate("queue")}>Doctor Queue</button>
          <button onClick={() => navigate("analytics")}>Analytics</button>

          <div className="mobile-account">
            <div className="mobile-account-avatar liquid-glass">
              <CircleUserRound size={20} />
            </div>
            <span>Doctor Account</span>
          </div>
        </div>
      </div>

      <main
        className={`main-content ${
          menuOpen ? "main-content-menu-open" : ""
        }`}
      >
        {page === "home" && (
          <HomePage
            activePatients={activePatients}
            navigate={navigate}
          />
        )}

        {page === "triage" && (
          <TriagePage
            language={language}
            setLanguage={setLanguage}
            symptoms={symptoms}
            setSymptoms={setSymptoms}
            answers={answers}
            handleAnswer={handleAnswer}
            handleSubmit={handleSubmit}
            loading={loading}
            error={error}
            isListening={isListening}
            startVoiceInput={startVoiceInput}
            triageResult={triageResult}
            startNewAssessment={startNewAssessment}
          />
        )}

        {page === "queue" && (
          <QueuePage
            queue={queue}
            refreshQueue={loadQueue}
          />
        )}

        {page === "analytics" && (
          <AnalyticsPage analytics={analytics} />
        )}
      </main>
    </div>
  );
}

/* =========================================================
   HOME
========================================================= */

function HomePage({ activePatients, navigate }) {
  return (
    <section className="landing-page">
      <div className="landing-top">
        <div className="hero-badge liquid-glass">
          <div className="avatar-stack">
            {AVATARS.map((avatar) => (
              <img key={avatar} src={avatar} alt="" />
            ))}
          </div>

          <span>AI-assisted clinical triage</span>
        </div>

        <h1>
          Prioritize care.
          <br />
          <span>Save critical time.</span>
        </h1>

        <p className="hero-subtitle">
          LifeLine helps overloaded clinics identify warning signs and
          prioritize patients before they disappear in the queue.
        </p>

        <div className="hero-actions">
          <button
            className="glass-cta liquid-glass"
            onClick={() => navigate("triage")}
          >
            Start Patient Triage
            <ChevronRight size={17} />
          </button>

          <button
            className="secondary-cta"
            onClick={() => navigate("queue")}
          >
            Doctor Dashboard
          </button>
        </div>
      </div>

      <div className="landing-stats">
        <Stat
          icon={<Siren size={17} />}
          value="3"
          label="Triage Priorities"
        />

        <Stat
          icon={<Users size={17} />}
          value={`${activePatients || "Live"}`}
          label="Patient Queue"
        />

        <Stat
          icon={<Activity size={17} />}
          value="Real-time"
          label="Risk Monitoring"
        />
      </div>
    </section>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="stat-block">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* =========================================================
   TRIAGE
========================================================= */

function TriagePage({
  language,
  setLanguage,
  symptoms,
  setSymptoms,
  answers,
  handleAnswer,
  handleSubmit,
  loading,
  error,
  isListening,
  startVoiceInput,
  triageResult,
  startNewAssessment,
}) {
  if (triageResult) {
    return (
      <section className="content-page result-screen">
        <div className="glass-panel result-panel">
          <div className="result-symbol">
            {triageResult.priority === "EMERGENCY" ? (
              <Siren size={38} />
            ) : (
              <HeartPulse size={38} />
            )}
          </div>

          <div className="eyebrow">TRIAGE PRIORITY</div>

          <h1
            className={`priority-title priority-${String(
              triageResult.priority || ""
            ).toLowerCase()}`}
          >
            {triageResult.priority || "EMERGENCY"}
          </h1>

          <h2>
            {triageResult.message ||
              "Your responses have been assessed by the LifeLine triage engine."}
          </h2>

          <p className="result-description">
            {triageResult.reason ||
              "The system identified the warning signs contained in your assessment."}
          </p>

          {Array.isArray(triageResult.factors) &&
            triageResult.factors.length > 0 && (
              <div className="result-detail-box">
                <div className="detail-heading">
                  <AlertCircle size={17} />
                  Factors identified
                </div>

                <ul>
                  {triageResult.factors.map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

          <div className="result-detail-box">
            <div className="detail-heading">
              <ShieldCheck size={17} />
              Important
            </div>

            <p>
              LifeLine provides a triage recommendation and does not diagnose
              disease. The system is designed to help healthcare teams
              prioritize attention.
            </p>
          </div>

          <button className="glass-cta liquid-glass" onClick={startNewAssessment}>
            Start New Assessment
            <ChevronRight size={17} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="content-page">
      <div className="page-heading">
        <div className="eyebrow">PATIENT ASSESSMENT</div>
        <h1>Tell us what you're experiencing.</h1>
        <p>
          A few structured questions help LifeLine identify potential warning
          signs.
        </p>
      </div>

      <form className="glass-panel triage-panel" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="section-title">
            <div className="section-number">01</div>
            <div>
              <h2>Describe the problem</h2>
              <p>You can type or speak in your chosen language.</p>
            </div>
          </div>

          <div className="form-field">
            <label>Preferred language</label>

            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option>English</option>
              <option>Tamil</option>
              <option>Hindi</option>
            </select>
          </div>

          <div className="symptom-box">
            <textarea
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="Describe what you are feeling..."
              required
            />

            <button
              type="button"
              className={`voice-button liquid-glass ${
                isListening ? "voice-active" : ""
              }`}
              onClick={startVoiceInput}
            >
              {isListening ? <MicOff size={19} /> : <Mic size={19} />}

              <span>
                {isListening ? "Listening..." : "Speak"}
              </span>
            </button>
          </div>

          {isListening && (
            <div className="listening-indicator">
              <span className="pulse-dot" />
              Listening in {language}
            </div>
          )}
        </div>

        <div className="form-divider" />

        <div className="form-section">
          <div className="section-title">
            <div className="section-number">02</div>
            <div>
              <h2>Safety questions</h2>
              <p>
                These questions help identify symptoms that may need faster
                attention.
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
              onChange={(value) => handleAnswer("duration", value)}
            />

            <Question
              label="Are your symptoms getting worse?"
              value={answers.worsening}
              options={["Yes", "No"]}
              onChange={(value) => handleAnswer("worsening", value)}
            />

            <Question
              label="Are you having difficulty breathing?"
              value={answers.breathing}
              options={["Yes", "No"]}
              onChange={(value) => handleAnswer("breathing", value)}
            />

            <Question
              label="Are you experiencing severe or concerning chest pain?"
              value={answers.chestPain}
              options={["Yes", "No"]}
              onChange={(value) => handleAnswer("chestPain", value)}
            />

            <Question
              label="Have you fainted or nearly fainted?"
              value={answers.fainting}
              options={["Yes", "No"]}
              onChange={(value) => handleAnswer("fainting", value)}
            />

            <Question
              label="Do you have important medical history?"
              value={answers.medicalHistory}
              options={["Yes", "No"]}
              onChange={(value) => handleAnswer("medicalHistory", value)}
            />
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className="submit-triage liquid-glass"
          disabled={loading}
        >
          {loading ? "Assessing..." : "Submit for Triage"}
          {!loading && <ChevronRight size={18} />}
        </button>

        <div className="privacy-note">
          <ShieldCheck size={14} />
          Responses are used for this triage assessment.
        </div>
      </form>
    </section>
  );
}

function Question({ label, value, options, onChange }) {
  return (
    <div className="question-card">
      <label>{label}</label>

      <div className="option-row">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            className={`option-button ${
              value === option ? "selected" : ""
            }`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   DOCTOR QUEUE
========================================================= */

function QueuePage({ queue, refreshQueue }) {
  const sortedQueue = useMemo(() => {
    const order = {
      EMERGENCY: 0,
      URGENT: 1,
      ROUTINE: 2,
    };

    return [...queue].sort(
      (a, b) =>
        (order[a.priority] ?? 3) - (order[b.priority] ?? 3)
    );
  }, [queue]);

  return (
    <section className="content-page dashboard-page">
      <div className="dashboard-header">
        <div>
          <div className="eyebrow">CLINICAL OPERATIONS</div>
          <h1>Doctor Queue</h1>
          <p>Prioritize patients according to triage risk.</p>
        </div>

        <button className="refresh-button liquid-glass" onClick={refreshQueue}>
          Refresh Queue
        </button>
      </div>

      <div className="dashboard-metrics">
        <MetricCard
          icon={<Users size={18} />}
          value={queue.length}
          label="Patients Waiting"
        />

        <MetricCard
          icon={<Siren size={18} />}
          value={queue.filter((p) => p.priority === "EMERGENCY").length}
          label="Emergency"
        />

        <MetricCard
          icon={<AlertCircle size={18} />}
          value={queue.filter((p) => p.priority === "URGENT").length}
          label="Urgent"
        />

        <MetricCard
          icon={<CheckCircle2 size={18} />}
          value={queue.filter((p) => p.status === "Recovered").length}
          label="Recovered"
        />
      </div>

      <div className="queue-panel glass-panel">
        <div className="queue-panel-header">
          <div>
            <h2>Live Patient Queue</h2>
            <p>Highest-risk cases appear first.</p>
          </div>

          <div className="live-indicator">
            <span />
            LIVE
          </div>
        </div>

        {sortedQueue.length === 0 ? (
          <div className="empty-state">
            <HeartPulse size={34} />
            <h3>No patients in queue</h3>
            <p>New triage assessments will appear here.</p>
          </div>
        ) : (
          <div className="queue-list">
            {sortedQueue.map((patient, index) => (
              <PatientRow
                key={patient.id || index}
                patient={patient}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ icon, value, label }) {
  return (
    <div className="metric-card liquid-glass">
      <div className="metric-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PatientRow({ patient, index }) {
  const priority = String(patient.priority || "ROUTINE").toUpperCase();

  return (
    <div className="patient-row">
      <div className="queue-position">
        #{index + 1}
      </div>

      <div className={`priority-dot ${priority.toLowerCase()}`} />

      <div className="patient-main">
        <strong>
          {patient.patient_name ||
            patient.name ||
            `Patient ${patient.id || index + 1}`}
        </strong>

        <span>
          {patient.symptoms || "Assessment submitted"}
        </span>
      </div>

      <div className="patient-time">
        <Clock3 size={14} />
        {patient.wait_time || patient.created_at || "Just now"}
      </div>

      <div className={`priority-tag ${priority.toLowerCase()}`}>
        {priority}
      </div>
    </div>
  );
}

/* =========================================================
   ANALYTICS
========================================================= */

function AnalyticsPage({ analytics }) {
  const stats = analytics || {
    total_patients: 0,
    emergency: 0,
    urgent: 0,
    routine: 0,
    recovered: 0,
    average_wait_time: "—",
  };

  const total = Number(stats.total_patients || 0);

  return (
    <section className="content-page dashboard-page">
      <div className="dashboard-header">
        <div>
          <div className="eyebrow">CLINICAL INSIGHTS</div>
          <h1>Analytics</h1>
          <p>Understand patient flow, risk distribution and recovery.</p>
        </div>
      </div>

      <div className="analytics-grid">
        <AnalyticsCard
          title="Total Patients"
          value={stats.total_patients}
          icon={<Users size={19} />}
          description="Patients assessed"
        />

        <AnalyticsCard
          title="Emergency"
          value={stats.emergency}
          icon={<Siren size={19} />}
          description="Highest priority"
        />

        <AnalyticsCard
          title="Urgent"
          value={stats.urgent}
          icon={<AlertCircle size={19} />}
          description="Needs faster review"
        />

        <AnalyticsCard
          title="Recovered"
          value={stats.recovered}
          icon={<CheckCircle2 size={19} />}
          description="Completed cases"
        />
      </div>

      <div className="analytics-main">
        <div className="glass-panel distribution-panel">
          <div className="panel-title">
            <div>
              <h2>Priority Distribution</h2>
              <p>Current triage severity breakdown.</p>
            </div>
            <BarChart3 size={20} />
          </div>

          <ProgressBar
            label="Emergency"
            value={stats.emergency}
            total={total}
            type="emergency"
          />

          <ProgressBar
            label="Urgent"
            value={stats.urgent}
            total={total}
            type="urgent"
          />

          <ProgressBar
            label="Routine"
            value={stats.routine}
            total={total}
            type="routine"
          />
        </div>

        <div className="glass-panel recovery-panel">
          <div className="panel-title">
            <div>
              <h2>Recovery Process</h2>
              <p>Patient outcome overview.</p>
            </div>

            <Activity size={20} />
          </div>

          <div className="recovery-circle">
            <div>
              <strong>
                {total
                  ? Math.round(
                      (Number(stats.recovered || 0) / total) * 100
                    )
                  : 0}
                %
              </strong>
              <span>Recovered</span>
            </div>
          </div>

          <div className="recovery-info">
            <span>
              <Clock3 size={15} />
              Average wait: {stats.average_wait_time || "—"}
            </span>

            <span>
              <HeartPulse size={15} />
              Completed cases: {stats.recovered || 0}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsCard({ title, value, icon, description }) {
  return (
    <div className="analytics-card glass-panel">
      <div className="analytics-icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </div>
  );
}

function ProgressBar({ label, value, total, type }) {
  const percentage = total
    ? Math.min(100, (Number(value || 0) / total) * 100)
    : 0;

  return (
    <div className="progress-item">
      <div className="progress-label">
        <span>{label}</span>
        <strong>{value || 0}</strong>
      </div>

      <div className="progress-track">
        <div
          className={`progress-fill ${type}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   LOGO
========================================================= */

function LifeLineLogo() {
  return (
    <svg
      className="lifeline-logo"
      viewBox="0 0 256 256"
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M 128 128 C 198.692 128 256 185.308 256 256 L 151.883 256 C 149.812 220.307 120.213 192 84 192 C 47.787 192 18.188 220.307 16.117 256 L 0 256 C 0 185.308 57.308 128 128 128 Z M 104.117 0 C 106.188 35.694 135.787 64 172 64 C 208.213 64 237.812 35.694 239.883 0 L 256 0 C 256 70.692 198.692 128 128 128 C 57.308 128 0 70.692 0 0 Z" />
    </svg>
  );
}

export default App;