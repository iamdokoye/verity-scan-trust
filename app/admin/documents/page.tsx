import Link from "next/link";
import { documents } from "@/lib/mock-data";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
import { Upload, QrCode, Download } from "lucide-react";

export default function DocsAdmin() {
  return (
    <div>
      <PageTitle
        title="Documents"
        action={
          <Button asChild>
            <Link href="/admin/documents/upload">
              <Upload className="h-4 w-4" /> Upload Document
            </Link>
          </Button>
        }
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Type</th>
              <th className="px-5 py-3 text-left font-medium">Title</th>
              <th className="px-5 py-3 text-left font-medium">Date</th>
              <th className="px-5 py-3 text-left font-medium">Hash</th>
              <th className="px-5 py-3 text-left font-medium">Token</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((d) => (
              <tr key={d.id}>
                <td className="px-5 py-3 text-foreground">{d.type}</td>
                <td className="px-5 py-3 font-medium text-foreground">
                  {d.title}
                </td>
                <td className="px-5 py-3 text-foreground">{d.date}</td>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                  {d.hash}…
                </td>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                  {d.token}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
