"use client";

export default function AmbientGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Indigo orb — top-left area */}
      <div
        className="absolute"
        style={{
          width: 500,
          height: 500,
          top: "8%",
          left: "5%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.7) 0%, rgba(99,102,241,0.2) 50%, transparent 70%)",
          filter: "blur(40px)",
          animation: "ambientGlow 8s ease-in-out infinite, ambientDrift 20s ease-in-out infinite",
        }}
      />
      {/* Cyan orb — bottom-right area */}
      <div
        className="absolute"
        style={{
          width: 450,
          height: 450,
          bottom: "5%",
          right: "8%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,0.6) 0%, rgba(34,211,238,0.15) 50%, transparent 70%)",
          filter: "blur(40px)",
          animation:
            "ambientGlow 10s ease-in-out infinite 3s, ambientDrift 24s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}
