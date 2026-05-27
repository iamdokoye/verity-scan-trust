import { KeyRound } from "lucide-react";

export default function CryptoKeysPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Crypto Keys
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage signing keys for each institution.
        </p>
      </div>
      <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-24 text-center">
        <KeyRound className="mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="font-medium text-foreground">Coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Key rotation and public key management is being built.
        </p>
      </div>
    </div>
  );
}
