"use client";

export function AnimatedBackground() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
        {/* Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.10),transparent_30%),radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.08),transparent_28%)]" />

        {/* Capas */}
        <div className="wave wave-1" />
        <div className="wave wave-2" />
        <div className="wave wave-3" />

        <div className="absolute inset-0 bg-gradient-to-b" />
      </div>
    </>
  );
}