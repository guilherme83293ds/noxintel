import { useEffect, useState } from "react";

export function LoadingScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "hidden">("show");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), 2600);
    const t2 = setTimeout(() => setPhase("hidden"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #0d1225 50%, #0a0e1a 100%)" }}
    >
      <img
        src="/logo.png"
        alt="NoxIntel"
        className="h-auto"
        style={{
          width: "min(60vw, 400px)",
          filter: "drop-shadow(0 0 40px rgba(42,143,196,0.35))",
          animation: "logo-pulse 2s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes logo-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
