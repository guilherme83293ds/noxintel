export function NoxLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="NoxIntel"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
