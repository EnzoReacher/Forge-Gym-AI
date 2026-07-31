"use client";

import { FormEvent, memo, useCallback, useEffect, useRef, useState } from "react";
import {
  applyPendingMutations,
  boundPendingMutationMap,
  drainPendingMutationQueue,
  readPendingMutations,
  withMutationTimeout,
  writePendingMutations,
} from "./record-mutation-queue.mjs";

type Screen = "Today" | "Train" | "Fuel" | "Coach" | "Progress";
type TrainView = "Session" | "Week" | "Library";
type EntryStage = "landing" | "login" | "onboarding" | "app";
type LaunchMode = "return" | "new";
export type ForgeAuthenticatedUser = { displayName: string; email: string };
type ForgeProfile = { displayName: string; units: "Metric" | "Imperial"; notifications: boolean };
type SetLog = { kg: number; reps: number; rir?: number; done: boolean };
type Exercise = { id: string; name: string; target: string; cue: string; sets: SetLog[] };
type Meal = { id: string; recordedAt: number; time: string; name: string; detail: string; kcal: number; protein: number; correctedAt?: string | null };
type WorkoutSetRecord = { id: string; exerciseId: string; exerciseName: string; position: number; kg: number; reps: number; rir: number };
type WorkoutSummary = {
  id: string;
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
  sets: WorkoutSetRecord[];
  correctedAt?: string | null;
};
type HydrationEntry = { id: string; recordedAt: number; amountMl: number; correctedAt?: string | null };
type RecordKind = "workout" | "meal" | "hydration";
type RecordValue = WorkoutSummary | Meal | HydrationEntry;
type PendingRecordMutation = {
  key: string;
  method: "POST" | "PATCH" | "DELETE";
  type: RecordKind;
  id: string;
  record?: RecordValue;
  createdAt: number;
};
type AccountIssue = "session" | "access" | "unavailable" | null;
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

function useModalA11y<T extends HTMLElement>(onClose: () => void) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () => Array.from(container?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => !element.hasAttribute("hidden"));

    focusable()[0]?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return containerRef;
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
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onSkip]);

  return (
    <div
      className={`cinematic-gate cinematic-${mode}`}
      style={{ "--cinematic-duration": mode === "return" ? "1.05s" : "2.15s" } as React.CSSProperties}
      aria-live="polite"
      aria-labelledby="cinematic-title"
      aria-describedby="cinematic-message"
      role="dialog"
      aria-modal="true"
    >
      <ForgeAmbience density={mode === "return" ? 16 : 24} />
      <div className="cinematic-vignette" aria-hidden="true" />
      <div className="cinematic-strike" aria-hidden="true" />
      <div className="cinematic-mark">
        <span>{mode === "return" ? `WELCOME BACK, ${athleteName.toUpperCase()}` : "YOUR PLAN IS READY"}</span>
        <h1 id="cinematic-title">FORGE</h1>
        <div className="cinematic-rule"><i /></div>
        <p id="cinematic-message">{mode === "return" ? "LET’S WORK." : "THE WORK IS YOURS."}</p>
      </div>
      <button className="cinematic-skip" onClick={onSkip} autoFocus>Skip intro</button>
    </div>
  );
}

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isSameLocalDay(timestamp: number, now = Date.now()) {
  const recordDate = new Date(timestamp);
  const currentDate = new Date(now);
  return recordDate.getFullYear() === currentDate.getFullYear()
    && recordDate.getMonth() === currentDate.getMonth()
    && recordDate.getDate() === currentDate.getDate();
}

function accountIssueForStatus(status: number): Exclude<AccountIssue, null> {
  if (status === 401) return "session";
  if (status === 403) return "access";
  return "unavailable";
}

function accountIssueFromError(error: unknown): Exclude<AccountIssue, null> {
  if (error instanceof Error && ["session", "access", "unavailable"].includes(error.message)) {
    return error.message as Exclude<AccountIssue, null>;
  }
  return "unavailable";
}

function dominantAccountIssue(issues: AccountIssue[]): AccountIssue {
  if (issues.includes("session")) return "session";
  if (issues.includes("access")) return "access";
  if (issues.includes("unavailable")) return "unavailable";
  return null;
}

function WorkoutComplete({ summary, onToday, onProgress }: { summary: WorkoutSummary; onToday: () => void; onProgress: () => void }) {
  const dialogRef = useModalA11y<HTMLDivElement>(onToday);

  return (
    <div ref={dialogRef} className="workout-complete" role="dialog" aria-modal="true" aria-labelledby="workout-complete-title">
      <ForgeAmbience density={28} />
      <div className="completion-strike" aria-hidden="true" />
      <section>
        <p className="eyebrow hot">SESSION FORGED</p>
        <span className="completion-mark">✦</span>
        <h2 id="workout-complete-title">The work is done.<br /><em>The standard remains.</em></h2>
        <p className="completion-copy">Upper Strength is saved to your account. Recover, refuel, and return when you are ready.</p>
        <div className="completion-stats">
          <div><small>VOLUME</small><strong>{summary.volume.toLocaleString()}<em> kg</em></strong></div>
          <div><small>WORKING SETS</small><strong>{summary.completedSets}<em> / {summary.totalSets}</em></strong></div>
          <div><small>DURATION</small><strong>{formatClock(summary.durationSeconds)}</strong></div>
          <div><small>REPS LEFT</small><strong>{summary.averageRir.toFixed(1)}</strong></div>
        </div>
        <div className="completion-best"><span>BEST SET</span><strong>{summary.bestSet}</strong></div>
        <div className="completion-actions">
          <button className="outline-action" onClick={onToday}>Back to today</button>
          <button className="finish-action" onClick={onProgress}>View progress <span>→</span></button>
        </div>
        <small className="completion-protocol">SAVED TO YOUR ACCOUNT</small>
      </section>
    </div>
  );
}

const initialExercises: Exercise[] = [
  { id: "incline", name: "Incline dumbbell press", target: "Upper chest", cue: "Choose a comfortable load · use a pain-free range", sets: [{ kg: 0, reps: 8, done: false }, { kg: 0, reps: 8, done: false }, { kg: 0, reps: 8, done: false }] },
  { id: "row", name: "Chest-supported row", target: "Back", cue: "Choose a comfortable load · keep the movement controlled", sets: [{ kg: 0, reps: 10, done: false }, { kg: 0, reps: 10, done: false }, { kg: 0, reps: 10, done: false }] },
  { id: "shoulder", name: "Seated dumbbell press", target: "Shoulders", cue: "Choose a comfortable load · stop with 2 clean reps left", sets: [{ kg: 0, reps: 8, done: false }, { kg: 0, reps: 8, done: false }, { kg: 0, reps: 8, done: false }] },
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
  { target: "CHEST", name: "Incline dumbbell press", role: "Primary · Strength", cue: "Choose a comfortable load", startKg: 0, reps: 8 },
  { target: "BACK", name: "Assisted pull-up", role: "Primary · Width", cue: "Use enough assistance for clean reps", startKg: 0, reps: 8 },
  { target: "BACK", name: "Chest-supported row", role: "Primary · Thickness", cue: "Pause with control", startKg: 0, reps: 10 },
  { target: "SHOULDERS", name: "Seated dumbbell press", role: "Primary · Strength", cue: "Stop with 2 clean reps left", startKg: 0, reps: 8 },
  { target: "ARMS", name: "Cable triceps extension", role: "Accessory · Triceps", cue: "Move with control", startKg: 0, reps: 10 },
  { target: "LEGS", name: "Hip abduction", role: "Accessory · Hips", cue: "Use a pain-free range", startKg: 0, reps: 12 },
];

function useStoredState<T>(key: string, fallback: T, accountBacked = false) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<AccountIssue>(null);
  const [syncError, setSyncError] = useState<AccountIssue>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const updateValue: typeof setValue = useCallback((next) => {
    setDirty(true);
    setValue(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (accountBacked) {
      fetch(`/api/state?key=${encodeURIComponent(key)}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(accountIssueForStatus(response.status));
          return response.json() as Promise<{ value: T | null }>;
        })
        .then((payload) => {
          if (!cancelled) {
            setLoadError(null);
            if (payload.value !== null) setValue(payload.value);
          }
        })
        .catch((error) => {
          if (!cancelled) setLoadError(accountIssueFromError(error));
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
    if (!ready || !dirty || (accountBacked && loadError)) return;

    if (accountBacked) {
      const id = window.setTimeout(() => {
        fetch(`/api/state?key=${encodeURIComponent(key)}`, {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        })
          .then((response) => {
            if (!response.ok) throw new Error(accountIssueForStatus(response.status));
            setDirty(false);
            setSyncError(null);
          })
          .catch((error) => setSyncError(accountIssueFromError(error)));
      }, 450);

      return () => window.clearTimeout(id);
    }

    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [accountBacked, dirty, key, loadError, ready, retryNonce, value]);

  return [value, updateValue, ready, loadError, syncError, () => setRetryNonce((current) => current + 1)] as const;
}

function useDurableRecords(accountBacked: boolean) {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [hydration, setHydration] = useState<HydrationEntry[]>([]);
  const [ready, setReady] = useState(!accountBacked);
  const [loadError, setLoadError] = useState<AccountIssue>(null);
  const [syncError, setSyncError] = useState<AccountIssue>(null);
  const pending = useRef(new Map<string, PendingRecordMutation>());
  const draining = useRef(false);

  const persistPending = useCallback(() => {
    if (typeof window === "undefined") return;
    writePendingMutations(window.sessionStorage, [...pending.current.values()]);
  }, []);

  const executeMutation = useCallback(async (mutation: PendingRecordMutation) => {
    await withMutationTimeout(async (signal: AbortSignal) => {
      const response = mutation.method === "DELETE"
        ? await fetch(`/api/records?type=${encodeURIComponent(mutation.type)}&id=${encodeURIComponent(mutation.id)}`, {
          method: "DELETE",
          credentials: "same-origin",
          signal,
        })
        : await fetch("/api/records", {
          method: mutation.method,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: mutation.type, record: mutation.record }),
          signal,
        });
      if (!response.ok) throw new Error(accountIssueForStatus(response.status));
    });
  }, []);

  const drainPending = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    let failed = false;
    try {
      const result = await drainPendingMutationQueue(
        pending.current,
        executeMutation,
        persistPending,
      );
      if (!result.ok) {
        failed = true;
        setSyncError(accountIssueFromError(result.error));
        return;
      }
      setSyncError(null);
    } finally {
      draining.current = false;
      if (!failed && pending.current.size) void drainPending();
    }
  }, [executeMutation, persistPending]);

  const runMutation = useCallback((mutation: PendingRecordMutation) => {
    if (!accountBacked) return;
    pending.current.set(mutation.key, mutation);
    boundPendingMutationMap(pending.current);
    persistPending();
    void drainPending();
  }, [accountBacked, drainPending, persistPending]);

  const retry = drainPending;

  useEffect(() => {
    if (!accountBacked) return;
    let cancelled = false;
    const restored = readPendingMutations(window.sessionStorage) as PendingRecordMutation[];
    pending.current = new Map(restored.map((mutation) => [mutation.key, mutation]));
    writePendingMutations(window.sessionStorage, restored);
    fetch("/api/records", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(accountIssueForStatus(response.status));
        return response.json() as Promise<{ workouts: WorkoutSummary[]; meals: Meal[]; hydration: HydrationEntry[] }>;
      })
      .then((records) => {
        if (cancelled) return;
        const reconciled = applyPendingMutations(records, restored) as {
          workouts: WorkoutSummary[];
          meals: Meal[];
          hydration: HydrationEntry[];
        };
        setWorkouts(reconciled.workouts);
        setMeals(reconciled.meals);
        setHydration(reconciled.hydration);
        setLoadError(null);
        if (restored.length) void retry();
      })
      .catch((error) => {
        if (!cancelled) setLoadError(accountIssueFromError(error));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [accountBacked, retry]);

  useEffect(() => {
    const online = () => void retry();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [retry]);

  const addWorkout = useCallback((record: WorkoutSummary) => {
    setWorkouts((current) => [record, ...current.filter((item) => item.id !== record.id)].slice(0, 100));
    runMutation({ key: `create:workout:${record.id}`, method: "POST", type: "workout", id: record.id, record, createdAt: Date.now() });
  }, [runMutation]);

  const addMeal = useCallback((record: Meal) => {
    setMeals((current) => [record, ...current.filter((item) => item.id !== record.id)].slice(0, 100));
    runMutation({ key: `create:meal:${record.id}`, method: "POST", type: "meal", id: record.id, record, createdAt: Date.now() });
  }, [runMutation]);

  const addHydration = useCallback((record: HydrationEntry) => {
    setHydration((current) => [record, ...current.filter((item) => item.id !== record.id)].slice(0, 200));
    runMutation({ key: `create:hydration:${record.id}`, method: "POST", type: "hydration", id: record.id, record, createdAt: Date.now() });
  }, [runMutation]);

  const removeRecord = useCallback((type: RecordKind, id: string) => {
    if (type === "workout") setWorkouts((current) => current.filter((item) => item.id !== id));
    if (type === "meal") setMeals((current) => current.filter((item) => item.id !== id));
    if (type === "hydration") setHydration((current) => current.filter((item) => item.id !== id));
    runMutation({ key: `delete:${type}:${id}`, method: "DELETE", type, id, createdAt: Date.now() });
  }, [runMutation]);

  const updateRecord = useCallback((type: RecordKind, record: WorkoutSummary | Meal | HydrationEntry) => {
    const corrected = { ...record, correctedAt: new Date().toISOString() };
    if (type === "workout") {
      setWorkouts((current) => current
        .map((item) => item.id === record.id ? corrected as WorkoutSummary : item)
        .sort((a, b) => b.completedAt - a.completedAt));
    }
    if (type === "meal") {
      setMeals((current) => current
        .map((item) => item.id === record.id ? corrected as Meal : item)
        .sort((a, b) => b.recordedAt - a.recordedAt));
    }
    if (type === "hydration") {
      setHydration((current) => current
        .map((item) => item.id === record.id ? corrected as HydrationEntry : item)
        .sort((a, b) => b.recordedAt - a.recordedAt));
    }
    runMutation({ key: `update:${type}:${record.id}`, method: "PATCH", type, id: record.id, record, createdAt: Date.now() });
  }, [runMutation]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTimestamp = todayStart.getTime();
  const todayMeals = meals.filter((meal) => meal.recordedAt >= todayTimestamp);
  const todayHydration = hydration.filter((entry) => entry.recordedAt >= todayTimestamp);

  return {
    workouts,
    meals: todayMeals,
    hydration: todayHydration,
    water: Math.max(0, todayHydration.reduce((total, entry) => total + entry.amountMl, 0)),
    ready,
    loadError,
    syncError,
    retry,
    addWorkout,
    addMeal,
    addHydration,
    updateRecord,
    removeRecord,
  };
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

        <footer className="entry-footer landing-footer"><span>FORGE / 2026</span><i /><p><a href="/privacy">Privacy</a><span>Built to support the work.</span></p></footer>
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
            <small className="secure-entry-note">FORGE receives your verified identity. It does not receive your password. <a href="/privacy">Read how your data is used.</a></small>
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
  const [exercises, setExercises, exercisesReady, exercisesLoadError, exercisesSyncError, retryExercises] = useStoredState("forge-exercises", initialExercises, accountBacked);
  const [workoutStarted, setWorkoutStarted, workoutReady, workoutLoadError, workoutSyncError, retryWorkout] = useStoredState("forge-workout-live", false, accountBacked);
  const [workoutStartedAt, setWorkoutStartedAt, startedAtReady, startedAtLoadError, startedAtSyncError, retryStartedAt] = useStoredState("forge-workout-started-at", 0, accountBacked);
  const [profile, setProfile, profileReady, profileLoadError, profileSyncError, retryProfile] = useStoredState<ForgeProfile>("forge-profile", defaultProfile, accountBacked);
  const records = useDurableRecords(accountBacked);
  const [commandOpen, setCommandOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [launchMode, setLaunchMode] = useState<LaunchMode | null>(initialLaunchMode);
  const [finishSummary, setFinishSummary] = useState<WorkoutSummary | null>(null);
  const { workouts: workoutHistory, meals, hydration, water } = records;
  const accountReady = !accountBacked || [exercisesReady, workoutReady, startedAtReady, profileReady, records.ready].every(Boolean);
  const accountLoadIssue = accountBacked
    ? dominantAccountIssue([exercisesLoadError, workoutLoadError, startedAtLoadError, profileLoadError, records.loadError])
    : null;
  const accountSyncIssue = accountBacked
    ? dominantAccountIssue([exercisesSyncError, workoutSyncError, startedAtSyncError, profileSyncError, records.syncError])
    : null;
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
    }, reducedMotion ? 320 : launchMode === "return" ? 1050 : 2150);
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
    records.addWorkout(summary);
    setWorkoutStarted(false);
    setWorkoutStartedAt(0);
    setFinishSummary(summary);
  }

  function adjustWater(amountMl: number) {
    const safeAmount = amountMl < 0 ? -Math.min(Math.abs(amountMl), water) : amountMl;
    if (!safeAmount) return;
    records.addHydration({
      id: crypto.randomUUID(),
      recordedAt: Date.now(),
      amountMl: safeAmount,
    });
    setToast(safeAmount > 0 ? `${safeAmount} ml water logged.` : `${Math.abs(safeAmount)} ml removed.`);
  }

  if (entryStage !== "app" && !launchMode) {
    return <EntryFlow
      onEnter={(mode) => {
        const returnTo = mode === "new" ? "/app?welcome=new" : "/app";
        window.location.assign(returnTo);
      }}
      initialStage={entryStage}
    />;
  }

  if (!accountReady) {
    return <div className="account-loading" role="status" aria-live="polite"><ForgeAmbience density={14} /><strong>FORGE</strong><span>Loading your account…</span></div>;
  }

  if (accountLoadIssue) {
    const message = accountLoadIssue === "session"
      ? "Your session has ended. Sign in again to continue."
      : accountLoadIssue === "access"
        ? "This account cannot access FORGE right now."
        : "FORGE could not load your account. Your saved data has not been changed.";
    return <div className="account-loading account-error" role="alert"><ForgeAmbience density={10} /><strong>FORGE</strong><span>{message}</span><button onClick={() => accountLoadIssue === "session" ? window.location.assign("/signout-with-chatgpt?return_to=%2F") : window.location.reload()}>{accountLoadIssue === "session" ? "Sign in again" : "Try again"}</button></div>;
  }

  return (
    <>
      <div className={`app-shell${launchMode ? " cinematic-underlay" : ""}`}>
        <ForgeAmbience density={screen === "Today" ? 24 : 16} />
        <header className="topbar">
          <button className="wordmark" onClick={() => go("Today")} aria-label="Forge home">
            <strong>FORGE</strong>
          </button>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {nav.map((item) => <button key={item.name} aria-current={screen === item.name ? "page" : undefined} className={screen === item.name ? "active" : ""} onClick={() => go(item.name)}><ForgeIcon name={item.icon}/><span>{item.name}</span></button>)}
          </nav>
          <div className="top-actions">
            <button className="quick-command" onClick={() => setCommandOpen(true)} aria-label="Open quick actions"><ForgeIcon name="plus"/><span>Quick</span></button>
            <button className="avatar" onClick={() => setProfileOpen(true)} aria-label="Open profile">{athleteInitial}</button>
          </div>
        </header>

        <main className="workspace">
          {screen === "Today" && <Today athleteName={athleteName} exercises={exercises} meals={meals} water={water} workoutStarted={workoutStarted} lastWorkout={workoutHistory[0]} onStart={startWorkout} onCoach={() => go("Coach")} onProgress={() => go("Progress")} />}
          {screen === "Train" && <Train exercises={exercises} setExercises={setExercises} started={workoutStarted} setStarted={setWorkoutStarted} startedAt={workoutStartedAt} setStartedAt={setWorkoutStartedAt} onFinish={finishWorkout} notify={setToast} />}
          {screen === "Fuel" && <Fuel
            meals={meals}
            hydration={hydration}
            water={water}
            onAddMeal={records.addMeal}
            onUpdateMeal={(meal) => records.updateRecord("meal", meal)}
            onRemoveMeal={(id) => records.removeRecord("meal", id)}
            onUpdateHydration={(entry) => records.updateRecord("hydration", entry)}
            onRemoveHydration={(id) => records.removeRecord("hydration", id)}
            onAdjustWater={adjustWater}
            notify={setToast}
          />}
          {screen === "Coach" && <Coach exercises={exercises} meals={meals} />}
          {screen === "Progress" && <Progress
            exercises={exercises}
            history={workoutHistory}
            workoutStarted={workoutStarted}
            onTrain={() => go("Train")}
            onUpdateWorkout={(workout) => records.updateRecord("workout", workout)}
            onDeleteWorkout={(id) => records.removeRecord("workout", id)}
          />}
        </main>

        <nav className="mobile-dock" aria-label="Mobile navigation">
          {nav.map((item) => <button key={item.name} aria-current={screen === item.name ? "page" : undefined} className={screen === item.name ? "active" : ""} onClick={() => go(item.name)}><i><ForgeIcon name={item.icon}/></i><span>{item.name}</span></button>)}
        </nav>

        {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} go={go} startWorkout={startWorkout} addWater={() => { adjustWater(250); setCommandOpen(false); }} />}
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
          onDeleteAccount={async (confirmation) => {
            const response = await fetch("/api/account", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirmation }),
            });
            if (!response.ok) {
              const payload = await response.json().catch(() => null) as { error?: string } | null;
              throw new Error(payload?.error || "FORGE could not delete this account.");
            }
            window.location.assign("/signout-with-chatgpt?return_to=%2F");
          }}
        />}
        {toast && <div className="toast" role="status" aria-live="polite"><i>✓</i>{toast}</div>}
        {accountSyncIssue && <div className="sync-warning" role={accountSyncIssue === "session" ? "alert" : "status"}><span>{
          accountSyncIssue === "session"
            ? "Your session ended. Sign in again before continuing."
            : accountSyncIssue === "access"
              ? "Account access is unavailable. New changes cannot sync."
              : "Account sync paused. Your action is still shown here."
        }</span><button onClick={() => {
          if (accountSyncIssue === "session" || accountSyncIssue === "access") {
            window.location.reload();
            return;
          }
          retryExercises();
          retryWorkout();
          retryStartedAt();
          retryProfile();
          void records.retry();
        }}>{accountSyncIssue === "session" ? "Sign in again" : accountSyncIssue === "access" ? "Reload account" : "Retry now"}</button></div>}
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
  const doneSets = allSets.filter((set) => set.done);
  const calories = meals.reduce((total, meal) => total + meal.kcal, 0);
  const protein = meals.reduce((total, meal) => total + meal.protein, 0);
  const volume = doneSets.reduce((total, set) => total + set.kg * set.reps, 0);
  const completedToday = Boolean(lastWorkout && isSameLocalDay(lastWorkout.completedAt));
  const sessionComplete = completedToday && !workoutStarted;
  const sessionAction = sessionComplete ? "Review session" : workoutStarted ? "Resume workout" : "Start workout";
  const nextMove = sessionComplete ? "Today’s workout is saved. Review it or focus on recovery." : workoutStarted ? "Continue from the next unfinished set." : "Your next planned workout is ready when you are.";

  return (
    <div className="screen today-screen">
      <header className="today-intro">
        <p className="eyebrow">Today</p>
        <h1>Welcome back, {athleteName}.</h1>
        <p>{nextMove}</p>
      </header>

      <div className="today-layout">
        <section className="day-flow">
          <article className={`session-focus${sessionComplete ? " complete" : ""}`}>
            <div className="session-top">
              <div>
                <p className="eyebrow hot">{sessionComplete ? "Completed" : workoutStarted ? "Workout in progress" : "Your next move"}</p>
                <h2>Upper strength</h2>
                <span>{sessionComplete ? "Saved to your account" : "Chest · Back · Shoulders"}</span>
              </div>
              <span className="duration">{sessionComplete ? formatClock(lastWorkout!.durationSeconds) : workoutStarted ? `${doneSets.length}/${allSets.length} sets` : "45–60 min"}</span>
            </div>

            <div className="exercise-preview">
              {exercises.slice(0, 3).map((item, index) => {
                const completed = item.sets.filter((set) => set.done).length;
                const plannedLoad = item.sets.at(-1)?.kg ?? 0;
                return <div key={item.id}><span>0{index + 1}</span><p><strong>{item.name}</strong><small>{completed}/{item.sets.length} sets logged</small></p><b>{plannedLoad > 0 ? `${plannedLoad} kg` : "Set load"}</b></div>;
              })}
            </div>

            <div className="session-evidence">
              <span><small>Sets logged</small><strong>{sessionComplete ? lastWorkout!.completedSets : doneSets.length}</strong></span>
              <span><small>Volume</small><strong>{sessionComplete ? lastWorkout!.volume.toLocaleString() : volume.toLocaleString()} kg</strong></span>
              <span><small>Meals</small><strong>{meals.length}</strong></span>
            </div>

            <button className="primary-action" onClick={sessionComplete ? onProgress : onStart}>{sessionAction} <span>→</span></button>
          </article>
        </section>

        <aside className="context-rail">
          <section className="today-records">
            <header><p className="eyebrow">Logged today</p><span>Account data</span></header>
            <dl>
              <div><dt>Working sets</dt><dd>{doneSets.length} / {allSets.length}</dd></div>
              <div><dt>Meals</dt><dd>{meals.length}</dd></div>
              <div><dt>Energy</dt><dd>{calories.toLocaleString()} kcal</dd></div>
              <div><dt>Protein</dt><dd>{protein} g</dd></div>
              <div><dt>Water</dt><dd>{(water / 1000).toFixed(2)} L</dd></div>
            </dl>
          </section>

          <button className="coach-command compact" onClick={onCoach}>
            <span className="coach-mark">✦</span>
            <p><strong>Review today</strong><small>Use only what you have logged</small></p>
            <i>→</i>
          </button>

          <section className="today-note">
            <p className="eyebrow">A useful reminder</p>
            <strong>Missing data is not failure.</strong>
            <span>Log what matters, skip what does not, and keep the next action clear.</span>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Train({
  exercises,
  setExercises,
  started,
  setStarted,
  startedAt,
  setStartedAt,
  onFinish,
  notify,
}: {
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
      id: crypto.randomUUID(),
      completedAt,
      title: "Upper strength",
      durationSeconds: Math.max(1, elapsedSeconds),
      completedSets: done.length,
      totalSets: allSets.length,
      exerciseCount: exercises.filter((exercise) => exercise.sets.some((set) => set.done)).length,
      volume,
      averageRir,
      bestSet: best.set.kg > 0
        ? `${best.exercise.name} · ${best.set.kg} kg × ${best.set.reps}`
        : `${best.exercise.name} · ${best.set.reps} reps`,
      note: sessionNote.trim(),
      sets: completed.map((item, position) => ({
        id: crypto.randomUUID(),
        exerciseId: item.exercise.id,
        exerciseName: item.exercise.name,
        position,
        kg: item.set.kg,
        reps: item.set.reps,
        rir: item.set.rir ?? 2,
      })),
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
      <ScreenHeading eyebrow="Training" title="Do the next set." copy="Your workout, set log and rest timer in one place." action={<span className="live-pill"><i /> {started ? `Live · ${elapsed}` : "Ready to start"}</span>} />
      <div className="section-tabs" role="tablist" aria-label="Training views">{(["Session", "Week", "Library"] as TrainView[]).map((item) => {
        const tabId = `train-tab-${item.toLowerCase()}`;
        const panelId = `train-panel-${item.toLowerCase()}`;
        return <button id={tabId} role="tab" aria-selected={view === item} aria-controls={panelId} className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>{item}</button>;
      })}</div>

      {view === "Session" && <div id="train-panel-session" className="training-layout" role="tabpanel" aria-labelledby="train-tab-session">
        <section className="training-main">
          <div className="training-banner">
            <div><p className="eyebrow hot">{started ? "Workout in progress" : "Starter workout"}</p><h2>Upper strength</h2><span>{started ? `${done.length} of ${allSets.length} sets logged · ${volume.toLocaleString()} kg` : `${allSets.length} working sets · choose a comfortable load before each movement`}</span></div>
            <button className="primary-action" onClick={beginSession}>{started ? `Live · ${elapsed}` : "Begin session"} <span>→</span></button>
          </div>
          <div className="exercise-accordion">
            {exercises.map((exercise, exerciseIndex) => {
              const open = expanded === exercise.id;
              const completed = exercise.sets.filter((set) => set.done).length;
              return <article className={`exercise-block ${open ? "open" : ""}`} key={exercise.id}>
                <button className="exercise-summary" aria-expanded={open} aria-controls={`exercise-${exercise.id}-sets`} onClick={() => setExpanded(open ? "" : exercise.id)}>
                  <span className="exercise-number">0{exerciseIndex + 1}</span>
                  <p><small>{exercise.target}</small><strong>{exercise.name}</strong><span>{exercise.cue}</span></p>
                  <b>{completed}/{exercise.sets.length}</b><i>⌄</i>
                </button>
                {open && <div className="set-editor" id={`exercise-${exercise.id}-sets`}>
                  <div className="set-head"><span>SET</span><span>KG</span><span>REPS</span><span>RIR</span><span>STATUS</span></div>
                  <p className="field-help" id={`exercise-${exercise.id}-rir-help`}>RIR means the clean reps you could still do. Stop if a movement hurts.</p>
                  {exercise.sets.map((set, setIndex) => <div className={`set-row ${set.done ? "done" : ""}`} key={setIndex}>
                    <span>{setIndex + 1}</span>
                    <SetInput label={`Weight for set ${setIndex + 1}`} unit="kg" value={set.kg} min={0} onChange={(value) => updateSet(exercise.id, setIndex, "kg", value)} />
                    <SetInput label={`Reps for set ${setIndex + 1}`} unit="reps" value={set.reps} min={1} onChange={(value) => updateSet(exercise.id, setIndex, "reps", value)} />
                    <label className="rir-input">
                      <select aria-label={`Reps in reserve for set ${setIndex + 1}`} aria-describedby={`exercise-${exercise.id}-rir-help`} value={set.rir ?? 2} onChange={(event) => updateSet(exercise.id, setIndex, "rir", Number(event.target.value))}>
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
            <p><span>Workout complete</span><strong>All {allSets.length} working sets logged</strong></p>
            <button className="finish-action" onClick={finishSession}>Finish & save <span>→</span></button>
          </div>}
        </section>
        <aside className="session-rail">
          <p className="eyebrow">Workout status</p>
          <div className="progress-orbit" role="progressbar" aria-label="Workout progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><span><strong>{progress}%</strong><small>complete</small></span></div>
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

      {view === "Week" && <section id="train-panel-week" className="week-board" role="tabpanel" aria-labelledby="train-tab-week">
        <header><div><p className="eyebrow">Planning preview</p><h2>Example training week</h2><span className="honesty-note">This schedule is illustrative until weekly planning is connected to your account.</span></div><button className="outline-action" onClick={() => setView("Session")}>Open today&apos;s workout</button></header>
        <div className="week-plan">{weekPlan.map((day) => <article className={day.status} key={day.day}><div><span>{day.day}</span><strong>{day.date}</strong></div><p><small>{day.status === "rest" ? "Recovery" : "Training"}</small><strong>{day.title}</strong><span>{day.focus}</span></p><b>{day.duration}</b></article>)}</div>
        <p className="program-note"><span>i</span><b>Safety note</b> Pain, swelling or loss of normal movement should change the plan. FORGE does not replace medical care.</p>
      </section>}

      {view === "Library" && <section id="train-panel-library" className="library-view" role="tabpanel" aria-labelledby="train-tab-library">
        <header><div><p className="eyebrow">Exercise library</p><h2>Find a movement.</h2></div><label className="library-search"><span>⌕</span><input aria-label="Search exercises" value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Search movement or muscle…" /></label></header>
        <div className="library-grid">{visibleLibrary.map((move) => {
          const inPlan = exercises.some((exercise) => exercise.name === move.name);
          return <article key={move.name}><span>{move.target}</span><h3>{move.name}</h3><p>{move.role}</p><b>{move.cue}</b><button aria-label={`${inPlan ? "Open" : "Add"} ${move.name}`} onClick={() => selectLibraryMove(move)}>{inPlan ? "Open" : "Add"}</button></article>;
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

function Fuel({
  meals,
  hydration,
  water,
  onAddMeal,
  onUpdateMeal,
  onRemoveMeal,
  onUpdateHydration,
  onRemoveHydration,
  onAdjustWater,
  notify,
}: {
  meals: Meal[];
  hydration: HydrationEntry[];
  water: number;
  onAddMeal: (meal: Meal) => void;
  onUpdateMeal: (meal: Meal) => void;
  onRemoveMeal: (id: string) => void;
  onUpdateHydration: (entry: HydrationEntry) => void;
  onRemoveHydration: (id: string) => void;
  onAdjustWater: (amountMl: number) => void;
  notify: (message: string) => void;
}) {
  const [mealOpen, setMealOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [editingHydration, setEditingHydration] = useState<HydrationEntry | null>(null);
  const calories = meals.reduce((total, meal) => total + meal.kcal, 0);
  const protein = meals.reduce((total, meal) => total + meal.protein, 0);
  const calorieTarget = 2380;
  const proteinTarget = 190;
  const calorieProgress = Math.min(100, Math.round(calories / calorieTarget * 100));
  const waterProgress = Math.min(100, Math.round(water / 3200 * 100));
  const nextWaterCheckpoint = Math.min(3200, Math.ceil((water + 1) / 250) * 250);

  function addMeal(meal: Omit<Meal, "id" | "recordedAt">) {
    onAddMeal({ ...meal, id: crypto.randomUUID(), recordedAt: Date.now() });
    setMealOpen(false);
    notify(`${meal.name} added to today.`);
  }

  function saveMeal(meal: Meal) {
    onUpdateMeal(meal);
    setEditingMeal(null);
    notify(`${meal.name} corrected.`);
  }

  return (
    <div className="screen">
      <ScreenHeading eyebrow="Nutrition" title="Fuel" copy="Log what you eat and drink without turning it into another job." action={<button className="fuel-log-action" onClick={() => setMealOpen(true)}><ForgeIcon name="plus"/> Log meal</button>} />

      <section className="fuel-command">
        <div className="energy-copy">
          <p className="eyebrow hot">Logged today</p>
          <div><strong>{calories.toLocaleString()}</strong><span>kcal</span></div>
          <p><b>{Math.max(0, calorieTarget - calories).toLocaleString()} remaining</b><span>against the current default target</span></p>
          <i className="fuel-progress" role="progressbar" aria-label="Energy logged" aria-valuemin={0} aria-valuemax={100} aria-valuenow={calorieProgress}><b style={{ width: `${calorieProgress}%` }} /></i>
        </div>
        <div className="macro-ledger">
          {[
            { name: "Protein", current: protein, target: proteinTarget, unit: "g", tone: "red" },
            { name: "Energy", current: calories, target: calorieTarget, unit: " kcal", tone: "bronze" },
            { name: "Water", current: water, target: 3200, unit: " ml", tone: "cream" },
          ].map((macro) => <div key={macro.name} className={macro.tone}>
            <span>{macro.name}</span>
            <strong>{macro.current.toLocaleString()}<small>/{macro.target.toLocaleString()}{macro.unit}</small></strong>
            <i role="progressbar" aria-label={`${macro.name} logged`} aria-valuemin={0} aria-valuemax={macro.target} aria-valuenow={Math.min(macro.current, macro.target)}><b style={{ width: `${Math.min(100, macro.current / macro.target * 100)}%` }} /></i>
          </div>)}
        </div>
        <p className="target-note">These are current default targets, not a medical prescription. Personal target settings come later.</p>
      </section>

      <div className="fuel-ledger">
        <section className="meal-ledger">
          <header><div><p className="eyebrow">Meals</p><h2>Today&apos;s intake</h2></div><span>{meals.length} logged</span></header>
          <div className="meal-list">
            {meals.map((meal, index) => <article key={meal.id}>
              <span className="meal-index">{String(index + 1).padStart(2, "0")}</span>
              <time>{meal.time}</time>
              <p><strong>{meal.name}</strong><span>{meal.detail}</span></p>
              <dl><div><dt>Protein</dt><dd>{meal.protein}g</dd></div><div><dt>Energy</dt><dd>{meal.kcal} kcal</dd></div></dl>
              <div className="record-actions">
                <button aria-label={`Edit ${meal.name}`} onClick={() => setEditingMeal(meal)}>Edit</button>
                <button aria-label={`Remove ${meal.name}`} onClick={() => {
                  if (window.confirm(`Remove ${meal.name} from your account?`)) onRemoveMeal(meal.id);
                }}>Remove</button>
              </div>
            </article>)}
            {!meals.length && <div className="meal-empty"><strong>No meals logged yet.</strong><span>Add the next meal you actually eat.</span></div>}
          </div>
        </section>

        <aside className="water-ledger">
          <header><p className="eyebrow">Water</p><span>{waterProgress}%</span></header>
          <div className="water-score"><strong>{(water / 1000).toFixed(2)}</strong><span>/ 3.20 L</span></div>
          <div className="water-gauge" role="progressbar" aria-label="Water logged" aria-valuemin={0} aria-valuemax={3200} aria-valuenow={water}><i style={{ width: `${waterProgress}%` }} /></div>
          <div className="water-actions"><button aria-label="Remove 250 ml water" onClick={() => onAdjustWater(-250)}>−</button><button aria-label="Add 250 ml water" onClick={() => onAdjustWater(250)}>Add 250 ml</button></div>
          <p>{water >= 3200 ? "Daily target" : "Next checkpoint"} <strong>{(nextWaterCheckpoint / 1000).toFixed(2)} L</strong></p>
          {!!hydration.length && <div className="water-history">
            <span>Today&apos;s entries</span>
            {hydration.slice(0, 4).map((entry) => <div key={entry.id}>
              <time>{new Date(entry.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              <strong>{entry.amountMl > 0 ? "+" : "−"}{Math.abs(entry.amountMl)} ml</strong>
              <button onClick={() => setEditingHydration(entry)} aria-label={`Edit ${Math.abs(entry.amountMl)} ml water entry`}>Edit</button>
            </div>)}
          </div>}
        </aside>
      </div>
      {mealOpen && <MealDialog onClose={() => setMealOpen(false)} onAdd={addMeal} />}
      {editingMeal && <MealCorrectionDialog meal={editingMeal} onClose={() => setEditingMeal(null)} onSave={saveMeal} />}
      {editingHydration && <HydrationCorrectionDialog
        entry={editingHydration}
        onClose={() => setEditingHydration(null)}
        onSave={(entry) => {
          onUpdateHydration(entry);
          setEditingHydration(null);
          notify("Water entry corrected.");
        }}
        onRemove={() => {
          if (window.confirm("Remove this water entry from your account?")) {
            onRemoveHydration(editingHydration.id);
            setEditingHydration(null);
            notify("Water entry removed.");
          }
        }}
      />}
    </div>
  );
}
function Coach({ exercises, meals }: { exercises: Exercise[]; meals: Meal[] }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "coach", text: "I can review the sets and meals you log here. This preview uses simple rules, not a live AI coaching service." }]);
  const protein = meals.reduce((total, meal) => total + meal.protein, 0);
  const done = exercises.flatMap((exercise) => exercise.sets).filter((set) => set.done).length;
  const totalSets = exercises.flatMap((exercise) => exercise.sets).length;
  const proteinLeft = Math.max(0, 190 - protein);
  const quick = [
    { label: "Review today", prompt: "Review what I logged today" },
    { label: "Plan a simple dinner", prompt: "What is a simple dinner option?" },
    { label: "Adjust for pain", prompt: "How should I adjust if a movement hurts?" },
  ];

  function send(text = input) {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    let answer = `You have logged ${done} of ${totalSets} working sets and ${protein} g of protein today. Finish the next planned set with clean technique before adding more work.`;
    if (lower.includes("dinner") || lower.includes("ăn")) answer = `The current default target leaves about ${proteinLeft} g of protein. Keep dinner simple: a protein source, rice or another carbohydrate, vegetables and water. Adjust portions to your needs.`;
    if (lower.includes("pain") || lower.includes("hurt") || lower.includes("đau")) answer = "Stop the painful movement. Reduce load or range only if the movement becomes pain-free. New swelling, weakness or persistent pain needs qualified medical advice.";
    setMessages((current) => [...current, { role: "user", text }, { role: "coach", text: answer }]);
    setInput("");
  }

  const nextMove = done ? `Continue with set ${Math.min(done + 1, totalSets)} of ${totalSets}.` : "Start with the first planned movement.";

  return (
    <div className="screen coach-screen">
      <ScreenHeading eyebrow="Coach" title="A second opinion, not another dashboard." copy="Ask about what you have logged today." action={<span className="coach-preview-pill">Guidance preview</span>} />

      <section className="coach-next-move">
        <div><p className="eyebrow hot">Next useful move</p><h2>{nextMove}</h2><span>Keep the decision small. Technique and pain-free movement come before extra load.</span></div>
        <button onClick={() => send("Review what I logged today")}>Explain this <b>→</b></button>
      </section>

      <div className="coach-workspace">
        <section className="coach-chat">
          <header className="coach-chat-head">
            <div className="forge-orb"><span>F</span></div>
            <div><p>FORGE Coach</p><small>Rule-based prototype</small></div>
          </header>
          <div className="conversation-feed" role="log" aria-live="polite" aria-label="Coach conversation">
            {messages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={index}><small>{message.role === "coach" ? "FORGE" : "You"}</small><p>{message.text}</p></div>)}
          </div>
          <div className="coach-quick-prompts" aria-label="Suggested coach questions">
            {quick.map((item) => <button onClick={() => send(item.prompt)} key={item.label}>{item.label}</button>)}
          </div>
          <div className="coach-composer">
            <input aria-label="Ask Forge Coach" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder="Ask about today’s training or food…" />
            <button aria-label="Send message" onClick={() => send()}>↑</button>
          </div>
        </section>

        <aside className="coach-intel">
          <header><p>What this preview can see</p><span>Today</span></header>
          <dl className="coach-facts">
            <div><dt>Sets logged</dt><dd>{done} / {totalSets}</dd></div>
            <div><dt>Meals logged</dt><dd>{meals.length}</dd></div>
            <div><dt>Protein logged</dt><dd>{protein} g</dd></div>
          </dl>
          <div className="coach-guardrail">
            <span>!</span>
            <div><small>Safety boundary</small><strong>Pain changes the plan</strong><p>FORGE cannot diagnose injury or replace medical care.</p></div>
          </div>
          <p className="coach-intel-note">This prototype does not call a production AI model. Its answers are intentionally limited and based only on the records shown here.</p>
        </aside>
      </div>
    </div>
  );
}

function Progress({
  exercises,
  history,
  workoutStarted,
  onTrain,
  onUpdateWorkout,
  onDeleteWorkout,
}: {
  exercises: Exercise[];
  history: WorkoutSummary[];
  workoutStarted: boolean;
  onTrain: () => void;
  onUpdateWorkout: (workout: WorkoutSummary) => void;
  onDeleteWorkout: (id: string) => void;
}) {
  const [range, setRange] = useState("12W");
  const [referenceTime] = useState(Date.now);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutSummary | null>(null);
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
    : "Enough data is forming. Compare technique, clean reps left and volume before adding load.";

  if (!history.length) {
    return (
      <div className="screen">
        <ScreenHeading eyebrow="Progress" title="Progress starts with one saved workout." copy="Only completed account records appear here." />
        <section className="progress-empty">
          <span>01</span>
          <div><p className="eyebrow hot">{workoutStarted ? "Workout in progress" : "No completed workouts yet"}</p><h2>{workoutStarted ? "Finish today’s workout to create your baseline." : "Create the first real data point."}</h2><p>{workoutStarted && currentVolume ? `${currentVolume.toLocaleString()} kg logged so far. Save the workout to add it to your history.` : "Complete and save a workout. Volume, effort and best sets will appear here automatically."}</p></div>
          <button className="primary-action" onClick={onTrain}>{workoutStarted ? "Resume session" : "Open training"} <b>→</b></button>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeading eyebrow="Progress" title="What the work changed." copy="Completed workouts only—no placeholder metrics." action={<div className="range-switch" role="group" aria-label="Progress time range">{["4W", "12W", "6M"].map((item) => <button aria-pressed={range === item} className={range === item ? "active" : ""} onClick={() => setRange(item)} key={item}>{item}</button>)}</div>} />
      <section className="progress-overview">
        <div><p className="eyebrow">SESSIONS</p><strong>{filteredHistory.length}</strong><span>completed in {range}</span></div>
        <div><p className="eyebrow">TOTAL VOLUME</p><strong>{(totalVolume / 1000).toFixed(1)}<small> t</small></strong><span>from saved working sets</span></div>
        <div><p className="eyebrow">AVERAGE EFFORT</p><strong>{averageRir.toFixed(1)}<small> reps left</small></strong><span>clean reps left across saved workouts</span></div>
      </section>
      <section className="latest-forge">
        <div><p className="eyebrow hot">Latest workout</p><h2>{latest.title}</h2><span>{latest.bestSet}</span></div>
        <dl>
          <div><dt>Volume</dt><dd>{latest.volume.toLocaleString()} kg</dd></div>
          <div><dt>Duration</dt><dd>{formatClock(latest.durationSeconds)}</dd></div>
          <div><dt>Average reps left</dt><dd>{latest.averageRir.toFixed(1)}</dd></div>
        </dl>
      </section>
      <section className="performance-chart">
        <header><div><p className="eyebrow">Workout volume</p><h2>Saved work, workout by workout.</h2></div><span>{range} · {chartSessions.length} logged</span></header>
        {chartSessions.length ? <div className="bars real-bars">{chartSessions.map((session, index) => <div key={session.id} title={`${session.volume.toLocaleString()} kg`}><i style={{ height: `${Math.max(12, session.volume / maxVolume * 100)}%` }} className={index === chartSessions.length - 1 ? "hot" : ""} /><small>{new Date(session.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</small></div>)}</div> : <p className="range-empty">No completed sessions in this range.</p>}
      </section>
      <div className="progress-lower">
        <section className="recent-sessions">
          <header><p className="eyebrow">Recent workouts</p><span>{history.length} total</span></header>
          {workoutStarted && <div><time>Today</time><strong>Upper strength</strong><span>{currentVolume ? `${currentVolume.toLocaleString()} kg` : "In progress"}</span><b>LIVE</b></div>}
          {history.slice(0, 4).map((session) => <div key={session.id}><time>{new Date(session.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</time><strong>{session.title}</strong><span>{session.volume.toLocaleString()} kg</span><b>{session.completedSets}/{session.totalSets}</b><div className="record-actions"><button aria-label={`Edit ${session.title} workout`} onClick={() => setEditingWorkout(session)}>Edit</button><button aria-label={`Remove ${session.title} workout`} onClick={() => {
            if (window.confirm("Remove this completed workout from your account?")) onDeleteWorkout(session.id);
          }}>Remove</button></div></div>)}
        </section>
        <section className="progress-insight">
          <p className="eyebrow">Next review</p>
          <span>✦</span>
          <h2>Earn the trend.</h2>
          <p>{trendCopy}</p>
          <small>FORGE will not recommend progression from a single good day.</small>
        </section>
      </div>
      {editingWorkout && <WorkoutCorrectionDialog
        workout={editingWorkout}
        onClose={() => setEditingWorkout(null)}
        onSave={(workout) => {
          onUpdateWorkout(workout);
          setEditingWorkout(null);
        }}
      />}
    </div>
  );
}

function WorkoutCorrectionDialog({ workout, onClose, onSave }: { workout: WorkoutSummary; onClose: () => void; onSave: (workout: WorkoutSummary) => void }) {
  const dialogRef = useModalA11y<HTMLFormElement>(onClose);
  const [title, setTitle] = useState(workout.title);
  const [completedAt, setCompletedAt] = useState(localDateTimeValue(workout.completedAt));
  const [durationMinutes, setDurationMinutes] = useState(Math.max(1, Math.round(workout.durationSeconds / 60)));
  const [totalSets, setTotalSets] = useState(workout.totalSets);
  const [note, setNote] = useState(workout.note);
  const [sets, setSets] = useState(workout.sets);

  function changeSet(index: number, key: "kg" | "reps" | "rir", value: number) {
    setSets((current) => current.map((set, setIndex) => setIndex === index ? { ...set, [key]: value } : set));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date(completedAt).getTime();
    if (!Number.isFinite(timestamp) || !sets.length) return;
    const normalizedSets = sets.map((set, index) => ({ ...set, position: index }));
    const volume = normalizedSets.reduce((total, set) => total + set.kg * set.reps, 0);
    const averageRir = normalizedSets.reduce((total, set) => total + set.rir, 0) / normalizedSets.length;
    const best = [...normalizedSets].sort((a, b) => b.kg * b.reps - a.kg * a.reps)[0];
    onSave({
      ...workout,
      title: title.trim(),
      completedAt: timestamp,
      durationSeconds: Math.round(durationMinutes * 60),
      completedSets: normalizedSets.length,
      totalSets: Math.max(normalizedSets.length, Math.round(totalSets)),
      exerciseCount: new Set(normalizedSets.map((set) => set.exerciseId)).size,
      volume: Math.round(volume),
      averageRir,
      bestSet: `${best.exerciseName} · ${best.kg} kg × ${best.reps}`,
      note: note.trim(),
      sets: normalizedSets,
    });
  }

  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form ref={dialogRef} className="workout-correction" role="dialog" aria-modal="true" aria-labelledby="workout-correction-title" onSubmit={submit}>
      <header><div><p className="eyebrow hot">Correct record</p><h2 id="workout-correction-title">Edit completed workout</h2></div><button type="button" onClick={onClose} aria-label="Close workout correction">×</button></header>
      <p className="correction-note">The workout keeps its original identity. Volume, effort and best set are recalculated from the corrected sets.</p>
      <div className="workout-correction-meta">
        <label>Workout name<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label>Date and time<input type="datetime-local" value={completedAt} onChange={(event) => setCompletedAt(event.target.value)} required /></label>
        <label>Duration (min)<input type="number" min="1" max="2880" value={durationMinutes} onChange={(event) => setDurationMinutes(Math.max(1, Number(event.target.value)))} required /></label>
        <label>Planned sets<input type="number" min={sets.length || 1} max="1000" value={Math.max(totalSets, sets.length)} onChange={(event) => setTotalSets(Math.max(sets.length, Number(event.target.value)))} required /></label>
      </div>
      <div className="workout-correction-sets">
        <header><span>Completed sets</span><button type="button" onClick={() => {
          const source = sets[sets.length - 1] ?? workout.sets[0];
          if (!source || sets.length >= 100) return;
          setSets((current) => [...current, { ...source, id: crypto.randomUUID(), position: current.length }]);
        }}>Add set</button></header>
        {sets.map((set, index) => <div key={set.id}>
          <span><small>{String(index + 1).padStart(2, "0")}</small><strong>{set.exerciseName}</strong></span>
          <label>kg<input type="number" min="0" max="1000" step="0.5" value={set.kg} onChange={(event) => changeSet(index, "kg", Math.max(0, Number(event.target.value)))} /></label>
          <label>reps<input type="number" min="1" max="1000" value={set.reps} onChange={(event) => changeSet(index, "reps", Math.max(1, Number(event.target.value)))} /></label>
          <label>reps left<input type="number" min="0" max="10" step="0.5" value={set.rir} onChange={(event) => changeSet(index, "rir", Math.max(0, Math.min(10, Number(event.target.value))))} /></label>
          <button type="button" aria-label={`Remove set ${index + 1}`} disabled={sets.length === 1} onClick={() => setSets((current) => current.filter((_, setIndex) => setIndex !== index))}>Remove</button>
        </div>)}
      </div>
      <label className="workout-note">Workout note <small>optional</small><textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="correction-actions"><button type="button" className="outline-action" onClick={onClose}>Cancel</button><button className="primary-action" type="submit">Save correction <span>→</span></button></div>
    </form>
  </div>;
}

function ScreenHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <header className="screen-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><span>{copy}</span></div>{action}</header>;
}

function CommandPalette({ onClose, go, startWorkout, addWater }: { onClose: () => void; go: (screen: Screen) => void; startWorkout: () => void; addWater: () => void }) {
  const dialogRef = useModalA11y<HTMLElement>(onClose);

  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="command-palette" role="dialog" aria-modal="true" aria-labelledby="quick-actions-title">
      <header className="quick-actions-head"><div><p>Quick actions</p><strong id="quick-actions-title">What do you need right now?</strong></div><button onClick={onClose} aria-label="Close quick actions">×</button></header>
      <p>Choose one action.</p>
      <button onClick={startWorkout}><i>Ⅱ</i><span><strong>Start today&apos;s workout</strong><small>Starter plan · adjust every set to you</small></span><b>→</b></button>
      <button onClick={addWater}><i>◒</i><span><strong>Log 250 ml water</strong><small>Add to today&apos;s hydration</small></span><b>+</b></button>
      <button onClick={() => go("Fuel")}><i>+</i><span><strong>Log a meal</strong><small>Calories, protein and meal details</small></span><b>→</b></button>
      <button onClick={() => go("Coach")}><i>✦</i><span><strong>Ask Forge Coach</strong><small>Training, recovery or nutrition</small></span><b>→</b></button>
    </section>
  </div>;
}

function MealDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (meal: Omit<Meal, "id" | "recordedAt">) => void }) {
  const dialogRef = useModalA11y<HTMLFormElement>(onClose);
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
    <form ref={dialogRef} className="meal-dialog" role="dialog" aria-modal="true" aria-labelledby="meal-dialog-title" onSubmit={submit}>
      <header><div><p className="eyebrow hot">Nutrition log</p><h2 id="meal-dialog-title">Add a meal</h2></div><button type="button" onClick={onClose} aria-label="Close meal form">×</button></header>
      <div className="meal-presets"><span>Quick fill</span><div>{presets.map((preset) => <button type="button" onClick={() => setDraft((current) => ({ ...current, name: preset.name, detail: preset.detail, kcal: preset.kcal, protein: preset.protein }))} key={preset.label}>{preset.label}</button>)}</div></div>
      <label>Meal name<input name="name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Recovery dinner" required /></label>
      <label>Food details <small>optional</small><input name="detail" value={draft.detail} onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))} placeholder="Rice · chicken · greens" /></label>
      <div><label>Time<input name="time" type="time" value={draft.time} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} required /></label><label>Calories<input name="kcal" type="number" min="0" value={draft.kcal || ""} onChange={(event) => setDraft((current) => ({ ...current, kcal: Number(event.target.value) }))} required /></label><label>Protein (g)<input name="protein" type="number" min="0" value={draft.protein || ""} onChange={(event) => setDraft((current) => ({ ...current, protein: Number(event.target.value) }))} required /></label></div>
      <button className="primary-action" type="submit">Add to today <span>→</span></button>
    </form>
  </div>;
}

function localDateTimeValue(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(timestamp - offset).toISOString().slice(0, 16);
}

function MealCorrectionDialog({ meal, onClose, onSave }: { meal: Meal; onClose: () => void; onSave: (meal: Meal) => void }) {
  const dialogRef = useModalA11y<HTMLFormElement>(onClose);
  const [draft, setDraft] = useState({
    recordedAt: localDateTimeValue(meal.recordedAt),
    time: meal.time,
    name: meal.name,
    detail: meal.detail,
    kcal: meal.kcal,
    protein: meal.protein,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recordedAt = new Date(draft.recordedAt).getTime();
    if (!Number.isFinite(recordedAt)) return;
    onSave({ ...meal, ...draft, recordedAt });
  }

  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form ref={dialogRef} className="meal-dialog correction-dialog" role="dialog" aria-modal="true" aria-labelledby="meal-correction-title" onSubmit={submit}>
      <header><div><p className="eyebrow hot">Correct record</p><h2 id="meal-correction-title">Edit meal</h2></div><button type="button" onClick={onClose} aria-label="Close meal correction">×</button></header>
      <p className="correction-note">This updates the same saved record and marks when it was corrected.</p>
      <label>Meal name<input value={draft.name} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required /></label>
      <label>Food details <small>optional</small><input value={draft.detail} maxLength={300} onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))} /></label>
      <div><label>Date and time<input type="datetime-local" value={draft.recordedAt} onChange={(event) => {
        const next = event.target.value;
        setDraft((current) => ({ ...current, recordedAt: next, time: next.slice(11, 16) }));
      }} required /></label><label>Calories<input type="number" min="0" max="20000" value={draft.kcal} onChange={(event) => setDraft((current) => ({ ...current, kcal: Number(event.target.value) }))} required /></label><label>Protein (g)<input type="number" min="0" max="2000" value={draft.protein} onChange={(event) => setDraft((current) => ({ ...current, protein: Number(event.target.value) }))} required /></label></div>
      <div className="correction-actions"><button type="button" className="outline-action" onClick={onClose}>Cancel</button><button className="primary-action" type="submit">Save correction <span>→</span></button></div>
    </form>
  </div>;
}

function HydrationCorrectionDialog({ entry, onClose, onSave, onRemove }: { entry: HydrationEntry; onClose: () => void; onSave: (entry: HydrationEntry) => void; onRemove: () => void }) {
  const dialogRef = useModalA11y<HTMLFormElement>(onClose);
  const [recordedAt, setRecordedAt] = useState(localDateTimeValue(entry.recordedAt));
  const [direction, setDirection] = useState<"added" | "removed">(entry.amountMl >= 0 ? "added" : "removed");
  const [amount, setAmount] = useState(Math.abs(entry.amountMl));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date(recordedAt).getTime();
    if (!Number.isFinite(timestamp) || amount < 1) return;
    onSave({ ...entry, recordedAt: timestamp, amountMl: direction === "added" ? amount : -amount });
  }

  return <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form ref={dialogRef} className="meal-dialog correction-dialog hydration-correction" role="dialog" aria-modal="true" aria-labelledby="hydration-correction-title" onSubmit={submit}>
      <header><div><p className="eyebrow hot">Correct record</p><h2 id="hydration-correction-title">Edit water entry</h2></div><button type="button" onClick={onClose} aria-label="Close water correction">×</button></header>
      <p className="correction-note">Use “removed” only when this entry was meant to correct an earlier overcount.</p>
      <div><label>Change<select value={direction} onChange={(event) => setDirection(event.target.value as "added" | "removed")}><option value="added">Added</option><option value="removed">Removed</option></select></label><label>Amount (ml)<input type="number" min="1" max="3200" value={amount} onChange={(event) => setAmount(Math.max(1, Number(event.target.value)))} required /></label><label>Date and time<input type="datetime-local" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} required /></label></div>
      <div className="correction-actions"><button type="button" className="record-remove-action" onClick={onRemove}>Remove entry</button><button className="primary-action" type="submit">Save correction <span>→</span></button></div>
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
  onDeleteAccount,
}: {
  profile: ForgeProfile;
  email: string;
  onClose: () => void;
  onSave: (profile: ForgeProfile) => void;
  onReplayLogin: () => void;
  onReplayOnboarding: () => void;
  onDeleteAccount: (confirmation: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(profile);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const displayName = draft.displayName.trim() || "Athlete";
  const drawerRef = useModalA11y<HTMLElement>(onClose);

  return <div className="drawer-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside ref={drawerRef} className="profile-drawer" role="dialog" aria-modal="true" aria-labelledby="profile-drawer-title">
      <header><div><span aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><p><strong id="profile-drawer-title">{displayName}</strong><small>{email || "Signed-in athlete"}</small></p></div><button onClick={onClose} aria-label="Close profile">×</button></header>
      <section className="account-profile"><p className="eyebrow">Athlete profile</p><label>Display name<input value={draft.displayName} maxLength={80} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="How FORGE should address you" /></label><dl><div><dt>Account</dt><dd>Protected</dd></div><div><dt>Plan</dt><dd>Free</dd></div><div><dt>Data</dt><dd>Account synced</dd></div></dl></section>
      <section><p className="eyebrow">Safety preferences</p><ul><li>Stop or adjust movements that cause pain.</li><li>Progress only with clean range of motion and control.</li><li>Review persistent symptoms with a qualified professional.</li></ul></section>
      <section><p className="eyebrow">Preferences</p><div className="preference"><span>Units</span><div role="group" aria-label="Measurement units">{(["Metric", "Imperial"] as const).map((item) => <button aria-pressed={draft.units === item} className={draft.units === item ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, units: item }))} key={item}>{item}</button>)}</div></div><div className="preference"><span>Session reminders</span><button aria-label="Session reminders" aria-pressed={draft.notifications} className={`toggle ${draft.notifications ? "on" : ""}`} onClick={() => setDraft((current) => ({ ...current, notifications: !current.notifications }))}><i /></button></div></section>
      <section className="demo-tools">
        <p className="eyebrow">Account</p>
        <a href="/api/records?format=export" download><span><b>Export my records</b><small>Download workouts, meals and hydration as JSON</small></span><i>↓</i></a>
        <a href="/privacy"><span><b>Privacy and data</b><small>What FORGE keeps and the controls you have</small></span><i>→</i></a>
        <button onClick={onReplayLogin}><span><b>Replay welcome</b><small>Replay the short cinematic</small></span><i>↗</i></button>
        <button onClick={onReplayOnboarding}><span><b>Review setup</b><small>Review the three setup choices</small></span><i>→</i></button>
        <a href="/signout-with-chatgpt?return_to=%2F"><span><b>SIGN OUT</b><small>Securely end this session</small></span><i>→</i></a>
      </section>
      <section className="account-danger">
        <p className="eyebrow">Delete account data</p>
        {!deleteOpen ? <button onClick={() => setDeleteOpen(true)}><span><b>Delete my FORGE account</b><small>Permanently remove workouts, meals, hydration and preferences</small></span><i>→</i></button> : <div className="account-delete-confirm">
          <p>This cannot be undone. A non-identifying security event may be retained.</p>
          <label>Type <strong>DELETE FORGE</strong> to confirm<input autoComplete="off" spellCheck={false} value={deleteConfirmation} onChange={(event) => {
            setDeleteConfirmation(event.target.value);
            setDeleteError("");
          }} /></label>
          {deleteError && <p className="account-delete-error" role="alert">{deleteError}</p>}
          <div><button disabled={deleting} onClick={() => {
            setDeleteOpen(false);
            setDeleteConfirmation("");
            setDeleteError("");
          }}>Cancel</button><button disabled={deleting || deleteConfirmation !== "DELETE FORGE"} onClick={async () => {
            setDeleting(true);
            setDeleteError("");
            try {
              await onDeleteAccount(deleteConfirmation);
            } catch (error) {
              setDeleting(false);
              setDeleteError(error instanceof Error ? error.message : "FORGE could not delete this account.");
            }
          }}>{deleting ? "Deleting…" : "Permanently delete"}</button></div>
        </div>}
      </section>
      <button className="outline-action drawer-save" disabled={!draft.displayName.trim()} onClick={() => onSave({ ...draft, displayName: draft.displayName.trim() })}>Save preferences</button>
    </aside>
  </div>;
}
