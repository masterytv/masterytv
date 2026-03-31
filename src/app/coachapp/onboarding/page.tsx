"use client";

/**
 * Onboarding Page — Multi-Step Wizard
 * 
 * Guides new users through:
 * 1. Starting Point (challenge/goal/systematic + URLs)
 * 2. Research Pending (loading animation)
 * 3. Research Confirm (review + edit)
 * 4. Coaching Letter (personalized welcome)
 * 5. Channel Connect (email + Telegram)
 * 6. Complete (redirect to dashboard)
 * 
 * Architecture: SPRINT.md S3.2
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/hooks/useOnboarding";
import { STEP_LABELS, type ResearchResults } from "@/lib/onboarding/machine";
import { motion, AnimatePresence } from "framer-motion";
import "./onboarding.css";

// ─── STEP COMPONENTS ────────────────────────────────────────────────────

function ProgressBar({ stepIndex }: { stepIndex: number }) {
  const totalSteps = STEP_LABELS.length - 1; // Exclude "Complete"
  const progress = Math.min((stepIndex / totalSteps) * 100, 100);

  return (
    <div className="onboarding-progress">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-labels">
        {STEP_LABELS.slice(1, -1).map((label, i) => (
          <span
            key={label}
            className={`progress-label ${i + 1 <= stepIndex ? "active" : ""}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StartingPointStep({
  onSubmit,
}: {
  onSubmit: (data: {
    type: "challenge" | "goal" | "systematic";
    input: string;
    linkedinUrl: string;
    websiteUrl: string;
  }) => void;
}) {
  return (
    <div className="step-content">
      <h2 className="step-title">Where should we start?</h2>
      <p className="step-subtitle">
        Tell us what you&apos;re working on so your coach can hit the ground running.
      </p>

      <div className="starting-cards">
        {[
          {
            type: "challenge" as const,
            icon: "🎯",
            title: "Specific Challenge",
            desc: "I have a problem I need to solve right now",
          },
          {
            type: "goal" as const,
            icon: "🏔️",
            title: "Big Goal",
            desc: "I'm working toward something ambitious",
          },
          {
            type: "systematic" as const,
            icon: "📋",
            title: "Systematic Review",
            desc: "Help me look at everything and prioritize",
          },
        ].map((card) => (
          <button
            key={card.type}
            className="starting-card"
            onClick={() => {
              const input = (document.getElementById("starting-input") as HTMLTextAreaElement)?.value || "";
              const linkedin = (document.getElementById("linkedin-url") as HTMLInputElement)?.value || "";
              const website = (document.getElementById("website-url") as HTMLInputElement)?.value || "";
              onSubmit({ type: card.type, input, linkedinUrl: linkedin, websiteUrl: website });
            }}
          >
            <span className="card-icon">{card.icon}</span>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </button>
        ))}
      </div>

      <div className="starting-details">
        <label htmlFor="starting-input" className="input-label">
          Tell us more (optional but helpful)
        </label>
        <textarea
          id="starting-input"
          className="text-input"
          placeholder="e.g., I'm a SaaS founder trying to get from $10K to $50K MRR..."
          rows={3}
        />

        <div className="url-inputs">
          <div className="url-group">
            <label htmlFor="linkedin-url" className="input-label">LinkedIn Profile</label>
            <input
              id="linkedin-url"
              type="url"
              className="text-input"
              placeholder="https://linkedin.com/in/yourname"
            />
          </div>
          <div className="url-group">
            <label htmlFor="website-url" className="input-label">Company Website</label>
            <input
              id="website-url"
              type="url"
              className="text-input"
              placeholder="https://yourcompany.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearchPendingStep({ error }: { error: string | null }) {
  return (
    <div className="step-content step-center">
      <div className="research-spinner">
        <div className="spinner-ring" />
        <div className="spinner-ring delay-1" />
        <div className="spinner-ring delay-2" />
      </div>
      <h2 className="step-title">Doing my homework on you...</h2>
      <p className="step-subtitle">
        Scanning your LinkedIn and company website to personalize your coaching experience.
      </p>
      {error && (
        <div className="research-error">
          <p>⚠️ {error}</p>
          <p className="error-note">Don&apos;t worry — we can still coach without this data.</p>
        </div>
      )}
    </div>
  );
}

function ResearchConfirmStep({
  results,
  onConfirm,
}: {
  results: ResearchResults | null;
  onConfirm: (edited: ResearchResults) => void;
}) {
  if (!results) return <div className="step-content"><p>No research data available.</p></div>;

  return (
    <div className="step-content">
      <h2 className="step-title">Here&apos;s what I found</h2>
      <p className="step-subtitle">
        Review this summary and correct anything that&apos;s off. Accuracy here means better coaching.
      </p>

      <div className="research-card">
        {results.company_name && (
          <div className="research-item">
            <span className="research-label">Company</span>
            <span className="research-value">{results.company_name}</span>
          </div>
        )}
        {results.user_role && (
          <div className="research-item">
            <span className="research-label">Role</span>
            <span className="research-value">{results.user_role}</span>
          </div>
        )}
        {results.industry && (
          <div className="research-item">
            <span className="research-label">Industry</span>
            <span className="research-value">{results.industry}</span>
          </div>
        )}
        {results.stage && (
          <div className="research-item">
            <span className="research-label">Stage</span>
            <span className="research-value">{results.stage}</span>
          </div>
        )}
        {results.user_background && (
          <div className="research-item full-width">
            <span className="research-label">Background</span>
            <span className="research-value">{results.user_background}</span>
          </div>
        )}
        {results.challenges_detected?.length > 0 && (
          <div className="research-item full-width">
            <span className="research-label">Potential Coaching Topics</span>
            <ul className="research-list">
              {results.challenges_detected.map((c: string, i: number) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="step-actions">
        <button className="btn-primary" onClick={() => onConfirm(results)}>
          Looks Good — Continue
        </button>
      </div>
    </div>
  );
}

function CoachingLetterStep({
  letter,
  onContinue,
}: {
  letter: string | null;
  onContinue: () => void;
}) {
  if (!letter) {
    return (
      <div className="step-content step-center">
        <div className="research-spinner">
          <div className="spinner-ring" />
        </div>
        <h2 className="step-title">Writing your coaching letter...</h2>
      </div>
    );
  }

  return (
    <div className="step-content">
      <h2 className="step-title">Your Coaching Letter</h2>
      <div
        className="coaching-letter"
        dangerouslySetInnerHTML={{ __html: letter.replace(/\n/g, "<br />") }}
      />
      <div className="step-actions">
        <button className="btn-primary" onClick={onContinue}>
          Start Coaching →
        </button>
      </div>
    </div>
  );
}

function ChannelConnectStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="step-content">
      <h2 className="step-title">Stay Connected</h2>
      <p className="step-subtitle">
        Your coach can reach you on multiple channels. Web chat is always available.
      </p>

      <div className="channel-cards">
        <div className="channel-card active">
          <span className="channel-icon">💬</span>
          <h3>Web Chat</h3>
          <p>Always on — chat anytime from your dashboard</p>
          <span className="channel-status connected">Connected ✓</span>
        </div>
        <div className="channel-card">
          <span className="channel-icon">📧</span>
          <h3>Email</h3>
          <p>Get morning briefings and check-ins</p>
          <span className="channel-status connected">Connected ✓</span>
        </div>
        <div className="channel-card disabled">
          <span className="channel-icon">✈️</span>
          <h3>Telegram</h3>
          <p>Quick messages and real-time coaching</p>
          <span className="channel-status">Coming Soon</span>
        </div>
      </div>

      <div className="step-actions">
        <button className="btn-primary" onClick={onComplete}>
          Start My First Session →
        </button>
      </div>
    </div>
  );
}

// ─── MAIN ONBOARDING PAGE ───────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const {
    currentStep,
    stepIndex,
    context,
    loading,
    error,
    submitStartingPoint,
    confirmResearch,
    completeOnboarding,
  } = useOnboarding();

  // Redirect to dashboard when complete
  useEffect(() => {
    if (currentStep === "complete") {
      router.push("/coachapp/dashboard/chat");
    }
  }, [currentStep, router]);

  if (loading) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-loading">
          <div className="spinner-ring" />
          <p>Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <h1 className="onboarding-brand">Mastery Coach</h1>
        <ProgressBar stepIndex={stepIndex} />
      </header>

      <main className="onboarding-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {(currentStep === "signup" || currentStep === "starting_point") && (
              <StartingPointStep onSubmit={submitStartingPoint} />
            )}

            {currentStep === "research_pending" && (
              <ResearchPendingStep error={context.researchError} />
            )}

            {currentStep === "research_confirm" && (
              <ResearchConfirmStep
                results={context.researchResults}
                onConfirm={(edited) => confirmResearch(edited)}
              />
            )}

            {currentStep === "coaching_letter" && (
              <CoachingLetterStep
                letter={context.coachingLetter}
                onContinue={completeOnboarding}
              />
            )}

            {currentStep === "channel_connect" && (
              <ChannelConnectStep onComplete={completeOnboarding} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {error && (
        <div className="onboarding-error">
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  );
}
