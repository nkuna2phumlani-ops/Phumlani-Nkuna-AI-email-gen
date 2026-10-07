import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-bits";
import { EmailStep } from "@/components/steps";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Follow-up Email — WorkFlow AI" },
      { name: "description", content: "Draft a professional follow-up email from your meeting decisions and tasks." },
      { property: "og:title", content: "Follow-up Email — WorkFlow AI" },
      { property: "og:description", content: "Context-aware email drafts you review and send yourself." },
    ],
  }),
  component: () => (
    <>
      <PageHeader step="Step 4" title="Write the follow-up" hint="AI drafts an email from your latest meeting and its tasks. Edit it, then copy it into your own email app — nothing is ever sent for you." />
      <EmailStep />
    </>
  ),
});
