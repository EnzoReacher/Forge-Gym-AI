"use client";

import { FormEvent, memo, useEffect, useState } from "react";

type Screen = "Today" | "Train" | "Fuel" | "Coach" | "Progress";
type TrainView = "Session" | "Week" | "Library";
type EntryStage = "landing" | "login" | "onboarding" | "app";
type LaunchMode = "return" | "new";
export type ForgeAuthenticatedUser = { displayName: string; email: string };
type ForgeProfile = { displayName: string; units: "Metric" | "Imperial"; notifications: boolean };
type SetLog = { kg: number; reps: number; rir?: number; done: boolean };
type Exercise = { id: string; name: string; target: string; cue: string; sets: SetLog[] };
type Meal = { id: number; time: string; name: string; detail: string; kcal: number; protein: number };
type WorkoutSummary = {
  id: number;
  completedAt: number;
  title: string;
  durationSeconds: number;
  completedSets: number;
  totalSets: number;
  exerciseCount: number;
  volume: number;
  averageRir: number;
  bestSet: string;
  note: string;
};
type LibraryMove = {
  target: string;
  name: string;
  role: string;
  cue: string;
  startKg: number;
  reps: number;
};
type IconName = "home" | "train" | "fuel" | "coach" | "progress" | "search" | "plus";

const nav: { name: Screen; icon: IconName }[] = [
  { name: "Today", icon: "home" },
  { name: "Train", icon: "train" },
  { name: "Fuel", icon: "fuel" },
  { name: "Coach", icon: "coach" },
  { name: "Progress", icon: "progress" },
];

function ForgeIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></>,
    train: <><path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/></>,
    fuel: <><path d="M12 3c3.7 4 5.5 7.2 5.5 10a5.5 5.5 0 1 1-11 0c0-2.8 1.8-6 5.5-10Z"/><path d="M9.5 15.5c.6 1.2 1.4 1.8 2.5 1.8"/></>,
    coach: <><path d="m12 3 1.4 5.1L18.5 9.5l-5.1 1.4L12 16l-1.4-5.1-5.1-1.4 5.1-1.4L12 3Z"/><path d="m18.5 15 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"/></>,
    progress: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-5 3 2 5-6"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
  };
  return <svg className="forge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const forgeSparks = Array.from({ length: 120 }, (_, index) => ({
  x: 8 + ((index * 29) % 91),
  origin: 2 + ((index * 13) % 34),
  drift: -360 + ((index * 97) % 720),
  travel: 180 + ((index * 67) % 560),
  size: 2 + (index % 4),
  delay: -((index * 0.113) % 3.4),
  duration: 1.55 + ((index * 0.071) % 1.75),
}));

const ForgeAmbience = memo(function ForgeAmbience({ density = 120 }: { density?: number }) {
  return (
    <div className="forge-ambience" aria-hidden="true">
      <div className="forge-haze" />
      <div className="hammer-flash" />
      <div className="hammer-flash hammer-flash-echo" />
      <div className="spark-field">
        {forgeSparks.slice(0, density).map((spark, index) => <i key={index} style={{
          "--spark-x": `${spark.x}%`,
          "--spark-origin": `${spark.origin}%`,
          "--spark-drift": `${spark.drift}px`,
          "--spark-rise": `-${spark.travel}px`,
          "--spark-size": `${spark.size}px`,
          "--spark-delay": `${spark.delay}s`,
          "--spark-duration": `${spark.duration}s`,
        } as React.CSSProperties} />)}
      </div>
    </div>
  );
});

function CinematicIntro({ mode, athleteName, onSkip }: { mode: LaunchMode; athleteName: string; onSkip: () => void }) {
  return (
    <div
      className={`cinematic-gate cinematic-${mode}`}
      style={{ "--cinematic-duration": mode === "return" ? "1.05s" : "2.15s" } as React.CSSProperties}
      aria-live="polite"
      aria-label={mode === "return" ? "Welcome back to Forge" : "Your Forge plan is ready"}
      role="button"
      tabIndex={0}
      onClick={onSkip}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Escape") onSkip();
      }}
    >
      <ForgeAmbience density={mode === "return" ? 16 : 24} />
      <div className="cinematic-vignette" aria-hidden="true" />
      <div className="cinematic-strike" aria-hidden="true" />
      <div className="cinematic-mark">
        <span>{mode === "return" ? `WELCOME BACK, ${athleteName.toUpperCase()}` : "YOUR PLAN IS READY"}</span>
        <h1>FORGE</h1>
        <div className="cinematic-rule"><i /></div>
        <p>{mode === "return" ? "LET’S WORK." : "THE WORK IS YOURS."}</p>
      </div>
      <span className="cinematic-skip">Skip</span>
    </div>
  );
}

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function WorkoutComplete({ summary, onToday, onProgress }: { summary: WorkoutSummary; onToday: () => void; onProgress: () => void }) {
  return (
    <div className="workout-complete" role="dialog" aria-modal="true" aria-labelledby="workout-complete-title">
      <ForgeAmbience density={28} />
      <div className="completion-strike" aria-hidden="true" />
      <section>
        <p className="eyebrow hot">SESSION FORGED</p>
        <span className="completion-mark">✦</span>
        <h2 id="workout-complete-title">The work is done.<br /><em>The standard remains.</em></h2>
        <p className="completion-copy">Upper Strength is locked into your protocol. Recover, refuel, and return stronger.</p>
        <div className="completion-stats">
          <div><small>VOLUME</small><strong>{summary.volume.toLocaleString()}<em> kg</em></strong></div>
          <div><small>WORKING SETS</small><strong>{summary.completedSets}<em> / {summary.totalSets}</em></strong></div>
          <div><small>DURATION</small><strong>{formatClock(summary.durationSeconds)}</strong></div>
          <div><small>AVG. RIR</small><strong>{summary.averageRir.toFixed(1)}</strong></div>
        </div>
        <div className="completion-best"><span>BEST SET</span><strong>{summary.bestSet}</strong></div>
        <div className="completion-actions">
          <button className="outline-action" onClick={onToday}>Back to today</button>
          <button className="finish-action" onClick={onProgress}>View progress <span>→</span></button>
        </div>
        <small className="completion-protocol">THE SPARTAN PROTOCOL · SESSION ARCHIVED</small>
      </section>
    </div>
  );
}

const initialExercises: Exercise[] = [
  { id: "incline", name: "Incline dumbbell press", target: "Upper chest", cue: "4–2–1 tempo · full ROM", sets: [{ kg: 26, reps: 10, done: false }, { kg: 28, reps: 8, done: false }, { kg: 30, reps: 7, done: false }, { kg: 30, reps: 6, done: false }] },
  { id: "pullup", name: "Weighted pull-up", target: "Lats", cue: "Dead hang · chest to bar", sets: [{ kg: 5, reps: 8, done: false }, { kg: 5, reps: 8, done: false }, { kg: 5, reps: 7, done: false }] },
  { id: "shoulder", name: "Seated dumbbell press", target: "Shoulders", cue: "No lockout · RIR 2", sets: [{ kg: 22, reps: 10, done: false }, { kg: 22, reps: 9, done: false }, { kg: 22, reps: 8, done: false }] },
  { id: "triceps", name: "Cable triceps extension", target: "Triceps", cue: "Long-head bias · controlled", sets: [{ kg: 24, reps: 14, done: false }, { kg: 24, reps: 12, done: false }, { kg: 24, reps: 11, done: false }] },
];

const initialMeals: Meal[] = [
  { id: 1, time: "07:20", name: "Breakfast", detail: "5 eggs · fresh milk", kcal: 640, protein: 46 },
  { id: 2, time: "12:15", name: "Lunch", detail: "Rice · chicken breast · greens", kcal: 720, protein: 58 },
  { id: 3, time: "16:20", name: "Pre-workout", detail: "Banana · yogurt", kcal: 260, protein: 12 },
];

const weekPlan = [
  { day: "MON", date: "27", title: "Upper strength", focus: "Chest · Back", duration: "80 min", status: "today" },
  { day: "TUE", date: "28", title: "Back width", focus: "Lats · Biceps", duration: "65 min", status: "next" },
  { day: "WED", date: "29", title: "Chest control", focus: "Mid · Lower", duration: "60 min", status: "next" },
  { day: "THU", date: "30", title: "Back thickness", focus: "Rows · Rear delts", duration: "70 min", status: "next" },
  { day: "FRI", date: "31", title: "Shoulders & arms", focus: "Delts · Arms", duration: "60 min", status: "next" },
  { day: "SAT", date: "01", title: "Recovery", focus: "Swim · Mobility", duration: "35 min", status: "rest" },
  { day: "SUN", date: "02", title: "Full rest", focus: "Walk · Reset", duration: "—", status: "rest" },
];

const exerciseLibrary: LibraryMove[] = [
  { target: "CHEST", name: "Incline dumbbell press", role: "Primary · Strength", cue: "4–2–1 tempo", startKg: 26, reps: 8 },
  { target: "BACK", name: "Weighted pull-up", role: "Primary · Width", cue: "Full ROM", startKg: 5, reps: 8 },
  { target: "BACK", name: "Chest-supported row", role: "Primary · Thickness", cue: "Pause at peak", startKg: 40, reps: 10 },
  { target: "SHOULDERS", name: "Seated dumbbell press", role: "Primary · Strength", cue: "RIR 2", startKg: 22, reps: 9 },
  { target: "ARMS", name: "Cable triceps extension", role: "Accessory · Long head", cue: "Control", startKg: 24, reps: 12 },
  { target: "LEGS", name: "Hip abduction", role: "Recovery · Knee friendly", cue: "Pain-free ROM", startKg: 25, reps: 15 },
];

function useStoredState<T>(key: string, fallback: T, accountBacked = false) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (accountBacked) {
      fetch(`/api/state?key=${encodeURIComponent(key)}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("account_state_unavailable");
          return response.json() as Promise<{ value: T | null }>;
        })
        .then((payload) => {
          if (!cancelled) {
            setLoadError(false);
            if (payload.value !== null) setValue(payload.value);
          }
        })
        .catch(() => {
          if (!cancelled) setLoadError(true);
        })
        .finally(() => {
          if (!cancelled) setReady(true);
        });

      return () => {
        cancelled = true;
      };
    }

    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(key);
        if (stored) setValue(JSON.parse(stored));
      } catch {}
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [accountBacked, key]);

  useEffect(() => {
    if (!ready || (accountBacked && loadError)) return;

    if (accountBacked) {
      const id = window.setTimeout(() => {
        fetch(`/api/state?key=${encodeURIComponent(key)}`, {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("account_state_save_failed");
            setSyncError(false);
          })
          .catch(() => setSyncError(true));
      }, 450);

      return () => window.clearTimeout(id);
    }

    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [accountBacked, key, loadError, ready, value]);

  return [value, setValue, ready, loadError, syncError] as const;
}

function EntryFlow({ onEnter, initialStage = "landing" }: { onEnter: (mode: LaunchMode) => void; initialStage?: Exclude<EntryStage, "app"> }) {
  const [stage, setStage] = useState<Exclude<EntryStage, "app">>(initialStage);
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("Strength");
  const [days, setDays] = useState("5 days");
  const [coachStyle, setCoachStyle] = useState("Balanced");

  if (stage === "landing") {
    return (
      <div className="entry-shell landing-page">
        <ForgeAmbience density={36} />
        <header className="entry-nav">
          <button className="entry-brand" aria-label="Forge home"><strong>FORGE</strong></button>
          <nav className="landing-nav-links" aria-label="Landing navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#inside-forge">Inside FORGE</a>
          </nav>
          <button className="entry-login-link" onClick={() => setStage("login")}>Sign in <span>↗</span></button>
        </header>

        <main className="landing-main">
          <section className="landing-hero">
            <div className="landing-copy">
              <p className="entry-eyebrow">Training, food, recovery, one clear place</p>
              <h1>Know what to do.<br /><em>Then do the work.</em></h1>
              <p className="landing-lead">FORGE keeps your plan, workout log, nutrition and progress together—so you spend less time sorting data and more time building yourself.</p>
              <div className="landing-actions">
                <button className="entry-primary" onClick={() => setStage("onboarding")}>Set up my plan <span>→</span></button>
                <a className="entry-ghost" href="#how-it-works">See how it works</a>
              </div>
              <div className="landing-proof" aria-label="What Forge helps with">
                <div><strong>Today</strong><span>See the next useful action</span></div>
                <div><strong>Train</strong><span>Log without leaving the flow</span></div>
                <div><strong>Progress</strong><span>Learn what the work changed</span></div>
              </div>
            </div>

            <div className="landing-monolith" aria-label="Example training day">
              <div className="molten-edge" aria-hidden="true" />
              <header><span>Example day</span><small>Tuesday</small></header>
              <div className="monolith-session">
                <small>Next session</small>
                <h2>Upper strength</h2>
                <p>Chest · Back · Shoulders</p>
              </div>
              <ol>
                <li><span>01</span><p><strong>Incline press</strong><small>4 working sets</small></p></li>
                <li><span>02</span><p><strong>Weighted pull-up</strong><small>3 working sets</small></p></li>
                <li><span>03</span><p><strong>Shoulder press</strong><small>3 working sets</small></p></li>
              </ol>
              <footer><span>Plan ready</span><strong>Start when you are</strong></footer>
            </div>
          </section>

          <section className="landing-system" id="how-it-works">
            <header className="landing-section-head">
              <p className="entry-eyebrow">How it works</p>
              <div>
                <h2>One loop you can understand.</h2>
                <p>Open FORGE, see what matters, do the work and record the result. Tomorrow starts from what actually happened.</p>
              </div>
            </header>
            <div className="system-rail">
              {[
                ["01", "Today", "Your recovery, schedule and next useful action."],
                ["02", "Train", "Your plan and workout log in the same flow."],
                ["03", "Fuel", "Meals, macros and hydration without spreadsheet noise."],
                ["04", "Coach", "Guidance that uses the context you choose to share."],
                ["05", "Progress", "Strength, body and consistency shown clearly."],
              ].map(([number, title, copy]) => (
                <article key={title}>
                  <small>{number}</small>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <i aria-hidden="true">—</i>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-command" id="inside-forge">
            <div className="landing-command-copy">
              <p className="entry-eyebrow">Built for the gym floor</p>
              <h2>Less dashboard.<br />More direction.</h2>
              <p>FORGE makes the next action obvious and keeps secondary detail out of your way until you need it.</p>
              <ul>
                <li><span>01</span>Start or adjust today’s session</li>
                <li><span>02</span>Log sets, meals and water quickly</li>
                <li><span>03</span>Review progress without vanity noise</li>
              </ul>
            </div>
            <div className="command-ui" aria-label="Sample Forge workout">
              <header><span>Sample workout</span><i>In progress</i></header>
              <div className="command-greeting"><small>Upper strength</small><strong>Three movements left.</strong></div>
              <div className="command-grid">
                <article className="command-session">
                  <small>Current movement</small>
                  <h3>Incline dumbbell press</h3>
                  <p>Full range · controlled tempo</p>
                  <div><span>30 kg<small>Weight</small></span><span>8<small>Reps</small></span><span>2<small>Reps in reserve</small></span></div>
                  <button onClick={() => setStage("onboarding")}>Build my plan <b>→</b></button>
                </article>
                <article className="command-score">
                  <small>Why this matters</small>
                  <strong>Clear<em>, not crowded</em></strong>
                  <p>The controls you need stay close. Everything else waits.</p>
                </article>
              </div>
            </div>
          </section>

          <section className="landing-intelligence">
            <div className="landing-belief">
              <p className="entry-eyebrow">The role of FORGE</p>
              <h2>We stand beside you.<br />We do not do the work for you.</h2>
              <p>FORGE helps make training easier to understand and easier to continue. Your effort, choices and consistency decide the outcome.</p>
            </div>
            <div className="landing-belief-lines">
              <p><span>Train</span><strong>A plan you can follow today.</strong></p>
              <p><span>Fuel</span><strong>Simple records you can correct.</strong></p>
              <p><span>Coach</span><strong>Context when you need a second opinion.</strong></p>
              <p><span>Progress</span><strong>Evidence of what changed over time.</strong></p>
            </div>
          </section>

          <section className="landing-final">
            <p className="entry-eyebrow">Start with one honest goal</p>
            <h2>Build a plan that fits your life.</h2>
            <p>Three short questions. You can change every answer later.</p>
            <button className="entry-primary" onClick={() => setStage("onboarding")}>Set up FORGE <span>→</span></button>
          </section>
        </main>

        <footer className="entry-footer landing-footer"><span>FORGE / 2026</span><i /><p>Built to support the work.</p></footer>
      </div>
    );
  }

  if (stage === "login") {
    return (
      <div className="entry-shell login-page">
        <ForgeAmbience density={20} />
        <button className="entry-back" onClick={() => setStage("landing")}>← Back</button>
        <button className="entry-brand login-brand" onClick={() => setStage("landing")} aria-label="Forge home"><strong>FORGE</strong></button>
        <section className="login-manifesto">
          <p className="entry-eyebrow">Welcome back</p>
          <h1>Continue where<br /><em>you left off.</em></h1>
          <blockquote>Your plan, records and progress stay with your account—not with this browser.</blockquote>
          <div className="login-points">
            <p><span>01</span><strong>One secure sign-in</strong><small>Use the same ChatGPT account you used before.</small></p>
            <p><span>02</span><strong>No FORGE password</strong><small>FORGE never asks for or stores your password.</small></p>
            <p><span>03</span><strong>Your work stays yours</strong><small>Account data is kept separate from other athletes.</small></p>
          </div>
        </section>
        <section className="login-panel">
          <div className="login-card">
            <p className="login-index">Secure sign in</p>
            <header><p><strong>Ready when you are.</strong><small>Continue with ChatGPT to open your FORGE account.</small></p></header>
            <div className="secure-entry-copy">
              <span>Before you continue</span>
              <p>Check that the ChatGPT account in the sign-in window is the account you want attached to your training records.</p>
            </div>
            <button className="entry-primary secure-entry-action" onClick={() => onEnter("return")}>Continue with ChatGPT <span>→</span></button>
            <small className="secure-entry-note">FORGE receives your verified identity. It does not receive your password.</small>
            <footer>New to FORGE? <button onClick={() => setStage("onboarding")}>Set up your plan</button></footer>
          </div>
        </section>
      </div>
    );
  }

  const onboardingData = step === 1 ? {
    eyebrow: "Your goal",
    title: "What are you training for?",
    copy: "Choose one starting point. You can change it later.",
    options: [
      ["Strength", "Get stronger in the lifts that matter to you.", "01"],
      ["Muscle", "Build size with manageable weekly volume.", "02"],
      ["Hybrid", "Balance strength with conditioning.", "03"],
    ],
    value: goal,
    setValue: setGoal,
  } : step === 2 ? {
    eyebrow: "Your week",
    title: "How often can you train?",
    copy: "Pick the rhythm you can repeat on a normal week.",
    options: [
      ["3 days", "Focused sessions with more recovery.", "03"],
      ["4 days", "A balanced training week.", "04"],
      ["5 days", "More frequent, shorter exposures.", "05"],
    ],
    value: days,
    setValue: setDays,
  } : {
    eyebrow: "Your guidance",
    title: "How should the coach respond?",
    copy: "Choose the tone you will actually listen to.",
    options: [
      ["Protective", "More caution around fatigue and joint stress.", "P"],
      ["Balanced", "Direct guidance with sensible guardrails.", "B"],
      ["Relentless", "Short, demanding cues with less reassurance.", "R"],
    ],
    value: coachStyle,
    setValue: setCoachStyle,
  };

  return (
    <div className="entry-shell onboarding-page">
      <ForgeAmbience density={18} />
      <header className="onboarding-nav">
        <button className="entry-brand" onClick={() => setStage("landing")}><strong>FORGE</strong></button>
        <div className="onboarding-progress"><span>Step</span><div>{[1,2,3].map((item) => <i className={item <= step ? "active" : ""} key={item} />)}</div><b>{step} of 3</b></div>
        <button className="onboarding-skip" onClick={() => onEnter("new")}>Skip for now</button>
      </header>
      <main className="onboarding-stage">
        <div className="onboarding-copy">
          <span className="onboarding-step-mark">0{step}</span>
          <p className="entry-eyebrow">{onboardingData.eyebrow}</p>
          <h1>{onboardingData.title}</h1>
          <p>{onboardingData.copy}</p>
          <div className="onboarding-principle">
            <small>Why we ask</small>
            <p>{step === 1 ? "A clear priority helps us remove work that does not serve you." : step === 2 ? "A plan only works when it fits the week you really have." : "Useful guidance should match how you prefer to make decisions."}</p>
          </div>
        </div>
        <div className="onboarding-decision">
          <div className="onboarding-options">
            {onboardingData.options.map(([name, copy, mark]) => (
              <button className={onboardingData.value === name ? "selected" : ""} onClick={() => onboardingData.setValue(name)} key={name}>
                <small>{mark}</small><span><strong>{name}</strong><em>{copy}</em></span><i>{onboardingData.value === name ? "✓" : "○"}</i>
              </button>
            ))}
          </div>
          <div className="onboarding-live-summary" aria-label="Your current choices">
            <span><small>Goal</small><strong>{goal}</strong></span>
            <span><small>Days</small><strong>{days}</strong></span>
            <span><small>Coach</small><strong>{coachStyle}</strong></span>
          </div>
          <div className="onboarding-actions">
            <button disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))}>← Back</button>
            <button className="entry-primary" onClick={() => step < 3 ? setStep(step + 1) : onEnter("new")}>{step < 3 ? "Continue" : "Build my plan"} <span>→</span></button>
          </div>
        </div>
      </main>
      <footer className="onboarding-footer"><span>Nothing is permanent.</span><strong>You can change these choices later.</strong></footer>
    </div>
  );
}

export default function Home({
  initialEntryStage = "landing",
  initialLaunchMode = null,
  authenticatedUser = null,
}: {
  initialEntryStage?: EntryStage;
  initialLaunchMode?: LaunchMode | null;
  authenticatedUser?: ForgeAuthenticatedUser | null;
}) {
  const accountBacked = Boolean(authenticatedUser);
  const identityName = authenticatedUser?.displayName?.trim() || "Athlete";
  const defaultProfile: ForgeProfile = {
    displayName: identityName,
    units: "Metric",
    notifications: true,
  };
  const [entryStage, setEntryStage] = useState<EntryStage>(initialEntryStage);
  const [screen, setScreen] = useState<Screen>("Today");
  const [exercises, setExercises, exercisesReady, exercisesLoadError, exercisesSyncError] = useStoredState("forge-exercises", initialExercises, accountBacked);
  const [meals, setMeals, mealsReady, mealsLoadError, mealsSyncError] = useStoredState("forge-meals", accountBacked ? [] : initialMeals, accountBacked);
  const [water, setWater, waterReady, waterLoadError, waterSyncError] = useStoredState("forge-water", accountBacked ? 0 : 1750, accountBacked);
  const [workoutStarted, setWorkoutStarted, workoutReady, workoutLoadError, workoutSyncError] = useStoredState("forge-workout-live", false, accountBacked);
  const [workoutStartedAt, setWorkoutStartedAt, startedAtReady, startedAtLoadError, startedAtSyncError] = useStoredState("forge-workout-started-at", 0, accountBacked);
  const [workoutHistory, setWorkoutHistory, historyReady, historyLoadError, historySyncError] = useStoredState<WorkoutSummary[]>("forge-workout-history", [], accountBacked);
  const [profile, setProfile, profileReady, profileLoadError, profileSyncError] = useStoredState<ForgeProfile>("forge-profile", defaultProfile, accountBacked);
  const [commandOpen, setCommandOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [launchMode, setLaunchMode] = useState<LaunchMode | null>(initialLaunchMode);
  const [finishSummary, setFinishSummary] = useState<WorkoutSummary | null>(null);
  const accountReady = !accountBacked || [exercisesReady, mealsReady, waterReady, workoutReady, startedAtReady, historyReady, profileReady].every(Boolean);
  const accountLoadError = accountBacked && [exercisesLoadError, mealsLoadError, waterLoadError, workoutLoadError, startedAtLoadError, historyLoadError, profileLoadError].some(Boolean);
  const accountSyncError = accountBacked && [exercisesSyncError, mealsSyncError, waterSyncError, workoutSyncError, startedAtSyncError, historySyncError, profileSyncError].some(Boolean);
  const athleteName = profile.displayName.trim().split(/\s+/)[0] || "Athlete";
  const athleteInitial = athleteName.slice(0, 1).toUpperCase();

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!launchMode) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => {
      setEntryStage("app");
      setLaunchMode(null);
    }, reducedMotion ? 450 : launchMode === "return" ? 1250 : 3000);
    return () => window.clearTimeout(id);
  }, [launchMode]);

  function go(next: Screen) {
    setScreen(next);
    setCommandOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startWorkout() {
    const allSetsFinished = exercises.every((exercise) => exercise.sets.every((set) => set.done));
    if (allSetsFinished) {
      setExercises((current) => current.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set, done: false })),
      })));
    }
    if (!workoutStarted || !workoutStartedAt) setWorkoutStartedAt(Date.now());
    setWorkoutStarted(true);
    go("Train");
    setToast("Session started — make every rep count.");
  }

  function finishWorkout(summary: WorkoutSummary) {
    setWorkoutHistory((current) => [summary, ...current.filter((item) => item.id !== summary.id)].slice(0, 20));
    setWorkoutStarted(false);
    setWorkoutStartedAt(0);
    setFinishSummary(summary);
  }

  if (entryStage !== "app" && !launchMode) {
    return <EntryFlow
      onEnter={(mode) => {
        const returnTo = mode === "new" ? "/app?welcome=new" : "/app";
        window.location.assign(`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`);
      }}
      initialStage={entryStage}
    />;
  }

  if (!accountReady) {
    return <div className="account-loading" role="status" aria-live="polite"><ForgeAmbience density={22} /><strong>FORGE</strong><span>Loading your protocol…</span></div>;
  }

  if (accountLoadError) {
    return <div className="account-loading account-error" role="alert"><ForgeAmbience density={12} /><strong>FORGE</strong><span>Your account data could not be loaded safely.</span><button onClick={() => window.location.reload()}>TRY AGAIN</button></div>;
  }

  return (
    <>
      <div className={`app-shell${launchMode ? " cinematic-underlay" : ""}`}>
        <ForgeAmbience />
        <header className="topbar">
          <button className="wordmark" onClick={() => go("Today")} aria-label="Forge home">
            <strong>FORGE</strong>
          </button>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {nav.map((item) => <button key={item.name} className={screen === item.name ? "active" : ""} onClick={() => go(item.name)}><ForgeIcon name={item.icon}/><span>{item.name}</span></button>)}
          </nav>
          <div className="top-actions">
            <button className="quick-command" onClick={() => setCommandOpen(true)} aria-label="Open quick actions"><ForgeIcon name="plus"/><span>QUICK</span></button>
            <button className="avatar" onClick={() => setProfileOpen(true)} aria-label="Open profile">{athleteInitial}</button>
          </div>
        </header>

        <main className="workspace">
          {screen === "Today" && <Today athleteName={athleteName} exercises={exercises} meals={meals} water={water} workoutStarted={workoutStarted} lastWorkout={workoutHistory[0]} onStart={startWorkout} onCoach={() => go("Coach")} onProgress={() => go("Progress")} />}
          {screen === "Train" && <Train exercises={exercises} setExercises={setExercises} started={workoutStarted} setStarted={setWorkoutStarted} startedAt={workoutStartedAt} setStartedAt={setWorkoutStartedAt} onFinish={finishWorkout} notify={setToast} />}
          {screen === "Fuel" && <Fuel meals={meals} setMeals={setMeals} water={water} setWater={setWater} notify={setToast} />}
          {screen === "Coach" && <Coach exercises={exercises} meals={meals} />}
          {screen === "Progress" && <Progress exercises={exercises} history={workoutHistory} workoutStarted={workoutStarted} onTrain={() => go("Train")} />}
        </main>

        <nav className="mobile-dock" aria-label="Mobile navigation">
          {nav.map((item) => <button key={item.name} className={screen === item.name ? "active" : ""} onClick={() => go(item.name)}><i><ForgeIcon name={item.icon}/></i><span>{item.name}</span></button>)}
        </nav>

        {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} go={go} startWorkout={startWorkout} addWater={() => { setWater((value) => Math.min(3200, value + 250)); setCommandOpen(false); setToast("250 ml water logged."); }} />}
        {profileOpen && <ProfileDrawer
          profile={profile}
          email={authenticatedUser?.email ?? ""}
          onSave={(next) => {
            setProfile(next);
            setProfileOpen(false);
            setToast("Profile saved to your account.");
          }}
          onClose={() => setProfileOpen(false)}
          onReplayLogin={() => {
            setProfileOpen(false);
            setLaunchMode("return");
          }}
          onReplayOnboarding={() => {
            setProfileOpen(false);
            setEntryStage("onboarding");
          }}
        />}
        {toast && <div className="toast" role="status" aria-live="polite"><i>✓</i>{toast}</div>}
        {accountSyncError && <div className="sync-warning" role="status">Account sync paused. Keep this page open and try your action again.</div>}
      </div>
      {finishSummary && <WorkoutComplete
        summary={finishSummary}
        onToday={() => {
          setFinishSummary(null);
          go("Today");
        }}
        onProgress={() => {
          setFinishSummary(null);
          go("Progress");
        }}
      />}
      {launchMode && <CinematicIntro mode={launchMode} athleteName={athleteName} onSkip={() => {
        setEntryStage("app");
        setLaunchMode(null);
      }} />}
    </>
  );
}

function Today({ athleteName, exercises, meals, water, workoutStarted, lastWorkout, onStart, onCoach, onProgress }: { athleteName: string; exercises: Exercise[]; meals: Meal[]; water: number; workoutStarted: boolean; lastWorkout?: WorkoutSummary; onStart: () => void; onCoach: () => void; onProgress: () => void }) {
  const allSets = exercises.flatMap((exercise) => exercise.sets);
  const doneSets = allSets.filter((set) => set.done).length;
  const calories = meals.reduce((total, meal) => total + meal.kcal, 0);
  const protein = meals.reduce((total, meal) => total + meal.protein, 0);
  const volume = allSets.filter((set) => set.done).reduce((total, set) => total + set.kg * set.reps, 0);
  const sessionComplete = Boolean(lastWorkout && !workoutStarted);
  const displayVolume = sessionComplete ? lastWorkout!.volume : volume;

  return (
    <div className="screen">
      <section className="day-heading">
        <div><p className="eyebrow">MONDAY · 27 JULY</p><h1>Good afternoon, {athleteName}.</h1><span>You&apos;re recovered and on track. One strong session closes the day.</span><div className="forge-motto"><b>FORGE THE NEXT REP</b><i/><span>Strength block 02 · Week 3</span></div></div>
      </section>

      <div className="today-layout">
        <section className="day-flow">
          <article className={`session-focus${sessionComplete ? " complete" : ""}`}>
            <div className="session-top">
              <div><p className="eyebrow hot">{sessionComplete ? "SESSION FORGED" : workoutStarted ? "SESSION IN PROGRESS" : "TODAY'S MAIN SESSION"}</p><h2>Upper strength</h2><span>{sessionComplete ? "Archived · Recover and refuel" : "Chest · Back · Shoulders"}</span></div>
              <span className="duration">{sessionComplete ? formatClock(lastWorkout!.durationSeconds) : doneSets ? `${doneSets}/${allSets.length} sets` : "75–90 min"}</span>
            </div>
            <div className="session-prescription">
              <div><small>WORKING SETS</small><strong>{allSets.length}</strong></div>
              <div><small>VOLUME LOGGED</small><strong>{displayVolume ? `${(displayVolume / 1000).toFixed(1)}t` : "0 kg"}</strong></div>
              <div><small>EFFORT</small><strong>{sessionComplete ? `RIR ${lastWorkout!.averageRir.toFixed(1)}` : "RIR 1–2"}</strong></div>
            </div>
            <div className="exercise-preview">
              {exercises.slice(0, 3).map((item, index) => <div key={item.id}><span>0{index + 1}</span><p><strong>{item.name}</strong><small>{item.sets.length} sets · {item.cue}</small></p><b>{item.sets.at(-1)?.kg} kg</b></div>)}
            </div>
            <button className="primary-action" onClick={sessionComplete ? onProgress : onStart}>{sessionComplete ? "Review performance" : workoutStarted ? "Resume session" : "Start session"} <span>→</span></button>
          </article>

          <section className="schedule">
            <header><div><p className="eyebrow">DAILY RHYTHM</p><h2>Today&apos;s flow</h2></div><span>3 of 5 complete</span></header>
            <div className="timeline">
              <Timeline time="06:30" title="Morning swim" detail="Easy aerobic · 35 min" state="done" />
              <Timeline time="08:10" title="Breakfast logged" detail="640 kcal · 46g protein" state="done" />
              <Timeline time="12:15" title="Lunch logged" detail="720 kcal · 58g protein" state="done" />
              <Timeline time="17:00" title="Upper strength" detail={sessionComplete ? `${lastWorkout!.completedSets} sets · ${lastWorkout!.volume.toLocaleString()} kg` : "Main session · Gym"} state={sessionComplete ? "done" : "current"} />
              <Timeline time="19:15" title="Recovery meal" detail={`${Math.max(0, 2380 - calories)} kcal remaining`} state="next" />
            </div>
          </section>
        </section>

        <aside className="context-rail">
          <section className="readiness-panel">
            <header><p className="eyebrow">READINESS</p><span>Live</span></header>
            <div className="readiness-score"><strong>92</strong><span>/100</span><i>Optimal</i></div>
            <Signal name="Sleep" value="7h 42m" strength={84} tone="blue" />
            <Signal name="Recovery" value="High" strength={92} tone="green" />
            <Signal name="Stress" value="Low" strength={28} tone="amber" />
            <p className="coach-note"><b>✦</b><span>Your pressing performance usually peaks after 7+ hours of sleep. Keep the planned load.</span></p>
          </section>
          <button className="coach-command compact" onClick={onCoach}>
            <span className="coach-mark">✦</span><p><strong>Ask Forge Coach</strong><small>Training, recovery, or fuel</small></p><i>→</i>
          </button>
          <section className="fuel-panel">
            <header><p className="eyebrow">FUEL STATUS</p><strong>{Math.round(calories / 2380 * 100)}%</strong></header>
            <div className="fuel-track"><i style={{ width: `${Math.min(100, calories / 2380 * 100)}%` }} /></div>
            <div className="fuel-values"><strong>{calories.toLocaleString()} kcal</strong><span>{Math.max(0, 2380 - calories)} left</span></div>
            <div className="macro-row">
              <span><i className="protein" />Protein <b>{protein}g</b></span>
              <span><i className="carbs" />Water <b>{(water / 1000).toFixed(2)}L</b></span>
              <span><i className="fat" />Meals <b>{meals.length}</b></span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Train({ exercises, setExercises, started, setStarted, startedAt, setStartedAt, onFinish, notify }: {
  exercises: Exercise[];
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  started: boolean;
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
  startedAt: number;
  setStartedAt: React.Dispatch<React.SetStateAction<number>>;
  onFinish: (summary: WorkoutSummary) => void;
  notify: (message: string) => void;
}) {
  const [view, setView] = useState<TrainView>("Session");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [expanded, setExpanded] = useState("incline");
  const [clock, setClock] = useState(0);
  const [restEndAt, setRestEndAt] = useStoredState("forge-rest-end-at", 0);
  const [sessionNote, setSessionNote] = useStoredState("forge-session-note", "");
  const [noteOpen, setNoteOpen] = useState(Boolean(sessionNote));
  const allSets = exercises.flatMap((exercise) => exercise.sets);
  const done = allSets.filter((set) => set.done);
  const progress = Math.round(done.length / allSets.length * 100);
  const volume = done.reduce((total, set) => total + set.kg * set.reps, 0);
  const visibleLibrary = exerciseLibrary.filter((move) => `${move.target} ${move.name} ${move.role}`.toLowerCase().includes(libraryQuery.trim().toLowerCase()));

  useEffect(() => {
    if (!started || startedAt) return;
    setStartedAt(Date.now());
  }, [setStartedAt, started, startedAt]);

  useEffect(() => {
    if (!started && !restEndAt) return;
    let id = 0;
    const tick = () => {
      const current = Date.now();
      setClock(current);
      if (!started && restEndAt <= current) window.clearInterval(id);
    };
    const initialTick = window.setTimeout(tick, 0);
    id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(id);
    };
  }, [restEndAt, started]);

  function ensureStarted() {
    if (started) return;
    setStarted(true);
    setStartedAt(Date.now());
    notify("Session started — the clock is live.");
  }

  function updateSet(exerciseId: string, setIndex: number, field: "kg" | "reps" | "rir", value: number) {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    setExercises((current) => current.map((exercise) => exercise.id !== exerciseId ? exercise : { ...exercise, sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, [field]: safeValue } : set) }));
  }

  function completeSet(exerciseId: string, setIndex: number) {
    const exercise = exercises.find((item) => item.id === exerciseId);
    const targetSet = exercise?.sets[setIndex];
    const markingComplete = Boolean(targetSet && !targetSet.done);
    if (markingComplete) ensureStarted();
    setExercises((current) => current.map((exercise) => exercise.id !== exerciseId ? exercise : { ...exercise, sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, done: !set.done } : set) }));
    if (!markingComplete || !exercise) return;
    setRestEndAt(Date.now() + 120000);
    const completedBefore = exercise.sets.filter((set) => set.done).length;
    if (completedBefore + 1 === exercise.sets.length) {
      const exerciseIndex = exercises.findIndex((item) => item.id === exerciseId);
      const nextExercise = exercises[exerciseIndex + 1];
      if (nextExercise) setExpanded(nextExercise.id);
    }
  }

  function beginSession() {
    if (started) {
      notify("Session is live. Keep earning the next set.");
      return;
    }
    ensureStarted();
  }

  function finishSession() {
    if (!done.length) return;
    const completed = exercises.flatMap((exercise) => exercise.sets.filter((set) => set.done).map((set) => ({ exercise, set })));
    const best = completed.reduce((current, item) => {
      if (!current) return item;
      const currentScore = current.set.kg * (1 + current.set.reps / 30);
      const nextScore = item.set.kg * (1 + item.set.reps / 30);
      return nextScore > currentScore ? item : current;
    }, completed[0]);
    const averageRir = completed.reduce((total, item) => total + (item.set.rir ?? 2), 0) / completed.length;
    const completedAt = clock || startedAt;
    const summary: WorkoutSummary = {
      id: completedAt,
      completedAt,
      title: "Upper strength",
      durationSeconds: Math.max(1, elapsedSeconds),
      completedSets: done.length,
      totalSets: allSets.length,
      exerciseCount: exercises.filter((exercise) => exercise.sets.some((set) => set.done)).length,
      volume,
      averageRir,
      bestSet: `${best.exercise.name} · ${best.set.kg} kg × ${best.set.reps}`,
      note: sessionNote.trim(),
    };
    setRestEndAt(0);
    setSessionNote("");
    onFinish(summary);
  }

  function selectLibraryMove(move: LibraryMove) {
    const existing = exercises.find((exercise) => exercise.name === move.name);
    if (existing) {
      setExpanded(existing.id);
      setView("Session");
      notify(`${move.name} opened in today's session.`);
      return;
    }
    const id = `${move.target}-${move.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setExercises((current) => [...current, {
      id,
      name: move.name,
      target: move.target.charAt(0) + move.target.slice(1).toLowerCase(),
      cue: move.cue,
      sets: Array.from({ length: 3 }, () => ({ kg: move.startKg, reps: move.reps, rir: 2, done: false })),
    }]);
    setExpanded(id);
    setView("Session");
    notify(`${move.name} added to today's session.`);
  }

  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((clock - startedAt) / 1000)) : 0;
  const restRemaining = Math.max(0, Math.ceil((restEndAt - clock) / 1000));
  const elapsed = formatClock(elapsedSeconds);

  return (
    <div className="screen">
      <ScreenHeading eyebrow="STRENGTH BLOCK 2 · WEEK 3" title="Training" copy="The plan, the session, and every rep—in one place." action={<span className="live-pill"><i /> {started ? `Live · ${elapsed}` : "Ready"}</span>} />
      <div className="section-tabs">{(["Session", "Week", "Library"] as TrainView[]).map((item) => <button className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>{item}</button>)}</div>

      {view === "Session" && <div className="training-layout">
        <section className="training-main">
          <div className="training-banner">
            <div><p className="eyebrow hot">{started ? "SESSION LIVE" : "UPPER STRENGTH"}</p><h2>Build power. Keep control.</h2><span>{started ? `${done.length} of ${allSets.length} sets forged · ${volume.toLocaleString()} kg logged` : "Last top set: 30 kg × 7 · Target RIR 1–2"}</span></div>
            <button className="primary-action" onClick={beginSession}>{started ? `Live · ${elapsed}` : "Begin session"} <span>→</span></button>
          </div>
          <div className="exercise-accordion">
            {exercises.map((exercise, exerciseIndex) => {
              const open = expanded === exercise.id;
              const completed = exercise.sets.filter((set) => set.done).length;
              return <article className={`exercise-block ${open ? "open" : ""}`} key={exercise.id}>
                <button className="exercise-summary" onClick={() => setExpanded(open ? "" : exercise.id)}>
                  <span className="exercise-number">0{exerciseIndex + 1}</span>
                  <p><small>{exercise.target}</small><strong>{exercise.name}</strong><span>{exercise.cue}</span></p>
                  <b>{completed}/{exercise.sets.length}</b><i>⌄</i>
                </button>
                {open && <div className="set-editor">
                  <div className="set-head"><span>SET</span><span>KG</span><span>REPS</span><span>RIR</span><span>STATUS</span></div>
                  {exercise.sets.map((set, setIndex) => <div className={`set-row ${set.done ? "done" : ""}`} key={setIndex}>
                    <span>{setIndex + 1}</span>
                    <SetInput label={`Weight for set ${setIndex + 1}`} unit="kg" value={set.kg} min={0} onChange={(value) => updateSet(exercise.id, setIndex, "kg", value)} />
                    <SetInput label={`Reps for set ${setIndex + 1}`} unit="reps" value={set.reps} min={1} onChange={(value) => updateSet(exercise.id, setIndex, "reps", value)} />
                    <label className="rir-input">
                      <select aria-label={`RIR for set ${setIndex + 1}`} value={set.rir ?? 2} onChange={(event) => updateSet(exercise.id, setIndex, "rir", Number(event.target.value))}>
                        {[0,1,2,3,4,5].map((value) => <option value={value} key={value}>{value}</option>)}
                      </select>
                      <span>RIR</span>
                    </label>
                    <button className="set-log-button" onClick={() => completeSet(exercise.id, setIndex)}>{set.done ? "✓ Logged" : "Log set"}</button>
                  </div>)}
                </div>}
              </article>;
            })}
          </div>
          {started && done.length === allSets.length && <div className="session-finish-bar">
            <p><span>PROTOCOL COMPLETE</span><strong>All {allSets.length} working sets logged</strong></p>
            <button className="finish-action" onClick={finishSession}>Finish & save <span>→</span></button>
          </div>}
        </section>
        <aside className="session-rail">
          <p className="eyebrow">SESSION STATUS</p>
          <div className="progress-orbit" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><span><strong>{progress}%</strong><small>complete</small></span></div>
          <dl><div><dt>Working sets</dt><dd>{done.length} / {allSets.length}</dd></div><div><dt>Volume</dt><dd>{volume.toLocaleString()} kg</dd></div><div><dt>Elapsed</dt><dd>{elapsed}</dd></div></dl>
          <div className={`rest-card${restRemaining ? " active" : ""}`}>
            <span>{restRemaining ? "RESTING" : "REST TIMER"}</span>
            <strong>{formatClock(restRemaining || 120)}</strong>
            <div className="rest-actions">
              {restRemaining
                ? <><button onClick={() => setRestEndAt(restEndAt + 30000)}>+30 sec</button><button onClick={() => setRestEndAt(0)}>Skip rest</button></>
                : <button onClick={() => setRestEndAt(Date.now() + 120000)}>Start 2:00</button>}
            </div>
          </div>
          <details className="session-note" open={noteOpen} onToggle={(event) => setNoteOpen(event.currentTarget.open)}>
            <summary>{sessionNote ? "Edit session note" : "+ Add session note"}</summary>
            <textarea aria-label="Session note" value={sessionNote} onChange={(event) => setSessionNote(event.target.value)} placeholder="Technique, pain, energy, next adjustment…" />
          </details>
          <p className="coach-note"><b>✦</b><span>Keep two clean reps in reserve until the final working set.</span></p>
          {started && done.length > 0 && done.length < allSets.length && <button className="end-session-link" onClick={finishSession}>End session with {done.length} logged sets</button>}
        </aside>
      </div>}

      {view === "Week" && <section className="week-board">
        <header><div><p className="eyebrow">27 JUL — 02 AUG</p><h2>Your training week</h2></div><button className="outline-action" onClick={() => setView("Session")}>Open today&apos;s session</button></header>
        <div className="week-plan">{weekPlan.map((day) => <article className={day.status} key={day.day}><div><span>{day.day}</span><strong>{day.date}</strong></div><p><small>{day.status === "rest" ? "RECOVERY" : "TRAINING"}</small><strong>{day.title}</strong><span>{day.focus}</span></p><b>{day.duration}</b></article>)}</div>
        <p className="program-note"><span>✦</span><b>Forge adjustment</b> Heavy leg work remains paused while your right knee returns to load. Saturday stays recovery-first.</p>
      </section>}

      {view === "Library" && <section className="library-view">
        <header><div><p className="eyebrow">EXERCISE LIBRARY</p><h2>Find it. Add it. Train.</h2></div><label className="library-search"><span>⌕</span><input aria-label="Search exercises" value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Search movement or muscle…" /></label></header>
        <div className="library-grid">{visibleLibrary.map((move) => {
          const inPlan = exercises.some((exercise) => exercise.name === move.name);
          return <article key={move.name}><span>{move.target}</span><h3>{move.name}</h3><p>{move.role}</p><b>{move.cue}</b><button aria-label={`${inPlan ? "Open" : "Add"} ${move.name}`} onClick={() => selectLibraryMove(move)}>{inPlan ? "OPEN" : "ADD"}</button></article>;
        })}</div>
        {!visibleLibrary.length && <div className="library-empty"><strong>No movement found.</strong><span>Try a muscle group such as chest, back, or shoulders.</span></div>}
      </section>}
    </div>
  );
}

function SetInput({ label, unit, value, min, onChange }: { label: string; unit: string; value: number; min: number; onChange: (value: number) => void }) {
  return (
    <label className="set-input">
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        min={min}
        step="1"
        value={value}
        onChange={(event) => onChange(Math.max(min, Number(event.target.value)))}
      />
      <span>{unit}</span>
    </label>
  );
}

function Fuel({ meals, setMeals, water, setWater, notify }: { meals: Meal[]; setMeals: React.Dispatch<React.SetStateAction<Meal[]>>; water: number; setWater: React.Dispatch<React.SetStateAction<number>>; notify: (message: string) => void }) {
  const [mealOpen, setMealOpen] = useState(false);
  const calories = meals.reduce((total, meal) => total + meal.kcal, 0);
  const protein = meals.reduce((total, meal) => total + meal.protein, 0);
  const calorieTarget = 2380;
  const proteinTarget = 190;
  const calorieProgress = Math.min(100, Math.round(calories / calorieTarget * 100));
  const waterProgress = Math.min(100, Math.round(water / 3200 * 100));
  const nextWaterCheckpoint = Math.min(3200, Math.ceil((water + 1) / 250) * 250);

  function addMeal(meal: Omit<Meal, "id">) {
    setMeals((current) => [...current, { ...meal, id: Date.now() }]);
    setMealOpen(false);
    notify(`${meal.name} added to today.`);
  }

  return (
    <div className="screen">
      <ScreenHeading eyebrow="PERFORMANCE NUTRITION" title="Fuel the work." copy="Energy, protein and hydration—at a glance." action={<button className="fuel-log-action" onClick={() => setMealOpen(true)}><ForgeIcon name="plus"/> Log meal</button>} />

      <section className="fuel-command">
        <div className="energy-orbit" style={{ "--energy": `${calorieProgress * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{calorieProgress}<small>%</small></strong><span>daily fuel</span></div>
        </div>
        <div className="energy-copy">
          <p className="eyebrow hot">TODAY</p>
          <div><strong>{calories.toLocaleString()}</strong><span>kcal</span></div>
          <p><b>{Math.max(0, calorieTarget - calories).toLocaleString()} left</b><span>/ {calorieTarget.toLocaleString()} target</span></p>
        </div>
        <div className="macro-ledger">
          {[
            { name: "Protein", current: protein, target: proteinTarget, unit: "g", tone: "red" },
            { name: "Energy", current: calories, target: calorieTarget, unit: " kcal", tone: "bronze" },
            { name: "Water", current: water, target: 3200, unit: " ml", tone: "cream" },
          ].map((macro) => <div key={macro.name} className={macro.tone}>
            <span>{macro.name}</span>
            <strong>{macro.current.toLocaleString()}<small>/{macro.target.toLocaleString()}{macro.unit}</small></strong>
            <i><b style={{ width: `${Math.min(100, macro.current / macro.target * 100)}%` }} /></i>
          </div>)}
        </div>
      </section>

      <div className="fuel-ledger">
        <section className="meal-ledger">
          <header><div><p className="eyebrow">MEALS</p><h2>Today&apos;s intake</h2></div><span>{meals.length} logged</span></header>
          <div className="meal-list">
            {meals.map((meal, index) => <article key={meal.id}>
              <span className="meal-index">{String(index + 1).padStart(2, "0")}</span>
              <time>{meal.time}</time>
              <p><strong>{meal.name}</strong><span>{meal.detail}</span></p>
              <dl><div><dt>Protein</dt><dd>{meal.protein}g</dd></div><div><dt>Energy</dt><dd>{meal.kcal} kcal</dd></div></dl>
              <button aria-label={`Remove ${meal.name}`} onClick={() => setMeals((current) => current.filter((item) => item.id !== meal.id))}>×</button>
            </article>)}
          </div>
        </section>

        <aside className="water-ledger">
          <header><p className="eyebrow">WATER</p><span>{waterProgress}%</span></header>
          <div className="water-score"><strong>{(water / 1000).toFixed(2)}</strong><span>/ 3.20 L</span></div>
          <div className="water-gauge"><i style={{ width: `${waterProgress}%` }} /></div>
          <div className="water-actions"><button aria-label="Remove 250 ml water" onClick={() => { setWater((value) => Math.max(0, value - 250)); notify("250 ml removed."); }}>−</button><button onClick={() => { setWater((value) => Math.min(3200, value + 250)); notify("250 ml water logged."); }}>Add 250 ml</button></div>
          <p>{water >= 3200 ? "Daily target" : "Next checkpoint"} <strong>{(nextWaterCheckpoint / 1000).toFixed(2)} L</strong></p>
        </aside>
      </div>
      {mealOpen && <MealDialog onClose={() => setMealOpen(false)} onAdd={addMeal} />}
    </div>
  );
}

function Coach({ exercises, meals }: { exercises: Exercise[]; meals: Meal[] }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "coach", text: "Readiness 92%. Giữ Upper Strength, RIR 1–2. Không cần tăng volume hôm nay." }]);
  const protein = meals.reduce((total, meal) => total + meal.protein, 0);
  const done = exercises.flatMap((exercise) => exercise.sets).filter((set) => set.done).length;
  const proteinLeft = Math.max(0, 190 - protein);
  const quick = [
    { label: "Protect my knee", prompt: "Điều chỉnh buổi tập cho đầu gối" },
    { label: "Plan dinner", prompt: "Tối nay tao nên ăn gì?" },
    { label: "Review my week", prompt: "Đánh giá tiến độ tuần này" },
  ];

  function send(text = input) {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    let answer = "Tao đã đối chiếu tải tập, phục hồi và dinh dưỡng hôm nay. Chưa cần tăng volume; hoàn thành đúng chất lượng các set chính trước.";
    if (lower.includes("gối")) answer = "Gối phải vẫn là guardrail chính: bỏ squat nặng, chỉ dùng ROM không đau và RPE 6–7. Hôm nay là Upper Strength nên cứ giữ lịch hiện tại.";
    if (lower.includes("ăn")) answer = `Mày còn khoảng ${proteinLeft}g protein. Bữa tối ưu tiên cơm, ức gà hoặc cá, rau và đủ nước; không cần làm phức tạp.`;
    if (lower.includes("tuần")) answer = "Điểm mạnh tuần này là tính đều đặn. Điểm cần khóa lại: đủ 7+ giờ ngủ và đừng đổi kỹ thuật lấy mức tạ. Giữ nhịp thêm một tuần trước khi tăng tải.";
    setMessages((current) => [...current, { role: "user", text }, { role: "coach", text: answer }]);
    setInput("");
  }

  return (
    <div className="screen coach-screen coach-v32">
      <ScreenHeading eyebrow="FORGE COACH" title="One clear next move." copy="Ask a question or use today’s recommendation." action={<span className="coach-live-pill"><i /> CONTEXT READY</span>} />

      <section className="coach-next-move">
        <div><p className="eyebrow hot">TODAY&apos;S CALL</p><h2>Keep Upper Strength on plan.</h2><span>Readiness supports the work. Hold RIR 1–2 and protect clean range of motion.</span></div>
        <button onClick={() => send("Giải thích vì sao hôm nay nên giữ buổi Upper Strength")}>Why this move? <b>→</b></button>
      </section>

      <div className="coach-workspace">
        <section className="coach-chat">
          <header className="coach-chat-head">
            <div className="forge-orb"><span>✦</span></div>
            <div><p>FORGE COACH</p><small><i /> Tactical channel open</small></div>
            <span className="coach-mode">SPARTAN / 01</span>
          </header>
          <div className="conversation-feed">
            {messages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={index}><small>{message.role === "coach" ? "FORGE" : "YOU"}</small><p>{message.text}</p></div>)}
          </div>
          <div className="coach-quick-prompts" aria-label="Suggested coach questions">
            {quick.map((item) => <button onClick={() => send(item.prompt)} key={item.label}>{item.label}</button>)}
          </div>
          <div className="coach-composer">
            <input aria-label="Ask Forge Coach" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder="Ask about training, recovery, or fuel…" />
            <button aria-label="Send message" onClick={() => send()}>↑</button>
          </div>
        </section>

        <aside className="coach-intel">
          <header><p>TODAY&apos;S SIGNALS</p><span>LIVE</span></header>
          <div className="signal-grid">
            <article><small>WORK DONE</small><strong>{done}<em> sets</em></strong></article>
            <article><small>PROTEIN LEFT</small><strong>{proteinLeft}<em> g</em></strong></article>
          </div>
          <div className="coach-guardrail">
            <span>!</span>
              <div><small>ACTIVE GUARDRAIL</small><strong>Protect right knee</strong><p>Pain-free ROM · no heavy squat</p></div>
          </div>
          <p className="coach-intel-note">Forge uses today&apos;s logged work and meals. Better inputs create better decisions.</p>
        </aside>
      </div>
    </div>
  );
}

function Progress({ exercises, history, workoutStarted, onTrain }: { exercises: Exercise[]; history: WorkoutSummary[]; workoutStarted: boolean; onTrain: () => void }) {
  const [range, setRange] = useState("12W");
  const [referenceTime] = useState(Date.now);
  const rangeDays = range === "4W" ? 28 : range === "6M" ? 183 : 84;
  const cutoff = referenceTime - rangeDays * 24 * 60 * 60 * 1000;
  const filteredHistory = history.filter((session) => session.completedAt >= cutoff);
  const chartSessions = filteredHistory.slice(0, 12).reverse();
  const currentVolume = exercises.flatMap((exercise) => exercise.sets).filter((set) => set.done).reduce((total, set) => total + set.kg * set.reps, 0);
  const latest = history[0]!;
  const totalVolume = filteredHistory.reduce((total, session) => total + session.volume, 0);
  const averageRir = filteredHistory.length ? filteredHistory.reduce((total, session) => total + session.averageRir, 0) / filteredHistory.length : 0;
  const maxVolume = Math.max(1, ...chartSessions.map((session) => session.volume));
  const trendCopy = filteredHistory.length < 3
    ? `Log ${3 - filteredHistory.length} more ${3 - filteredHistory.length === 1 ? "session" : "sessions"} before changing the plan.`
    : "Enough data is forming. Compare quality, RIR and volume before adding load.";

  if (!history.length) {
    return (
      <div className="screen">
        <ScreenHeading eyebrow="PERFORMANCE REVIEW" title="Progress starts with one session." copy="Forge only shows what you have actually logged." />
        <section className="progress-empty">
          <span>01</span>
          <div><p className="eyebrow hot">{workoutStarted ? "SESSION IN PROGRESS" : "NO COMPLETED SESSIONS YET"}</p><h2>{workoutStarted ? "Finish today’s work to create your baseline." : "Build the first real data point."}</h2><p>{workoutStarted && currentVolume ? `${currentVolume.toLocaleString()} kg logged so far. Save the session and Forge will turn it into a real trend.` : "Complete and save a workout. Volume, effort and best sets will appear here automatically."}</p></div>
          <button className="primary-action" onClick={onTrain}>{workoutStarted ? "Resume session" : "Open training"} <b>→</b></button>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeading eyebrow="PERFORMANCE REVIEW" title="Progress you can prove." copy="Only completed sessions. No placeholder metrics." action={<div className="range-switch">{["4W", "12W", "6M"].map((item) => <button className={range === item ? "active" : ""} onClick={() => setRange(item)} key={item}>{item}</button>)}</div>} />
      <section className="progress-overview">
        <div><p className="eyebrow">SESSIONS</p><strong>{filteredHistory.length}</strong><span>completed in {range}</span></div>
        <div><p className="eyebrow">TOTAL VOLUME</p><strong>{(totalVolume / 1000).toFixed(1)}<small> t</small></strong><span>from saved working sets</span></div>
        <div><p className="eyebrow">AVERAGE EFFORT</p><strong>{averageRir.toFixed(1)}<small> RIR</small></strong><span>across completed sessions</span></div>
      </section>
      <section className="latest-forge">
        <div><p className="eyebrow hot">LATEST SESSION</p><h2>{latest.title}</h2><span>{latest.bestSet}</span></div>
        <dl>
          <div><dt>Volume</dt><dd>{latest.volume.toLocaleString()} kg</dd></div>
          <div><dt>Duration</dt><dd>{formatClock(latest.durationSeconds)}</dd></div>
          <div><dt>Average RIR</dt><dd>{latest.averageRir.toFixed(1)}</dd></div>
        </dl>
      </section>
      <section className="performance-chart">
        <header><div><p className="eyebrow">SESSION VOLUME</p><h2>Real work, session by session.</h2></div><span>{range} · {chartSessions.length} logged</span></header>
        {chartSessions.length ? <div className="bars real-bars">{chartSessions.map((session, index) => <div key={session.id} title={`${session.volume.toLocaleString()} kg`}><i style={{ height: `${Math.max(12, session.volume / maxVolume * 100)}%` }} className={index === chartSessions.length - 1 ? "hot" : ""} /><small>{new Date(session.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</small></div>)}</div> : <p className="range-empty">No completed sessions in this range.</p>}
      </section>
      <div className="progress-lower">
        <section className="recent-sessions">
          <header><p className="eyebrow">RECENT SESSIONS</p><span>{history.length} total</span></header>
          {workoutStarted && <div><time>Today</time><strong>Upper strength</strong><span>{currentVolume ? `${currentVolume.toLocaleString()} kg` : "In progress"}</span><b>LIVE</b></div>}
          {history.slice(0, 4).map((session) => <div key={session.id}><time>{new Date(session.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</time><strong>{session.title}</strong><span>{session.volume.toLocaleString()} kg</span><b>{session.completedSets}/{session.totalSets}</b></div>)}
        </section>
        <section className="progress-insight">
          <p className="eyebrow">NEXT REVIEW</p>
          <span>✦</span>
          <h2>Earn the trend.</h2>
          <p>{trendCopy}</p>
          <small>Forge will not recommend progression from a single good day.</small>
        </section>
      </div>
    </div>
  );
}

function Timeline({ time, title, detail, state }: { time: string; title: string; detail: string; state: string }) {
  return <div className={`timeline-item ${state}`}><time>{time}</time><i>{state === "done" ? "✓" : ""}</i><p><strong>{title}</strong><span>{detail}</span></p>{state === "current" && <b>Up next</b>}</div>;
}

function Signal({ name, value, strength, tone }: { name: string; value: string; strength: number; tone: string }) {
  return <div className="signal"><p><span>{name}</span><strong>{value}</strong></p><i><b className={tone} style={{ width: `${Math.min(100, strength)}%` }} /></i></div>;
}

function ScreenHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <header className="screen-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><span>{copy}</span></div>{action}</header>;
}

function CommandPalette({ onClose, go, startWorkout, addWater }: { onClose: () => void; go: (screen: Screen) => void; startWorkout: () => void; addWater: () => void }) {
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="Quick actions">
      <header className="quick-actions-head"><div><p>QUICK ACTIONS</p><strong>What do you need right now?</strong></div><button onClick={onClose} aria-label="Close quick actions">×</button></header>
      <p>ONE TAP. BACK TO THE WORK.</p>
      <button onClick={startWorkout}><i>Ⅱ</i><span><strong>Start today&apos;s workout</strong><small>Upper strength · 13 working sets</small></span><b>→</b></button>
      <button onClick={addWater}><i>◒</i><span><strong>Log 250 ml water</strong><small>Add to today&apos;s hydration</small></span><b>+</b></button>
      <button onClick={() => go("Fuel")}><i>+</i><span><strong>Log a meal</strong><small>Calories, protein and meal details</small></span><b>→</b></button>
      <button onClick={() => go("Coach")}><i>✦</i><span><strong>Ask Forge Coach</strong><small>Training, recovery or nutrition</small></span><b>→</b></button>
    </section>
  </div>;
}

function MealDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (meal: Omit<Meal, "id">) => void }) {
  const presets = [
    { label: "Breakfast", name: "Eggs & milk", detail: "5 eggs · fresh milk", kcal: 640, protein: 46 },
    { label: "Main meal", name: "Chicken rice", detail: "Rice · chicken breast · greens", kcal: 720, protein: 58 },
    { label: "Snack", name: "Yogurt & banana", detail: "Yogurt · banana", kcal: 260, protein: 12 },
  ];
  const [draft, setDraft] = useState({ time: "19:15", name: "", detail: "", kcal: 0, protein: 0 });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAdd(draft);
  }
  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="meal-dialog" onSubmit={submit}>
      <header><div><p className="eyebrow hot">NUTRITION LOG</p><h2>Add a meal</h2></div><button type="button" onClick={onClose}>×</button></header>
      <div className="meal-presets"><span>QUICK FILL</span><div>{presets.map((preset) => <button type="button" onClick={() => setDraft((current) => ({ ...current, name: preset.name, detail: preset.detail, kcal: preset.kcal, protein: preset.protein }))} key={preset.label}>{preset.label}</button>)}</div></div>
      <label>Meal name<input name="name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Recovery dinner" required /></label>
      <label>Food details <small>optional</small><input name="detail" value={draft.detail} onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))} placeholder="Rice · chicken · greens" /></label>
      <div><label>Time<input name="time" type="time" value={draft.time} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} required /></label><label>Calories<input name="kcal" type="number" min="0" value={draft.kcal || ""} onChange={(event) => setDraft((current) => ({ ...current, kcal: Number(event.target.value) }))} required /></label><label>Protein (g)<input name="protein" type="number" min="0" value={draft.protein || ""} onChange={(event) => setDraft((current) => ({ ...current, protein: Number(event.target.value) }))} required /></label></div>
      <button className="primary-action" type="submit">Add to today <span>→</span></button>
    </form>
  </div>;
}

function ProfileDrawer({
  profile,
  email,
  onClose,
  onSave,
  onReplayLogin,
  onReplayOnboarding,
}: {
  profile: ForgeProfile;
  email: string;
  onClose: () => void;
  onSave: (profile: ForgeProfile) => void;
  onReplayLogin: () => void;
  onReplayOnboarding: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const displayName = draft.displayName.trim() || "Athlete";

  return <div className="drawer-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="profile-drawer">
      <header><div><span>{displayName.slice(0, 1).toUpperCase()}</span><p><strong>{displayName}</strong><small>{email || "Signed-in athlete"}</small></p></div><button onClick={onClose}>×</button></header>
      <section className="account-profile"><p className="eyebrow">ATHLETE PROFILE</p><label>DISPLAY NAME<input value={draft.displayName} maxLength={80} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="How Forge should address you" /></label><dl><div><dt>Account</dt><dd>Protected</dd></div><div><dt>Plan</dt><dd>Free</dd></div><div><dt>Data</dt><dd>Account synced</dd></div></dl></section>
      <section><p className="eyebrow">COACH GUARDRAILS</p><ul><li>Protect right knee during return to load.</li><li>Progress only with clean ROM and control.</li><li>Prioritize chest, back, calves and forearms.</li></ul></section>
      <section><p className="eyebrow">PREFERENCES</p><div className="preference"><span>Units</span><div>{(["Metric", "Imperial"] as const).map((item) => <button className={draft.units === item ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, units: item }))} key={item}>{item}</button>)}</div></div><div className="preference"><span>Session reminders</span><button className={`toggle ${draft.notifications ? "on" : ""}`} onClick={() => setDraft((current) => ({ ...current, notifications: !current.notifications }))}><i /></button></div></section>
      <section className="demo-tools">
        <p className="eyebrow">ACCOUNT</p>
        <button onClick={onReplayLogin}><span><b>REPLAY WELCOME</b><small>Replay the short cinematic</small></span><i>↗</i></button>
        <button onClick={onReplayOnboarding}><span><b>RECALIBRATE PLAN</b><small>Review the three setup choices</small></span><i>→</i></button>
        <a href="/signout-with-chatgpt?return_to=%2F"><span><b>SIGN OUT</b><small>Securely end this session</small></span><i>→</i></a>
      </section>
      <button className="outline-action drawer-save" disabled={!draft.displayName.trim()} onClick={() => onSave({ ...draft, displayName: draft.displayName.trim() })}>Save preferences</button>
    </aside>
  </div>;
}
