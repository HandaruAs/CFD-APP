import type { ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={htmlFor} className="text-label-md text-on-surface">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-label-sm font-normal tracking-normal text-on-surface-variant">
          {hint}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-md border border-outline bg-surface-container-lowest px-md text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary";

export const textareaClass =
  "w-full rounded-md border border-outline bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary";
