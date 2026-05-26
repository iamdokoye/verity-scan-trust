import Link from "next/link";
import { studentList } from "@/lib/mock-data";
import { PageTitle } from "@/components/votta/PortalShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function StudentsList() {
  return (
    <div>
      <PageTitle
        title="Students"
        action={
          <Button>
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
        }
      />
      <div className="mb-4 max-w-sm">
        <Input placeholder="Search by name or matric…" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Matric No.</th>
              <th className="px-5 py-3 text-left font-medium">Name</th>
              <th className="px-5 py-3 text-left font-medium">Department</th>
              <th className="px-5 py-3 text-center font-medium">Year</th>
              <th className="px-5 py-3 text-center font-medium">CGPA</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {studentList.map((s) => (
              <tr key={s.matric} className="hover:bg-muted/30">
                <td className="px-5 py-3 font-mono text-foreground">
                  {s.matric}
                </td>
                <td className="px-5 py-3 font-medium text-foreground">
                  {s.name}
                </td>
                <td className="px-5 py-3 text-foreground">{s.dept}</td>
                <td className="px-5 py-3 text-center text-foreground">
                  {s.year}
                </td>
                <td className="px-5 py-3 text-center font-semibold text-foreground">
                  {s.cgpa.toFixed(2)}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/students/${s.matric}`}
                    className="text-xs font-medium text-secondary hover:underline"
                  >
                    View profile →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
