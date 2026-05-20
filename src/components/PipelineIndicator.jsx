export default function PipelineIndicator({ stage }) {
  const stages = ["stack", "pile", "maybe"];
  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      gap: 6, height: 12, pointerEvents: "none",
    }}>
      {stages.map(s => (
        <div key={s} style={{
          width: s === stage ? 18 : 5,
          height: 4, borderRadius: 0,
          background: s === stage ? "var(--color-titlebar)" : "var(--color-chrome-mid)",
          transition: "width 0.25s ease, background 0.25s ease",
        }} />
      ))}
    </div>
  );
}
