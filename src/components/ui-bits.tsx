import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Check, Loader2, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";

export function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 eyebrow text-primary">
      <Sparkles className="size-3" /> AI-generated
    </span>
  );
}

export function Disclaimer() {
  return (
    <p className="flex gap-2 border-t pt-3 text-[12px] leading-relaxed text-muted-foreground">
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
      AI can make mistakes. Please check this against your notes — nothing is saved or sent until you approve it.
    </p>
  );
}

export function PageHeader({ step, title, hint }: { step?: string; title: string; hint: string }) {
  return (
    <div className="mb-6">
      {step && <p className="eyebrow mb-2 text-faint">{step}</p>}
      <h1 className="font-display text-[30px] leading-tight text-balance">{title}</h1>
      <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

export function Btn({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "soft" | "ghost" }) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    soft: "bg-card text-foreground ring-1 ring-border hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted",
  }[variant];
  return (
    <button
      {...p}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${v} ${className}`}
    />
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="glass flex items-center gap-3 p-5 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Something went wrong</p>
        <p className="mt-1 opacity-90">{message}</p>
      </div>
      {onRetry && <button onClick={onRetry} className="font-medium underline">Try again</button>}
    </div>
  );
}

export type AppPath = "/" | "/demo" | "/meetings" | "/tasks" | "/schedule" | "/email";
export function Empty({ title, text, to, cta }: { title: string; text: string; to?: AppPath; cta?: string }) {
  return (
    <div className="glass flex flex-col items-center p-8 text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="mt-1 max-w-[44ch] text-sm text-muted-foreground">{text}</p>
      {to && cta && (
        <Link to={to} className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function useAi<A, R>(fn: (a: A) => Promise<R>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (a: A): Promise<R | undefined> => {
    setLoading(true); setError(null);
    try { return await fn(a); }
    catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };
  return { run, loading, error };
}

export function usePipeline() {
  const { state } = useStore();
  const m = state.meetings[0];
  const tasks = state.tasks;
  return [
    { key: "notes", label: "Meeting notes", to: "/meetings" as AppPath, done: !!m },
    { key: "summary", label: "AI summary", to: "/meetings" as AppPath, done: !!m?.approved },
    { key: "tasks", label: "Tasks", to: "/tasks" as AppPath, done: tasks.length > 0 },
    { key: "priority", label: "Priorities", to: "/tasks" as AppPath, done: tasks.length > 0 && tasks.every((t) => t.priority) },
    { key: "schedule", label: "Schedule", to: "/schedule" as AppPath, done: !!state.schedule?.approved },
    { key: "email", label: "Follow-up email", to: "/email" as AppPath, done: !!state.email },
  ];
}

export function Pipeline() {
  const steps = usePipeline();
  const current = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="eyebrow text-faint">Your workflow</span>
        <span className="eyebrow text-muted-foreground">{doneCount} / 6 done</span>
      </div>
      <ol className="space-y-1">
        {steps.map((s, i) => {
          const isNow = i === current;
          return (
            <li key={s.key}>
              <Link to={s.to} className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-muted">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] ring-1 ${s.done ? "bg-secondary text-primary ring-primary/20" : isNow ? "bg-warn/15 text-warn ring-warn/25" : "bg-card text-faint ring-border"}`}>
                  {s.done ? <Check className="size-3" /> : i + 1}
                </span>
                <span className={`text-[14px] ${s.done || isNow ? "text-foreground" : "text-faint"}`}>{s.label}</span>
                <span className={`ml-auto eyebrow ${s.done ? "text-primary" : isNow ? "text-warn" : "text-faint"}`}>
                  {s.done ? "Done" : isNow ? "Next" : "Waiting"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function NavLinks({ mobile }: { mobile?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/" as AppPath, label: "Home" },
    { to: "/demo" as AppPath, label: "Guided demo" },
    { to: "/meetings" as AppPath, label: "Meetings" },
    { to: "/tasks" as AppPath, label: "Tasks" },
    { to: "/schedule" as AppPath, label: "Schedule" },
    { to: "/email" as AppPath, label: "Email" },
  ];
  const list = mobile ? items.filter((i) => i.to !== "/demo") : items;
  return (
    <>
      {list.map((i) => {
        const active = path === i.to;
        return (
          <Link
            key={i.to}
            to={i.to}
            className={mobile
              ? `flex-1 py-2 text-center text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`
              : `rounded-lg px-3 py-2 text-sm ${active ? "bg-secondary font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass p-5 ${className}`}>{children}</div>;
}
