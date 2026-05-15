import { NewSessionForm } from "@/components/new-session-form";
import { getDisplayCwd } from "@/lib/cwd";

export default function NewSessionPage() {
  const displayCwd = getDisplayCwd();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-baseline gap-3 border-b px-6 py-4">
        <span className="font-semibold text-lg">new task</span>
        <span className="font-mono text-muted-foreground text-sm">
          {displayCwd}
        </span>
      </header>
      <section className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="font-semibold text-3xl tracking-tight">
              What should we build today?
            </h1>
            <p className="text-muted-foreground">
              Describe your task and the agent will figure out and run the
              tools.
            </p>
          </div>
          <NewSessionForm />
        </div>
      </section>
    </div>
  );
}
