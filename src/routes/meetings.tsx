import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-bits";
import { SummarizeStep } from "@/components/steps";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Summarizer — WorkFlow AI" },
      { name: "description", content: "Paste meeting notes and get a summary, decisions and action items with owners and deadlines." },
      { property: "og:title", content: "Meeting Summarizer — WorkFlow AI" },
      { property: "og:description", content: "AI meeting summaries that never invent names or deadlines." },
    ],
  }),
  component: () => {
    const nav = useNavigate();
    return (
      <>
        <PageHeader step="Step 1" title="Summarize a meeting" hint="Paste your notes. AI pulls out the summary, decisions and who does what by when. Review it, then approve to turn action items into tasks." />
        <SummarizeStep onDone={() => nav({ to: "/tasks" })} />
      </>
    );
  },
});
