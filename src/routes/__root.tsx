import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider, useStore } from "@/lib/store";
import { NavLinks } from "@/components/ui-bits";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-6xl">404</h1>
        <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WorkFlow AI" },
      { name: "description", content: "Turn meetings into summaries, prioritized tasks, schedules and follow-up emails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Instrument+Serif&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function ResetButton() {
  const { reset } = useStore();
  return (
    <button onClick={() => confirm("Clear all your meetings, tasks and drafts from this device?") && reset()} className="text-left text-[12px] text-faint underline">
      Clear my data
    </button>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="animate-drift absolute -top-24 -right-16 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="animate-drift absolute top-64 -left-24 size-64 rounded-full bg-warn/10 blur-3xl" />
        </div>
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r bg-background/60 p-4 backdrop-blur-xl md:flex">
            <Link to="/" className="mb-6 flex items-center gap-3 px-2">
              <span className="grid size-8 place-items-center rounded-[10px] bg-primary font-mono text-sm text-primary-foreground">W</span>
              <span className="font-medium">WorkFlow AI</span>
            </Link>
            <NavLinks />
            <div className="mt-auto space-y-2 px-2">
              <p className="text-[12px] leading-relaxed text-muted-foreground">Your data stays in this browser. AI only drafts — you decide.</p>
              <ResetButton />
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/70 px-5 py-3 backdrop-blur-xl md:hidden">
              <span className="grid size-8 place-items-center rounded-[10px] bg-primary font-mono text-sm text-primary-foreground">W</span>
              <span className="font-medium">WorkFlow AI</span>
              <Link to="/demo" className="ml-auto rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-primary">Guided demo</Link>
            </header>
            <main className="mx-auto max-w-5xl px-5 pb-28 pt-8 md:pb-12"><Outlet /></main>
          </div>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/85 backdrop-blur-xl md:hidden"><NavLinks mobile /></nav>
      </StoreProvider>
    </QueryClientProvider>
  );
}
