import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { Pipeline, usePipeline, Card } from "@/components/ui-bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WorkFlow AI — From meeting to action" },
      { name: "description", content: "One assistant that turns meeting notes into a summary, prioritized tasks, a schedule and a follow-up email." },
      { property: "og:title", content: "WorkFlow AI — From meeting to action" },
      { property: "og:description", content: "Meeting notes → summary → tasks → priorities → schedule → email, with you approving every step." },
    ],
  }),
  component: Home,
});

const prioStyle = { high: "bg-destructive/10 text-destructive", medium: "bg-warn/15 text-warn", low: "bg-secondary text-primary" };

function Home() {
  const { state } = useStore();
  const steps = usePipeline();
  const next = steps.find((s) => !s.done);
  const top = state.tasks.filter((t) => !t.done && t.priority).sort((a, b) => ["high", "medium", "low"].indexOf(a.priority!) - ["high", "medium", "low"].indexOf(b.priority!)).slice(0, 3);
  const firstDay = state.schedule?.blocks[0]?.day;
  const today = state.schedule?.blocks.filter((b) => b.day === firstDay).slice(0, 4) ?? [];
  const isNew = state.meetings.length === 0;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-[34px] leading-tight text-balance">Your meeting, mapped into a week.</h1>
        <p className="mt-2 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
          Paste your meeting notes once. WorkFlow AI writes the summary, turns action items into tasks, ranks them, plans your time and drafts the follow-up — and you approve every step.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {isNew ? (
            <>
              <Link to="/demo" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">Try the 2-minute guided demo <ArrowRight className="size-4" /></Link>
              <Link to="/meetings" className="inline-flex h-11 items-center rounded-full bg-card px-5 text-sm font-medium ring-1 ring-border">Use my own notes</Link>
            </>
          ) : next ? (
            <Link to={next.to} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">Next step: {next.label} <ArrowRight className="size-4" /></Link>
          ) : (
            <p className="rounded-full bg-secondary px-4 py-2 text-sm text-primary">All steps done — nice work!</p>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Pipeline />
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 font-display text-[20px]">Top priority</h2>
            {top.length === 0 ? <p className="text-sm text-muted-foreground">Priorities will show here once your tasks are ranked.</p> : (
              <div className="space-y-2">
                {top.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${prioStyle[t.priority!]}`}>{t.priority}</span>
                    <span className="truncate text-[14px]">{t.title}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{t.deadline}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-[20px]">{firstDay ?? "Today"}</h2>
            {today.length === 0 ? <p className="text-sm text-muted-foreground">Your planned time blocks will show here.</p> : today.map((b, i) => (
              <div key={i} className="flex gap-3 border-b py-2.5 last:border-0">
                <span className="font-mono text-[11px] text-muted-foreground">{b.start}</span>
                <span className="text-[14px]">{b.title}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {state.meetings.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-[20px]">Recent meetings</h2>
          {state.meetings.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b py-2.5 text-sm last:border-0">
              <span>{m.title}<span className="ml-2 text-muted-foreground">{m.date}</span></span>
              <span className={`eyebrow ${m.approved ? "text-primary" : "text-warn"}`}>{m.approved ? "Approved" : "Needs review"}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
