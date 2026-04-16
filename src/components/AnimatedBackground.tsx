export function AnimatedBackground({ dimmed }: { dimmed: boolean }) {
  return (
    <div className="fixed inset-0 mesh-gradient transition-all duration-1000">
      <div className="noise-overlay" />
      {dimmed && <div className="absolute inset-0 bg-[#0a0a1a]/70 transition-opacity duration-700" />}
    </div>
  );
}
