type AttendanceMonth = {
  label: string;
  value: number; // 0-100
  current?: boolean;
};

const DATA: AttendanceMonth[] = [
  { label: "Okt", value: 78 },
  { label: "Nov", value: 62 },
  { label: "Des", value: 91 },
  { label: "Jan", value: 70 },
  { label: "Feb", value: 84 },
  { label: "Mar", value: 55, current: true },
];

export function AttendanceChart() {
  return (
    <div>
      <div className="flex h-[220px] items-end gap-md border-b border-outline-variant pb-0">
        {DATA.map((month) => (
          <div
            key={month.label}
            className="flex flex-1 flex-col items-center justify-end gap-sm"
          >
            <div
              className={`w-full max-w-[44px] rounded-t-md ${
                month.current ? "" : "bg-primary-container"
              }`}
              style={{
                height: `${month.value}%`,
                backgroundImage: month.current
                  ? "repeating-linear-gradient(135deg, var(--color-secondary) 0, var(--color-secondary) 4px, var(--color-secondary-fixed) 4px, var(--color-secondary-fixed) 8px)"
                  : undefined,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-md pt-sm">
        {DATA.map((month) => (
          <div key={month.label} className="flex-1 text-center">
            <span
              className={`text-label-md ${
                month.current
                  ? "font-semibold text-secondary"
                  : "text-on-surface-variant"
              }`}
            >
              {month.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-lg flex items-center gap-lg border-t border-outline-variant pt-md">
        <span className="flex items-center gap-xs text-label-md text-on-surface-variant">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-container" />
          Bulan Selesai
        </span>
        <span className="flex items-center gap-xs text-label-md text-on-surface-variant">
          <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
          Bulan Berjalan
        </span>
      </div>
    </div>
  );
}
