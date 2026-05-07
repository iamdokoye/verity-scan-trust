import { prisma } from '../config/prisma';

export class GPAService {
  async computeSemesterGPA(studentId: string, sessionId: string): Promise<number> {
    const results = await prisma.result.findMany({
      where: { studentId, sessionId, isSuperseded: false },
      include: { course: { select: { creditUnits: true } } },
    });
    if (results.length === 0) return 0;

    const totalWeighted = results.reduce(
      (sum, r) => sum + Number(r.gradePoint) * r.course.creditUnits,
      0
    );
    const totalUnits = results.reduce((sum, r) => sum + r.course.creditUnits, 0);
    return totalUnits > 0 ? Math.round((totalWeighted / totalUnits) * 100) / 100 : 0;
  }

  async computeCGPA(studentId: string): Promise<number> {
    const results = await prisma.result.findMany({
      where: { studentId, isSuperseded: false },
      include: { course: { select: { creditUnits: true } } },
    });
    if (results.length === 0) return 0;

    const totalWeighted = results.reduce(
      (sum, r) => sum + Number(r.gradePoint) * r.course.creditUnits,
      0
    );
    const totalUnits = results.reduce((sum, r) => sum + r.course.creditUnits, 0);
    return totalUnits > 0 ? Math.round((totalWeighted / totalUnits) * 100) / 100 : 0;
  }

  computeDegreeClass(cgpa: number): string {
    if (cgpa >= 4.5) return 'First Class';
    if (cgpa >= 3.5) return 'Second Class Upper';
    if (cgpa >= 2.4) return 'Second Class Lower';
    if (cgpa >= 1.5) return 'Third Class';
    return 'Pass';
  }

  async getAcademicSummary(studentId: string) {
    const cgpa = await this.computeCGPA(studentId);
    const degreeClass = this.computeDegreeClass(cgpa);

    const results = await prisma.result.findMany({
      where: { studentId, isSuperseded: false },
      include: { course: true, session: true },
      orderBy: [{ session: { label: 'asc' } }, { session: { semester: 'asc' } }],
    });

    type Group = {
      sessionLabel: string;
      semester: string;
      results: typeof results;
      gpa: number;
    };
    const grouped: Record<string, Group> = {};

    for (const r of results) {
      const key = `${r.session.label}-${r.session.semester}`;
      if (!grouped[key]) {
        grouped[key] = {
          sessionLabel: r.session.label,
          semester: r.session.semester,
          results: [] as typeof results,
          gpa: 0,
        };
      }
      grouped[key].results.push(r);
    }

    for (const g of Object.values(grouped)) {
      const totalWeighted = g.results.reduce(
        (s, r) => s + Number(r.gradePoint) * r.course.creditUnits,
        0
      );
      const totalUnits = g.results.reduce((s, r) => s + r.course.creditUnits, 0);
      g.gpa = totalUnits > 0 ? Math.round((totalWeighted / totalUnits) * 100) / 100 : 0;
    }

    return {
      cgpa,
      degreeClass,
      sessions: Object.values(grouped),
      totalResults: results.length,
    };
  }
}

export const gpaService = new GPAService();
