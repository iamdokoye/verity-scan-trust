import { ShieldCheck } from "lucide-react";

export function Logo({ subtitle, light = false }: { subtitle?: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
        style={{ background: "var(--gradient-primary)", boxShadow: "inset 0 1px 0 var(--glass-highlight)" }}
      >
        <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="leading-tight">
        <span
          className={`block font-display text-lg font-extrabold tracking-tight ${light ? "text-white" : ""}`}
        >
          Votta
        </span>
        {subtitle && (
          <span
            className={`block text-[11px] tracking-widest uppercase ${light ? "text-white/70" : "text-muted-foreground"}`}
          >
            {subtitle}
          </span>
        )}
      </span>
    </div>
  );
}
