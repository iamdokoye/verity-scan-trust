import { ShieldCheck } from "lucide-react";

export function Logo({ subtitle, light = false }: { subtitle?: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-md ${
          light ? "bg-white/10 text-white" : "bg-primary text-primary-foreground"
        }`}
      >
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className={`text-lg font-bold tracking-tight ${light ? "text-white" : "text-primary"}`}>
          Votta
        </div>
        {subtitle && (
          <div className={`text-[10px] uppercase tracking-wider ${light ? "text-white/70" : "text-muted-foreground"}`}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
