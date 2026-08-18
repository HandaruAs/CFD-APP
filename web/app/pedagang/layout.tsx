import "./pedagang.css";

export default function PedagangLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-pedagang-scope className="flex flex-col h-full min-h-screen">
      {children}
    </div>
  );
}