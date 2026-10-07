import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-bits";
import { ScheduleStep } from "@/components/steps";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "AI Scheduler — WorkFlow AI" },
      { name: "description", content: "A daily or weekly plan built from your actual tasks, deadlines and priorities." },
      { property: "og:title", content: "AI Scheduler — WorkFlow AI" },
      { property: "og:description", content: "Turn prioritized tasks into focused time blocks." },
    ],
  }),
  component: () => {
    const nav = useNavigate();
    return (
      <>
        <PageHeader step="Step 3" title="Plan your time" hint="Pick today or this week and your working hours. AI fits your open tasks into focused blocks — you can rename any block before approving." />
        <ScheduleStep onDone={() => nav({ to: "/email" })} />
      </>
    );
  },
});
