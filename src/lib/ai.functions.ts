import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAI, GROUNDING } from "./ai.server";

const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export type SummaryResult = {
  summary: string;
  decisions: string[];
  actionItems: { title: string; owner: string; deadline: string }[];
};

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ title: z.string().max(200), notes: z.string().min(10).max(20000) }).parse(d))
  .handler(async ({ data }) =>
    callAI<SummaryResult>({
      system: `Role: You are an expert meeting analyst.
Context: You receive raw meeting notes or a transcript.
Goal: Produce a short summary, the decisions made, and every action item with its owner and deadline.
${GROUNDING} Deadlines must be copied as written in the notes (e.g. "Friday", "Oct 14").
Output: JSON matching the schema.`,
      user: `Meeting title: ${data.title || "Untitled"}\n\nNotes:\n${data.notes}`,
      schemaName: "meeting_summary",
      schema: obj({
        summary: str,
        decisions: { type: "array", items: str },
        actionItems: { type: "array", items: obj({ title: str, owner: str, deadline: str }) },
      }),
    }),
  );

const taskIn = z.object({ id: z.string(), title: z.string(), owner: z.string(), deadline: z.string() });

export type PriorityResult = { items: { id: string; priority: "high" | "medium" | "low"; reason: string }[] };

export const prioritizeTasks = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ today: z.string(), tasks: z.array(taskIn).min(1).max(60) }).parse(d))
  .handler(async ({ data }) =>
    callAI<PriorityResult>({
      system: `Role: You are a pragmatic project manager.
Context: A list of tasks with owners and deadlines; today's date is given.
Goal: Assign each task a priority (high/medium/low) based on urgency of deadline, impact and dependencies, with a one-sentence reason.
${GROUNDING} Return every task id exactly once.
Output: JSON matching the schema.`,
      user: `Today: ${data.today}\nTasks:\n${JSON.stringify(data.tasks)}`,
      schemaName: "task_priorities",
      schema: obj({
        items: { type: "array", items: obj({ id: str, priority: { type: "string", enum: ["high", "medium", "low"] }, reason: str }) },
      }),
    }),
  );

export type ScheduleResult = { blocks: { day: string; start: string; end: string; taskId: string; title: string; note: string }[] };

export const buildSchedule = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      today: z.string(),
      range: z.enum(["day", "week"]),
      hours: z.string(),
      tasks: z.array(taskIn.extend({ priority: z.string() })).min(1).max(60),
    }).parse(d),
  )
  .handler(async ({ data }) =>
    callAI<ScheduleResult>({
      system: `Role: You are a careful personal scheduler.
Context: The user's real open tasks with priorities and deadlines, their working hours, and today's date.
Goal: Create a realistic ${data.range === "day" ? "plan for today" : "plan for the next 5 working days"} of focused time blocks. High priority and near deadlines first. Include short breaks. Never schedule after a task's deadline when it is known.
${GROUNDING} Use only the given task ids; day is like "Wed, Oct 7"; times in 24h HH:MM.
Output: JSON matching the schema.`,
      user: `Today: ${data.today}\nWorking hours: ${data.hours}\nTasks:\n${JSON.stringify(data.tasks)}`,
      schemaName: "schedule",
      schema: obj({ blocks: { type: "array", items: obj({ day: str, start: str, end: str, taskId: str, title: str, note: str }) } }),
    }),
  );

export type EmailResult = { subject: string; body: string };

export const draftEmail = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      recipient: z.string().max(200),
      tone: z.string().max(40),
      purpose: z.string().max(500),
      meeting: z.string().max(20000),
      tasks: z.string().max(20000),
    }).parse(d),
  )
  .handler(async ({ data }) =>
    callAI<EmailResult>({
      system: `Role: You are a professional business communicator.
Context: A meeting summary, decisions and the related tasks (owners, deadlines, priorities).
Goal: Write a clear follow-up email in a ${data.tone || "friendly professional"} tone recapping decisions and next steps.
${GROUNDING} If the sender's name is unknown, sign off with "[Your name]". Use bullet points for action items.
Output: JSON with subject and plain-text body.`,
      user: `Recipient(s): ${data.recipient || "the meeting attendees"}\nExtra purpose: ${data.purpose || "follow-up"}\n\nMeeting:\n${data.meeting}\n\nTasks:\n${data.tasks}`,
      schemaName: "email",
      schema: obj({ subject: str, body: str }),
    }),
  );
