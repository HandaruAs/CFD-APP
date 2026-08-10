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
    <ol className="flex flex-col gap-md">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        return (
          <li key={step.title} className="flex items-start gap-sm">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-md ${
                isActive
                  ? "bg-primary text-on-primary"
                  : isDone
                    ? "bg-secondary text-on-secondary"
                    : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {isDone ? "✓" : index + 1}
            </span>
            <div>
              <p
                className={`text-label-md ${
                  isActive || isDone
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
