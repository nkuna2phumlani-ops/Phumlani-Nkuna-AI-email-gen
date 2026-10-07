import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-bits";
import { TasksStep } from "@/components/steps";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Task Planner — WorkFlow AI" },
      { name: "description", content: "Tasks created from your meetings, ranked by AI with a reason for every priority." },
      { property: "og:title", content: "Task Planner — WorkFlow AI" },
      { property: "og:description", content: "AI-prioritized tasks from your real meeting action items." },
    ],
  }),
  component: () => {
    const nav = useNavigate();
    return (
      <>
        <PageHeader step="Step 2" title="Plan & prioritize tasks" hint="Action items from approved meetings land here. Edit anything, tick off what's done, and let AI suggest what to tackle first." />
        <TasksStep onDone={() => nav({ to: "/schedule" })} />
      </>
    );
  },
});
