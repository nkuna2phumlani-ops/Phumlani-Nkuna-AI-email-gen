import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Plus, Copy, RefreshCw, Check } from "lucide-react";
import { summarizeMeeting, prioritizeTasks, buildSchedule, draftEmail } from "@/lib/ai.functions";
import { useStore, uid, todayStr, SAMPLE_NOTES, meetingContext, tasksContext, type Task } from "@/lib/store";
import { AiBadge, Disclaimer, Btn, Loading, ErrorBox, Card, Empty } from "./ui-bits";

const input = "w-full rounded-xl bg-card px-3.5 py-2.5 text-sm ring-1 ring-input outline-none focus:ring-2 focus:ring-ring";
const label = "mb-1.5 block text-[13px] font-medium";

/* ---------- 1. Meeting summary ---------- */
export function SummarizeStep({ onDone }: { onDone?: () => void }) {
  const { state, set } = useStore();
  const m = state.meetings[0];
  const [title, setTitle] = useState(m?.title ?? "");
  const [notes, setNotes] = useState(m?.notes ?? "");
  const [editing, setEditing] = useState(false);
  const ai = useAi(useServerFn(summarizeMeeting));

  const generate = async () => {
    const r = await ai.run({ data: { title, notes } });
    if (!r) return;
    const meeting = { id: m && m.notes === notes ? m.id : uid(), title: title || "Untitled meeting", date: todayStr(), notes, summary: r, approved: false };
    set((s) => ({ ...s, meetings: [meeting, ...s.meetings.filter((x) => x.id !== meeting.id)] }));
  };

  const approve = () => {
    if (!m?.summary) return;
    const newTasks: Task[] = m.summary.actionItems.map((a) => ({ id: uid(), title: a.title, owner: a.owner, deadline: a.deadline, meetingId: m.id, done: false, ai: true }));
    set((s) => ({
      ...s,
      meetings: s.meetings.map((x) => (x.id === m.id ? { ...x, approved: true } : x)),
      tasks: [...s.tasks.filter((t) => t.meetingId !== m.id), ...newTasks],
    }));
    onDone?.();
  };

  const updateSummary = (patch: Partial<NonNullable<typeof m>["summary"] & object>) =>
    set((s) => ({ ...s, meetings: s.meetings.map((x, i) => (i === 0 && x.summary ? { ...x, summary: { ...x.summary, ...patch }, approved: false } : x)) }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <p className="eyebrow mb-3 text-faint">Your input</p>
        <label className={label}>Meeting name</label>
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly team sync" />
        <label className={`${label} mt-4`}>Paste your notes or transcript</label>
        <textarea className={`${input} min-h-56 font-sans leading-relaxed`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who said what, what was agreed, who will do what and by when…" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={generate} disabled={ai.loading || notes.trim().length < 10}>{m?.summary && m.notes === notes ? "Summarize again" : "Summarize with AI"}</Btn>
          {!notes && <Btn variant="soft" onClick={() => { setTitle("Q3 Launch Sync"); setNotes(SAMPLE_NOTES); }}>Use example notes</Btn>}
        </div>
      </Card>

      <div className="space-y-4">
        {ai.loading && <Loading label="Reading your notes and pulling out decisions and action items…" />}
        {ai.error && <ErrorBox message={ai.error} onRetry={generate} />}
        {!ai.loading && !m?.summary && <Empty title="Your summary appears here" text="Paste notes on the left, then press Summarize. Not sure what to write? Try the example notes." />}
        {!ai.loading && m?.summary && (
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <AiBadge />
              {m.approved && <span className="eyebrow text-primary">Approved</span>}
              <button onClick={() => setEditing(!editing)} className="ml-auto text-sm text-muted-foreground underline">{editing ? "Done editing" : "Edit"}</button>
            </div>
            {editing ? (
              <textarea className={`${input} min-h-28`} value={m.summary.summary} onChange={(e) => updateSummary({ summary: e.target.value })} />
            ) : (
              <p className="text-[15px] leading-relaxed">{m.summary.summary}</p>
            )}
            <h3 className="mt-5 mb-2 font-display text-lg">Decisions</h3>
            {m.summary.decisions.length === 0 ? <p className="text-sm text-muted-foreground">No clear decisions were found.</p> : (
              <ul className="list-disc space-y-1 pl-5 text-sm">{m.summary.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
            )}
            <h3 className="mt-5 mb-2 font-display text-lg">Action items</h3>
            <div className="space-y-2">
              {m.summary.actionItems.map((a, i) => (
                <div key={i} className="rounded-xl bg-muted/60 p-3 text-sm">
                  {editing ? (
                    <input className={input} value={a.title} onChange={(e) => updateSummary({ actionItems: m.summary!.actionItems.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                  ) : <p className="font-medium">{a.title}</p>}
                  <p className="mt-1 text-[12px] text-muted-foreground">Owner: {a.owner || "Not stated"} · Due: {a.deadline || "Not stated"}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Btn onClick={approve}><Check className="size-4" />{m.approved ? "Approved — turned into tasks" : "Approve & create tasks"}</Btn>
              <Btn variant="soft" onClick={generate}><RefreshCw className="size-4" />Regenerate</Btn>
            </div>
            <div className="mt-4"><Disclaimer /></div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------- 2. Tasks & priorities ---------- */
const prioStyle = { high: "bg-destructive/10 text-destructive", medium: "bg-warn/15 text-warn", low: "bg-secondary text-primary" };

export function TasksStep({ onDone }: { onDone?: () => void }) {
  const { state, set } = useStore();
  const [newTitle, setNewTitle] = useState("");
  const ai = useAi(useServerFn(prioritizeTasks));
  const order = { high: 0, medium: 1, low: 2 } as const;
  const tasks = [...state.tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.priority ? order[a.priority] : 3) - (b.priority ? order[b.priority] : 3));
  const open = state.tasks.filter((t) => !t.done);

  const patch = (id: string, p: Partial<Task>) => set((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) }));
  const prioritize = async () => {
    const r = await ai.run({ data: { today: todayStr(), tasks: open.map(({ id, title, owner, deadline }) => ({ id, title, owner, deadline })) } });
    if (!r) return;
    set((s) => ({ ...s, tasks: s.tasks.map((t) => { const p = r.items.find((x) => x.id === t.id); return p ? { ...t, priority: p.priority, reason: p.reason } : t; }) }));
  };
  const add = () => {
    if (!newTitle.trim()) return;
    set((s) => ({ ...s, tasks: [...s.tasks, { id: uid(), title: newTitle.trim(), owner: "", deadline: "", done: false, ai: false }] }));
    setNewTitle("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-48">
            <p className="font-medium">{open.length} open task{open.length === 1 ? "" : "s"}</p>
            <p className="text-sm text-muted-foreground">Let AI suggest what matters most. You can change any priority.</p>
          </div>
          <Btn onClick={prioritize} disabled={ai.loading || open.length === 0}>Prioritize with AI</Btn>
          {onDone && <Btn variant="soft" onClick={onDone} disabled={open.length === 0}>Continue</Btn>}
        </div>
        <div className="mt-4 flex gap-2">
          <input className={input} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add your own task…" />
          <Btn variant="soft" onClick={add} aria-label="Add task"><Plus className="size-4" /></Btn>
        </div>
      </Card>
      {ai.loading && <Loading label="Weighing deadlines and impact to rank your tasks…" />}
      {ai.error && <ErrorBox message={ai.error} onRetry={prioritize} />}
      {tasks.length === 0 ? (
        <Empty title="No tasks yet" text="Approve a meeting summary and its action items will show up here automatically." to="/meetings" cta="Go to meetings" />
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className={`glass flex items-start gap-3 px-4 py-3 ${t.done ? "opacity-55" : ""}`}>
              <input type="checkbox" checked={t.done} onChange={(e) => patch(t.id, { done: e.target.checked })} className="mt-1 size-4 accent-primary" aria-label="Mark done" />
              <div className="min-w-0 flex-1">
                <input className={`w-full bg-transparent text-[14px] font-medium outline-none ${t.done ? "line-through" : ""}`} value={t.title} onChange={(e) => patch(t.id, { title: e.target.value })} />
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                  <span>Owner: <input className="w-24 bg-transparent outline-none" value={t.owner} placeholder="—" onChange={(e) => patch(t.id, { owner: e.target.value })} /></span>
                  <span>Due: <input className="w-24 bg-transparent outline-none" value={t.deadline} placeholder="—" onChange={(e) => patch(t.id, { deadline: e.target.value })} /></span>
                  {t.ai && <span className="text-primary">from meeting</span>}
                </div>
                {t.reason && <p className="mt-1.5 text-[12px] italic text-muted-foreground">AI: {t.reason}</p>}
              </div>
              <select value={t.priority ?? ""} onChange={(e) => patch(t.id, { priority: (e.target.value || undefined) as Task["priority"] })}
                className={`rounded-full px-2 py-1 font-mono text-[10px] uppercase outline-none ${t.priority ? prioStyle[t.priority] : "bg-muted text-faint"}`}>
                <option value="">Set</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
              <button onClick={() => set((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== t.id) }))} className="text-faint hover:text-destructive" aria-label="Delete task"><Trash2 className="size-4" /></button>
            </div>
          ))}
          {tasks.some((t) => t.reason) && <Disclaimer />}
        </div>
      )}
    </div>
  );
}

/* ---------- 3. Schedule ---------- */
export function ScheduleStep({ onDone }: { onDone?: () => void }) {
  const { state, set } = useStore();
  const [range, setRange] = useState<"day" | "week">("week");
  const [hours, setHours] = useState("09:00–17:00");
  const ai = useAi(useServerFn(buildSchedule));
  const open = state.tasks.filter((t) => !t.done);
  const sch = state.schedule;

  const generate = async () => {
    const r = await ai.run({ data: { today: todayStr(), range, hours, tasks: open.map(({ id, title, owner, deadline, priority }) => ({ id, title, owner, deadline, priority: priority ?? "unset" })) } });
    if (r) set((s) => ({ ...s, schedule: { ...r, approved: false } }));
  };
  const days = sch ? [...new Set(sch.blocks.map((b) => b.day))] : [];

  if (open.length === 0) return <Empty title="Nothing to schedule yet" text="Once you have open tasks, AI can plan them around your working hours." to="/tasks" cta="Go to tasks" />;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <div>
            <label className={label}>Plan for</label>
            <div className="flex rounded-full bg-muted p-1">
              {(["day", "week"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`flex-1 rounded-full py-1.5 text-sm ${range === r ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{r === "day" ? "Today" : "This week"}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>Working hours</label>
            <input className={input} value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <Btn onClick={generate} disabled={ai.loading}>{sch ? "Rebuild schedule" : "Build my schedule"}</Btn>
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">Uses your {open.length} open tasks, their deadlines and priorities.</p>
      </Card>
      {ai.loading && <Loading label="Fitting your tasks into focused time blocks…" />}
      {ai.error && <ErrorBox message={ai.error} onRetry={generate} />}
      {!ai.loading && sch && (
        <Card>
          <div className="mb-4 flex items-center gap-2"><AiBadge />{sch.approved && <span className="eyebrow text-primary">Approved</span>}</div>
          <div className="space-y-5">
            {days.map((d) => (
              <div key={d}>
                <h3 className="mb-2 font-display text-lg">{d}</h3>
                <div className="space-y-2">
                  {sch.blocks.map((b, i) => b.day === d && (
                    <div key={i} className="flex items-start gap-3 border-b pb-2 last:border-0">
                      <span className="w-24 shrink-0 font-mono text-[11px] text-muted-foreground">{b.start}–{b.end}</span>
                      <div className="min-w-0 flex-1">
                        <input className="w-full bg-transparent text-[14px] outline-none" value={b.title}
                          onChange={(e) => set((s) => ({ ...s, schedule: s.schedule && { ...s.schedule, approved: false, blocks: s.schedule.blocks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) } }))} />
                        {b.note && <p className="text-[12px] text-muted-foreground">{b.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Btn onClick={() => { set((s) => ({ ...s, schedule: s.schedule && { ...s.schedule, approved: true } })); onDone?.(); }}><Check className="size-4" />{sch.approved ? "Approved" : "Approve schedule"}</Btn>
            <Btn variant="soft" onClick={generate}><RefreshCw className="size-4" />Regenerate</Btn>
          </div>
          <div className="mt-4"><Disclaimer /></div>
        </Card>
      )}
    </div>
  );
}

/* ---------- 4. Email ---------- */
export function EmailStep() {
  const { state, set } = useStore();
  const m = state.meetings.find((x) => x.summary);
  const [recipient, setRecipient] = useState("Meeting attendees");
  const [tone, setTone] = useState("Friendly professional");
  const [purpose, setPurpose] = useState("");
  const [copied, setCopied] = useState(false);
  const ai = useAi(useServerFn(draftEmail));
  const email = state.email;
  const related = state.tasks.filter((t) => !m || t.meetingId === m.id || !t.meetingId);

  const generate = async () => {
    const r = await ai.run({ data: { recipient, tone, purpose, meeting: meetingContext(m), tasks: tasksContext(related) } });
    if (r) set((s) => ({ ...s, email: { ...r, meetingId: m?.id } }));
  };

  if (!m) return <Empty title="No meeting to follow up on" text="Summarize a meeting first — the email is written from its decisions and tasks." to="/meetings" cta="Go to meetings" />;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <p className="eyebrow mb-3 text-faint">Based on “{m.title}” + {related.length} tasks</p>
        <label className={label}>To</label>
        <input className={input} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <label className={`${label} mt-4`}>Tone</label>
        <select className={input} value={tone} onChange={(e) => setTone(e.target.value)}>
          <option>Friendly professional</option><option>Formal</option><option>Brief and direct</option><option>Warm and encouraging</option>
        </select>
        <label className={`${label} mt-4`}>Anything to add? (optional)</label>
        <input className={input} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Remind everyone about the review" />
        <Btn className="mt-4" onClick={generate} disabled={ai.loading}>{email ? "Write a new draft" : "Draft email with AI"}</Btn>
      </Card>
      <div className="space-y-4">
        {ai.loading && <Loading label="Writing a follow-up from your meeting and tasks…" />}
        {ai.error && <ErrorBox message={ai.error} onRetry={generate} />}
        {!ai.loading && !email && <Empty title="Your draft appears here" text="You'll be able to edit it and copy it into your own email app." />}
        {!ai.loading && email && (
          <Card>
            <div className="mb-3 flex items-center gap-2"><AiBadge /><span className="eyebrow text-faint">Draft — never sent automatically</span></div>
            <label className={label}>Subject</label>
            <input className={input} value={email.subject} onChange={(e) => set((s) => ({ ...s, email: s.email && { ...s.email, subject: e.target.value } }))} />
            <label className={`${label} mt-4`}>Message</label>
            <textarea className={`${input} min-h-72 leading-relaxed`} value={email.body} onChange={(e) => set((s) => ({ ...s, email: s.email && { ...s.email, body: e.target.value } }))} />
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn onClick={() => { navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy to clipboard"}
              </Btn>
              <Btn variant="soft" onClick={generate}><RefreshCw className="size-4" />Regenerate</Btn>
            </div>
            <div className="mt-4"><Disclaimer /></div>
          </Card>
        )}
      </div>
    </div>
  );
}

function useAi<A, R>(fn: (a: A) => Promise<R>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (a: A): Promise<R | undefined> => {
    setLoading(true); setError(null);
    try { return await fn(a); } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); } finally { setLoading(false); }
  };
  return { run, loading, error };
}
