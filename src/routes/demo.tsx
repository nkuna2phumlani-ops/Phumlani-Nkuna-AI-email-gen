import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/ui-bits";
import { SummarizeStep, TasksStep, ScheduleStep, EmailStep } from "@/components/steps";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Guided Demo — WorkFlow AI" },
      { name: "description", content: "Walk through the full flow: meeting notes, AI summary, tasks, prioritization, schedule and follow-up email." },
      { property: "og:title", content: "Guided Demo — WorkFlow AI" },
      { property: "og:description", content: "Experience the complete meeting-to-action workflow in one place." },
    ],
  }),
  component: Demo,
});

const STEPS = [
  { t: "Summarize", h: "Press “Use example notes”, then “Summarize with AI”. Check the result and approve it." },
  { t: "Prioritize", h: "Your action items are now tasks. Press “Prioritize with AI”, adjust if you like, then Continue." },
  { t: "Schedule", h: "Choose today or this week and press “Build my schedule”. Approve when it looks right." },
  { t: "Email", h: "Draft the follow-up email. Edit it and copy it — it's never sent automatically." },
];

function Demo() {
  const [i, setI] = useState(0);
  const next = () => { setI((x) => Math.min(x + 1, 3)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <>
      <PageHeader title="Guided demo" hint="See the whole journey in one place. Each step uses the result of the one before — no copying and pasting." />
      <ol className="mb-6 flex gap-2 overflow-x-auto">
        {STEPS.map((s, k) => (
          <li key={s.t}>
            <button onClick={() => setI(k)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm ring-1 ${k === i ? "bg-primary text-primary-foreground ring-primary" : k < i ? "bg-secondary text-primary ring-primary/20" : "bg-card text-muted-foreground ring-border"}`}>
              {k < i ? <Check className="size-3.5" /> : <span className="font-mono text-[11px]">{k + 1}</span>}{s.t}
            </button>
          </li>
        ))}
      </ol>
      <p className="mb-5 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">{STEPS[i].h}</p>
      {i === 0 && <SummarizeStep onDone={next} />}
      {i === 1 && <TasksStep onDone={next} />}
      {i === 2 && <ScheduleStep onDone={next} />}
      {i === 3 && <EmailStep />}
    </>
  );
}
