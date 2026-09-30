import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '../config/prisma';
import { gpaService } from './gpa.service';
import { cryptoService } from './crypto.service';
import { storageService } from './storage.service';
import { auditService } from './audit.service';
import { generateUniqueVerificationToken } from './document.service';
import { env } from '../config/env';
import { AppError, NotFoundError } from '../utils/errors';
import crypto from 'crypto';

export class TranscriptService {
  /**
   * Generate, store, sign and issue a transcript for a student, and lock
   * their results. The student must belong to `institutionId`, so one
   * institution's admin can never issue documents for another's students.
   */
  async issueTranscript(params: {
    studentId: string;
    institutionId: string;
    actor: { id: string; role: string };
    ipAddress?: string;
  }) {
    const { studentId, institutionId, actor, ipAddress } = params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, institutionId },
      select: { id: true },
    });
    if (!student) throw new NotFoundError('Student');

    const buffer = await this.generateTranscriptPdf(studentId);
    const hash = cryptoService.hashFile(buffer);

    const duplicate = await prisma.document.findFirst({
      where: { sha256Hash: hash, studentId },
    });
    if (duplicate) {
      throw new AppError(
        'An identical transcript already exists for this student.',
        409,
        'DUPLICATE_TRANSCRIPT'
      );
    }

    const documentId = crypto.randomUUID();
    const filePath = await storageService.uploadFile(
      institutionId,
      studentId,
      documentId,
      'transcript.pdf',
      buffer,
      'application/pdf'
    );
    const signature = cryptoService.signHash(hash);
    const verificationToken = await generateUniqueVerificationToken();
    const qrCodeBase64 = await cryptoService.generateQRCode(
      `${env.FRONTEND_URL}/verify?token=${verificationToken}`
    );

    const document = await prisma.document.create({
      data: {
        id: documentId,
        studentId,
        institutionId,
        uploadedBy: actor.id,
        approvedBy: actor.id,
        documentType: 'transcript',
        status: 'approved',
        filePath,
        fileName: 'transcript.pdf',
        fileSizeBytes: buffer.length,
        mimeType: 'application/pdf',
        sha256Hash: hash,
        signature,
        signedAt: new Date(),
        verificationToken,
        qrCodeBase64,
      },
    });

    await prisma.result.updateMany({
      where: { studentId, isLocked: false },
      data: { isLocked: true, lockedAt: new Date() },
    });

    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'TRANSCRIPT_GENERATED',
      severity: 'info',
      targetType: 'Document',
      targetId: documentId,
      ipAddress,
    });

    return document;
  }

  /**
   * Generate a PDF transcript for a student. Returns the PDF as a Buffer.
   * The caller is responsible for storing the file and creating a Document
   * record (typically of type 'transcript').
   */
  async generateTranscriptPdf(studentId: string): Promise<Buffer> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { institution: true, department: true },
    });
    if (!student) throw new NotFoundError('Student');

    const summary = await gpaService.getAcademicSummary(studentId);

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let page = pdf.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    let y = height - 60;

    const drawText = (
      text: string,
      x: number,
      yPos: number,
      opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}
    ) => {
      page.drawText(text, {
        x,
        y: yPos,
        size: opts.size ?? 11,
        font: opts.bold ? fontBold : font,
        color: rgb(...(opts.color ?? [0, 0, 0])),
      });
    };

    // Header
    drawText(student.institution.name.toUpperCase(), 50, y, { size: 16, bold: true });
    y -= 18;
    drawText('Official Academic Transcript', 50, y, { size: 12 });
    y -= 30;

    // Student info
    drawText(`Name: ${student.fullName}`, 50, y, { bold: true });
    drawText(`Matric No: ${student.matricNumber}`, 320, y, { bold: true });
    y -= 16;
    drawText(`Department: ${student.department.name}`, 50, y);
    drawText(`Programme: ${student.programme ?? '—'}`, 320, y);
    y -= 16;
    drawText(`Admission Year: ${student.admissionYear ?? '—'}`, 50, y);
    drawText(`Graduation Year: ${student.graduationYear ?? '—'}`, 320, y);
    y -= 28;

    // Sessions
    for (const session of summary.sessions) {
      if (y < 120) {
        page = pdf.addPage([595, 842]);
        y = height - 60;
      }
      drawText(`${session.sessionLabel} — ${session.semester} semester`, 50, y, {
        bold: true,
        size: 12,
      });
      y -= 18;

      drawText('Code', 50, y, { bold: true, size: 10 });
      drawText('Title', 130, y, { bold: true, size: 10 });
      drawText('Units', 380, y, { bold: true, size: 10 });
      drawText('Grade', 430, y, { bold: true, size: 10 });
      drawText('Points', 490, y, { bold: true, size: 10 });
      y -= 14;

      for (const r of session.results) {
        if (y < 80) {
          page = pdf.addPage([595, 842]);
          y = height - 60;
        }
        drawText(r.course.code, 50, y, { size: 10 });
        drawText(r.course.title.slice(0, 38), 130, y, { size: 10 });
        drawText(String(r.course.creditUnits), 380, y, { size: 10 });
        drawText(r.grade, 430, y, { size: 10 });
        drawText(String(Number(r.gradePoint).toFixed(1)), 490, y, { size: 10 });
        y -= 12;
      }

      y -= 6;
      drawText(`Semester GPA: ${session.gpa.toFixed(2)}`, 380, y, { bold: true, size: 10 });
      y -= 22;
    }

    // Footer summary
    if (y < 100) {
      page = pdf.addPage([595, 842]);
      y = height - 60;
    }
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 18;
    drawText(`CGPA: ${summary.cgpa.toFixed(2)}`, 50, y, { bold: true, size: 12 });
    drawText(`Class of Degree: ${summary.degreeClass}`, 250, y, { bold: true, size: 12 });
    y -= 18;
    drawText(`Generated: ${new Date().toISOString()}`, 50, y, { size: 9 });

    const bytes = await pdf.save();
    return Buffer.from(bytes);
  }
}

export const transcriptService = new TranscriptService();
