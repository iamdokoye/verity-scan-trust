import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const institution = await prisma.institution.upsert({
    where: { adminEmail: 'admin@votta.demo' },
    update: {},
    create: {
      name: 'Federal University of Technology, Demo',
      acronym: 'FUTD',
      state: 'Lagos',
      adminEmail: 'admin@votta.demo',
    },
  });

  const dept = await prisma.department.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: 'Computer Science' } },
    update: {},
    create: {
      institutionId: institution.id,
      name: 'Computer Science',
      hodName: 'Prof. A. Demo',
    },
  });

  const session = await prisma.academicSession.upsert({
    where: {
      institutionId_label_semester: {
        institutionId: institution.id,
        label: '2023/2024',
        semester: 'first',
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      label: '2023/2024',
      semester: 'first',
      isActive: true,
    },
  });

  const course = await prisma.course.upsert({
    where: { departmentId_code: { departmentId: dept.id, code: 'CSC101' } },
    update: {},
    create: {
      departmentId: dept.id,
      code: 'CSC101',
      title: 'Introduction to Computer Science',
      creditUnits: 3,
    },
  });

  const students = [
    { matric: 'CSC/2020/001', name: 'Ada Okonkwo' },
    { matric: 'CSC/2020/002', name: 'Tunde Bello' },
    { matric: 'CSC/2020/003', name: 'Chiamaka Eze' },
  ];

  for (const s of students) {
    await prisma.student.upsert({
      where: {
        institutionId_matricNumber: {
          institutionId: institution.id,
          matricNumber: s.matric,
        },
      },
      update: {},
      create: {
        institutionId: institution.id,
        departmentId: dept.id,
        matricNumber: s.matric,
        fullName: s.name,
        programme: 'B.Sc. Computer Science',
        admissionYear: 2020,
        graduationYear: 2024,
      },
    });
  }

  console.log('✓ Seeded institution:', institution.name);
  console.log('✓ Seeded department:', dept.name);
  console.log('✓ Seeded session:', session.label, session.semester);
  console.log('✓ Seeded course:', course.code);
  console.log('✓ Seeded', students.length, 'students');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
