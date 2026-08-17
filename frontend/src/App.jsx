import { useState } from "react"
import "./App.css"

function App() {
  const [language, setLanguage] = useState("")
  const [screen, setScreen] = useState("language")
  const [symptoms, setSymptoms] = useState("")
  const [question, setQuestion] = useState(0)
  const [triageResult, setTriageResult] = useState(null)
  const [error, setError] = useState("")

  const [answers, setAnswers] = useState({
    duration: "",
    worsening: "",
    breathing: "",
    chestPain: "",
    fainting: "",
    medicalHistory: "",
  })

  const questions = [
    {
      id: "duration",
      title: "When did your symptoms start?",
      options: [
        "Today",
        "Yesterday",
        "2–3 days ago",
        "More than a week ago",
      ],
    },
    {
      id: "worsening",
      title: "Are your symptoms getting worse?",
      options: [
        "Yes",
        "No",
        "I'm not sure",
      ],
    },
    {
      id: "breathing",
      title: "Are you having severe difficulty breathing?",
      options: [
        "Yes",
        "No",
        "I'm not sure",
      ],
    },
    {
      id: "chestPain",
      title: "Are you having severe or concerning chest pain?",
      options: [
        "Yes",
        "No",
        "I'm not sure",
      ],
    },
    {
      id: "fainting",
      title: "Have you fainted or lost consciousness?",
      options: [
        "Yes",
        "No",
        "I'm not sure",
      ],
    },
    {
      id: "medicalHistory",
      title: "Do you have any important medical history?",
      options: [
        "Yes",
        "No",
        "I'm not sure",
      ],
    },
  ]

  function chooseAnswer(answer) {
    const currentQuestion = questions[question]

    setAnswers({
      ...answers,
      [currentQuestion.id]: answer,
    })
  }

  function goToNextQuestion() {
    if (question < questions.length - 1) {
      setQuestion(question + 1)
    } else {
      setScreen("review")
    }
  }

  async function submitTriage() {
    setError("")
    setTriageResult(null)

    try {
      const response = await fetch("http://127.0.0.1:8000/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: language,
          symptoms: symptoms,
          answers: answers,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail
            ? JSON.stringify(data.detail)
            : `Server returned ${response.status}`
        )
      }

      setTriageResult(data)
      setScreen("result")
    } catch (err) {
      console.error("Triage error:", err)

      setError(
        "Unable to connect to the safety engine. Please make sure the backend is running."
      )
    }
  }

  if (screen === "language") {
    return (
      <div className="app">

        <header className="header">
          <div className="logo">❤️ LifeLine</div>
          <div className="status">● Safe Triage</div>
        </header>

        <main className="main">

          <section className="hero">
            <div className="icon">🩺</div>

            <h1>LifeLine</h1>

            <h2>Safe AI Triage</h2>

            <p>
              Tell us how you are feeling before you meet the doctor.
            </p>
          </section>

          <section className="safety">
            <strong>⚠️ Important</strong>

            <p>
              LifeLine helps prioritise patients. It does not diagnose
              conditions or prescribe medicines. A doctor always makes
              the final decision.
            </p>
          </section>

          <section className="language">
            <h3>Choose your language</h3>

            <div className="language-buttons">

              <button
                className={language === "tamil" ? "selected" : ""}
                onClick={() => setLanguage("tamil")}
              >
                தமிழ்
              </button>

              <button
                className={language === "english" ? "selected" : ""}
                onClick={() => setLanguage("english")}
              >
                English
              </button>

            </div>
          </section>

          <button
            className="continue-button"
            disabled={!language}
            onClick={() => setScreen("intake")}
          >
            Continue
          </button>

        </main>

      </div>
    )
  }

  if (screen === "intake") {
    return (
      <div className="app">

        <header className="header">
          <div className="logo">❤️ LifeLine</div>
          <div className="status">● Safe Triage</div>
        </header>

        <main className="main">

          <div className="progress">
            Step 1 of 7
          </div>

          <section className="intake-header">

            <div className="icon">🩺</div>

            <h1>Tell us what is troubling you</h1>

            <p>
              Describe your symptoms in your own words.
              You don't need medical terms.
            </p>

          </section>

          <section className="safety">
            <strong>⚠️ Important</strong>

            <p>
              LifeLine does not diagnose or prescribe medicines.
              If you have a serious or life-threatening problem,
              seek immediate medical attention.
            </p>
          </section>

          <section className="input-section">

            <label htmlFor="symptoms">
              What are you experiencing?
            </label>

            <textarea
              id="symptoms"
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="For example: I have had fever since yesterday..."
              rows="6"
            />

            <button className="voice-button">
              🎙️ Speak instead
            </button>

          </section>

          <button
            className="continue-button"
            disabled={!symptoms.trim()}
            onClick={() => setScreen("questions")}
          >
            Continue
          </button>

        </main>

      </div>
    )
  }

  if (screen === "questions") {
    const currentQuestion = questions[question]
    const selectedAnswer = answers[currentQuestion.id]

    return (
      <div className="app">

        <header className="header">
          <div className="logo">❤️ LifeLine</div>
          <div className="status">● Safe Triage</div>
        </header>

        <main className="main">

          <div className="progress">
            Question {question + 1} of {questions.length}
          </div>

          <section className="question-card">

            <div className="question-icon">
              {question >= 2 ? "🚨" : "🩺"}
            </div>

            <h1>{currentQuestion.title}</h1>

            <p className="question-help">
              Please choose the answer that best describes your situation.
            </p>

            <div className="answer-options">

              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  className={
                    selectedAnswer === option
                      ? "answer-button selected"
                      : "answer-button"
                  }
                  onClick={() => chooseAnswer(option)}
                >
                  {option}
                </button>
              ))}

            </div>

          </section>

          <button
            className="continue-button"
            disabled={!selectedAnswer}
            onClick={goToNextQuestion}
          >
            {question === questions.length - 1
              ? "Review answers"
              : "Continue"}
          </button>

        </main>

      </div>
    )
  }

  if (screen === "review") {
    return (
      <div className="app">

        <header className="header">
          <div className="logo">❤️ LifeLine</div>
          <div className="status">● Safety Review</div>
        </header>

        <main className="main">

          <div className="progress">
            Triage assessment complete
          </div>

          <section className="review-card">

            <div className="icon">📋</div>

            <h1>Review your answers</h1>

            <p>
              Please check that the information below is correct before
              submitting.
            </p>

            <div className="summary-item">
              <strong>Language</strong>
              <span>
                {language === "tamil" ? "Tamil" : "English"}
              </span>
            </div>

            <div className="summary-item">
              <strong>Chief Complaint</strong>
              <span>{symptoms}</span>
            </div>

            <div className="summary-item">
              <strong>Duration</strong>
              <span>{answers.duration}</span>
            </div>

            <div className="summary-item">
              <strong>Symptoms Worsening</strong>
              <span>{answers.worsening}</span>
            </div>

            <div className="summary-item">
              <strong>Severe Breathing Difficulty</strong>
              <span>{answers.breathing}</span>
            </div>

            <div className="summary-item">
              <strong>Concerning Chest Pain</strong>
              <span>{answers.chestPain}</span>
            </div>

            <div className="summary-item">
              <strong>Fainting / Loss Of Consciousness</strong>
              <span>{answers.fainting}</span>
            </div>

            <div className="summary-item">
              <strong>Important Medical History</strong>
              <span>{answers.medicalHistory}</span>
            </div>

          </section>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button
            className="continue-button"
            onClick={submitTriage}
          >
            Submit for triage
          </button>

        </main>

      </div>
    )
  }

  if (screen === "result") {
    const isEmergency =
      triageResult?.priority === "EMERGENCY"

    return (
      <div className="app">

        <header className="header">
          <div className="logo">❤️ LifeLine</div>
          <div className="status">● Safety Engine</div>
        </header>

        <main className="main">

          <div className="progress">
            Triage assessment complete
          </div>

          <section className="review-card">

            <div className="icon">
              {isEmergency ? "🚨" : "🩺"}
            </div>

            <h1>Triage Priority</h1>

            <div className="triage-result">

              <div className="priority-badge">
                {triageResult?.priority || "UNKNOWN"}
              </div>

              <p>
                <strong>Source:</strong>{" "}
                {triageResult?.source || "Safety Engine"}
              </p>

              {triageResult?.red_flags &&
                triageResult.red_flags.length > 0 && (
                  <div className="summary-item">
                    <strong>Red Flags</strong>

                    <ul>
                      {triageResult.red_flags.map((flag, index) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

              <div className="summary-item">
                <strong>Rationale</strong>

                <span>
                  {triageResult?.rationale ||
                    "Assessment completed by the safety engine."}
                </span>
              </div>

            </div>

            <section className="safety">
              <strong>⚠️ Important</strong>

              <p>
                LifeLine does not provide a diagnosis or prescribe
                medicines. A healthcare professional makes the final
                decision.
              </p>
            </section>

          </section>

        </main>

      </div>
    )
  }

  return null
}

export default App