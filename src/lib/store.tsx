import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SummaryResult, ScheduleResult, EmailResult } from "./ai.functions";

export type Meeting = { id: string; title: string; date: string; notes: string; summary?: SummaryResult; approved: boolean };
export type Task = {
  id: string; title: string; owner: string; deadline: string; meetingId?: string;
  priority?: "high" | "medium" | "low"; reason?: string; done: boolean; ai: boolean;
};
export type State = {
  meetings: Meeting[]; tasks: Task[];
  schedule?: ScheduleResult & { approved: boolean };
  email?: EmailResult & { meetingId?: string };
};

const KEY = "workflow-ai-v1";
const empty: State = { meetings: [], tasks: [] };
const Ctx = createContext<{ state: State; set: (fn: (s: State) => State) => void; reset: () => void } | null>(null);

export const uid = () => Math.random().toString(36).slice(2, 10);
export const todayStr = () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setState(JSON.parse(raw)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, ready]);
  return (
    <Ctx.Provider value={{ state, set: (fn) => setState((s) => fn(s)), reset: () => setState(empty) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export function latestMeeting(s: State) {
  return s.meetings[0];
}

export function meetingContext(m?: Meeting) {
  if (!m?.summary) return "";
  return `Title: ${m.title}\nSummary: ${m.summary.summary}\nDecisions:\n${m.summary.decisions.map((d) => "- " + d).join("\n")}`;
}

export function tasksContext(tasks: Task[]) {
  return tasks.map((t) => `- ${t.title} | owner: ${t.owner || "unassigned"} | deadline: ${t.deadline || "none"} | priority: ${t.priority || "unset"}`).join("\n");
}

export const SAMPLE_NOTES = `Q3 Launch Sync — attendees: Maya, Devon, Priya, Sam.
- Team agreed to move the product launch to October 14 (was Oct 7) to finish QA.
- Pre-launch review meeting will be held on October 10.
- Maya will own the beta rollout checklist and share it by October 9.
- Devon needs to finalize the three pricing tiers before Friday.
- Priya will update the onboarding emails with the new launch date by Thursday.
- Sam raised concern about support coverage; Sam to draft a support rota for launch week, no fixed date yet.
- Decision: no new features will be added before launch.`;
