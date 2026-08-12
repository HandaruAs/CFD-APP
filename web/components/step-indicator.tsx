import { Check } from "lucide-react";

export type Step = {
  title: string;
  subtitle: string;
};

export function StepIndicator({
  steps,
  activeIndex,
}: {
  steps: Step[];
  activeIndex: number;
}) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.title} className="flex gap-sm">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-md transition-colors ${
                  isActive
                    ? "bg-primary text-on-primary shadow-sm ring-4 ring-primary-container/40"
                    : isDone
                      ? "bg-secondary text-on-secondary"
                      : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : index + 1}
              </span>
              {!isLast && (
                <span
                  className={`my-xs w-px flex-1 ${
                    isDone ? "bg-secondary" : "bg-outline-variant"
                  }`}
                  style={{ minHeight: "1.5rem" }}
                />
              )}
            </div>
            <div className={isLast ? "pb-0" : "pb-lg"}>
              <p
                className={`text-label-md ${
                  isActive
                    ? "font-semibold text-on-surface"
                    : isDone
                      ? "text-on-surface"
                      : "text-on-surface-variant"
                }`}
              >
                {step.title}
              </p>
              <p className="text-label-sm font-normal tracking-normal text-on-surface-variant">
                {step.subtitle}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}