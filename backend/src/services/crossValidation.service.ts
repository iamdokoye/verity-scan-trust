import { prisma } from '../config/prisma';
import { gpaService } from './gpa.service';
import { SecurityError } from '../utils/errors';

export class CrossValidationService {
  async validateCertificate(
    studentId: string,
    declaredDegreeClass?: string,
    declaredProgramme?: string,
    declaredGraduationYear?: number
  ): Promise<void> {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new SecurityError('Student record not found');

    const cgpa = await gpaService.computeCGPA(studentId);
    const computedClass = gpaService.computeDegreeClass(cgpa);

    if (
      declaredDegreeClass &&
      declaredDegreeClass.toLowerCase() !== computedClass.toLowerCase()
    ) {
      throw new SecurityError(
        `Certificate upload rejected. Declared degree class "${declaredDegreeClass}" ` +
          `does not match the computed class "${computedClass}" (CGPA: ${cgpa}). ` +
          `This discrepancy has been logged.`
      );
    }

    if (
      declaredProgramme &&
      student.programme &&
      declaredProgramme.toLowerCase() !== student.programme.toLowerCase()
    ) {
      throw new SecurityError(
        `Certificate upload rejected. Declared programme "${declaredProgramme}" ` +
          `does not match the student record "${student.programme}".`
      );
    }

    if (
      declaredGraduationYear &&
      student.graduationYear &&
      declaredGraduationYear !== student.graduationYear
    ) {
      throw new SecurityError(
        `Certificate upload rejected. Declared graduation year ${declaredGraduationYear} ` +
          `does not match the student record ${student.graduationYear}.`
      );
    }
  }
}

export const crossValidationService = new CrossValidationService();
