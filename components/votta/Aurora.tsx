/** Fixed aurora mesh + grain texture. One layer for the whole app. */
export function Aurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background print:hidden"
    >
      <div
        className="absolute -left-40 -top-48 h-[36rem] w-[36rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--blue-bright) 55%, transparent), transparent 70%)",
          opacity: "var(--aurora-opacity)",
        }}
      />
      <div
        className="absolute -right-32 top-24 h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--navy) 50%, transparent), transparent 70%)",
          opacity: "var(--aurora-opacity)",
        }}
      />
      <div
        className="absolute bottom-[-10rem] left-1/4 h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--success) 40%, transparent), transparent 70%)",
          opacity: "calc(var(--aurora-opacity) * 0.8)",
        }}
      />
      <div
        className="absolute right-1/4 bottom-1/3 h-72 w-72 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--warning) 35%, transparent), transparent 70%)",
          opacity: "calc(var(--aurora-opacity) * 0.5)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </div>
  );
}
