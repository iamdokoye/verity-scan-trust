import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Use service role to create Supabase auth users
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ADMIN_EMAIL    = 'admin@votta.demo';
const ADMIN_PASSWORD = 'VottaDemo2024!';

async function main() {
  console.log('🌱 Seeding Votta demo data...\n');

  // ── 1. Institution ──────────────────────────────────────────────────────────
  const institution = await prisma.institution.upsert({
    where:  { adminEmail: ADMIN_EMAIL },
    update: {},
    create: {
      name:       'Federal University of Technology, Demo',
      acronym:    'FUTD',
      state:      'Lagos',
      adminEmail: ADMIN_EMAIL,
    },
  });
  console.log('✓ Institution:', institution.name);

  // ── 2. Admin Supabase auth user ─────────────────────────────────────────────
  // Try to create; if already exists, look it up instead.
  let adminUserId: string;

  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email:          ADMIN_EMAIL,
      password:       ADMIN_PASSWORD,
      email_confirm:  true,
    });

  if (createError) {
    // User already exists — fetch them and reset the demo credentials.
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData?.users.find((u) => u.email === ADMIN_EMAIL);
    if (!existing) throw new Error(`Could not create or find admin user: ${createError.message}`);
    adminUserId = existing.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(adminUserId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        institution_id: institution.id,
        full_name: 'Dr. F. Adeyemi',
      },
    });
    if (updateError) throw new Error(`Could not reset admin user: ${updateError.message}`);
    console.log('✓ Admin user (existing):', ADMIN_EMAIL);
  } else {
    adminUserId = createData.user!.id;
    console.log('✓ Admin user (created):', ADMIN_EMAIL, '/ password:', ADMIN_PASSWORD);
  }

  // ── 3. Admin Profile ────────────────────────────────────────────────────────
  await prisma.profile.upsert({
    where:  { id: adminUserId },
    update: {
      institutionId: institution.id,
      role:          'admin',
      fullName:      'Dr. F. Adeyemi',
      email:         ADMIN_EMAIL,
    },
    create: {
      id:            adminUserId,
      institutionId: institution.id,
      role:          'admin',
      fullName:      'Dr. F. Adeyemi',
      email:         ADMIN_EMAIL,
    },
  });
  console.log('✓ Admin profile linked\n');

  // ── 4. Faculties ────────────────────────────────────────────────────────────
  const facultyDefs = [
    { name: 'Faculty of Science', code: 'SCI' },
    { name: 'Faculty of Engineering', code: 'ENG' },
    { name: 'Faculty of Communication', code: 'COM' },
  ];

  const faculties: Record<string, string> = {};
  for (const f of facultyDefs) {
    const faculty = await prisma.faculty.upsert({
      where: { institutionId_name: { institutionId: institution.id, name: f.name } },
      update: { code: f.code },
      create: { institutionId: institution.id, ...f },
    });
    faculties[f.name] = faculty.id;
    console.log(`✓ Faculty: ${f.name}`);
  }
  console.log('');

  // ── 5. Departments ──────────────────────────────────────────────────────────
  const deptDefs = [
    { name: 'Computer Science', faculty: 'Faculty of Science', hodName: 'Prof. A. Okonkwo' },
    { name: 'Electrical Engineering', faculty: 'Faculty of Engineering', hodName: 'Dr. K. Bello' },
    { name: 'Mass Communication', faculty: 'Faculty of Communication', hodName: 'Mrs. T. Adesanya' },
  ];

  const departments: Record<string, string> = {};
  for (const d of deptDefs) {
    const dept = await prisma.department.upsert({
      where:  { institutionId_name: { institutionId: institution.id, name: d.name } },
      update: { facultyId: faculties[d.faculty], hodName: d.hodName },
      create: {
        institutionId: institution.id,
        facultyId: faculties[d.faculty],
        name: d.name,
        hodName: d.hodName,
      },
    });
    departments[d.name] = dept.id;
    console.log(`✓ Department: ${d.name}`);
  }

  // ── 6. Academic Sessions ────────────────────────────────────────────────────
  const sessionDefs = [
    { label: '2021/2022', semester: 'first'  as const },
    { label: '2021/2022', semester: 'second' as const },
    { label: '2022/2023', semester: 'first'  as const },
    { label: '2022/2023', semester: 'second' as const },
    { label: '2023/2024', semester: 'first'  as const },
    { label: '2023/2024', semester: 'second' as const, isActive: true },
  ];

  const sessions: Record<string, string> = {};
  for (const s of sessionDefs) {
    const sess = await prisma.academicSession.upsert({
      where: {
        institutionId_label_semester: {
          institutionId: institution.id,
          label:         s.label,
          semester:      s.semester,
        },
      },
      update: {},
      create: {
        institutionId: institution.id,
        label:         s.label,
        semester:      s.semester,
        isActive:      s.isActive ?? false,
      },
    });
    sessions[`${s.label}-${s.semester}`] = sess.id;
  }
  console.log(`✓ ${sessionDefs.length} academic sessions\n`);

  // ── 7. Courses ──────────────────────────────────────────────────────────────
  const csDeptId = departments['Computer Science'];
  const courseDefs = [
    { code: 'CSC101', title: 'Introduction to Computer Science', creditUnits: 3 },
    { code: 'CSC201', title: 'Data Structures',                  creditUnits: 3 },
    { code: 'CSC301', title: 'Algorithms',                       creditUnits: 3 },
    { code: 'CSC302', title: 'Database Systems',                 creditUnits: 3 },
    { code: 'CSC401', title: 'Software Engineering I',           creditUnits: 3 },
    { code: 'CSC402', title: 'Operating Systems',                creditUnits: 3 },
    { code: 'MTH101', title: 'Calculus I',                       creditUnits: 3 },
  ];

  const courses: Record<string, string> = {};
  for (const c of courseDefs) {
    const course = await prisma.course.upsert({
      where:  { departmentId_code: { departmentId: csDeptId, code: c.code } },
      update: {},
      create: { departmentId: csDeptId, ...c },
    });
    courses[c.code] = course.id;
  }
  console.log(`✓ ${courseDefs.length} courses\n`);

  // ── 8. Students ─────────────────────────────────────────────────────────────
  const studentDefs = [
    { matric: 'CSC/2020/001', name: 'Ada Okonkwo',        dept: 'Computer Science', prog: 'B.Sc. Computer Science'       },
    { matric: 'CSC/2020/002', name: 'Tunde Bello',         dept: 'Computer Science', prog: 'B.Sc. Computer Science'       },
    { matric: 'CSC/2020/003', name: 'Chiamaka Eze',        dept: 'Computer Science', prog: 'B.Sc. Computer Science'       },
    { matric: 'CSC/2020/004', name: 'Emeka Nwosu',         dept: 'Computer Science', prog: 'B.Sc. Computer Science'       },
    { matric: 'CSC/2020/005', name: 'Fatimah Lawal',       dept: 'Computer Science', prog: 'B.Sc. Computer Science'       },
    { matric: 'CSC/2021/001', name: 'Ibrahim Sani Musa',   dept: 'Computer Science', prog: 'B.Sc. Computer Science'       },
    { matric: 'CSC/2021/002', name: 'Ngozi Adeyemi',       dept: 'Computer Science', prog: 'B.Sc. Computer Science'       },
    { matric: 'EEE/2020/001', name: 'Seun Akinyele',       dept: 'Electrical Engineering', prog: 'B.Eng. Electrical Engineering' },
    { matric: 'EEE/2020/002', name: 'Amaka Okafor',        dept: 'Electrical Engineering', prog: 'B.Eng. Electrical Engineering' },
    { matric: 'MCM/2020/001', name: 'Funmilayo Adesanya',  dept: 'Mass Communication', prog: 'B.Sc. Mass Communication'   },
  ];

  const studentIds: string[] = [];
  for (const s of studentDefs) {
    const student = await prisma.student.upsert({
      where: {
        institutionId_matricNumber: {
          institutionId: institution.id,
          matricNumber:  s.matric,
        },
      },
      update: {},
      create: {
        institutionId:  institution.id,
        departmentId:   departments[s.dept],
        matricNumber:   s.matric,
        fullName:       s.name,
        programme:      s.prog,
        admissionYear:  parseInt(s.matric.split('/')[1]),
        graduationYear: parseInt(s.matric.split('/')[1]) + 4,
        createdBy:      adminUserId,
      },
    });
    studentIds.push(student.id);
  }
  console.log(`✓ ${studentDefs.length} students\n`);

  // ── 9. Results for first 3 CS students ─────────────────────────────────────
  // Seed enough results to demonstrate CGPA computation
  const gradeTable: Record<string, { grade: string; point: number }[]> = {
    [studentIds[0]]: [
      { grade: 'A', point: 5 }, { grade: 'A', point: 5 },
      { grade: 'B', point: 4 }, { grade: 'A', point: 5 },
    ],
    [studentIds[1]]: [
      { grade: 'B', point: 4 }, { grade: 'B', point: 4 },
      { grade: 'C', point: 3 }, { grade: 'B', point: 4 },
    ],
    [studentIds[2]]: [
      { grade: 'A', point: 5 }, { grade: 'B', point: 4 },
      { grade: 'A', point: 5 }, { grade: 'A', point: 5 },
    ],
  };

  const sessionId = sessions['2023/2024-second'];
  const courseIds = Object.values(courses).slice(0, 4);

  let resultCount = 0;
  for (const [studentId, grades] of Object.entries(gradeTable)) {
    for (let i = 0; i < courseIds.length; i++) {
      await prisma.result.upsert({
        where: {
          studentId_sessionId_courseId: {
            studentId,
            sessionId,
            courseId: courseIds[i],
          },
        },
        update: {},
        create: {
          studentId,
          sessionId,
          courseId:   courseIds[i],
          grade:      grades[i].grade,
          gradePoint: grades[i].point,
          uploadedBy: adminUserId,
        },
      });
      resultCount++;
    }
  }
  console.log(`✓ ${resultCount} results seeded\n`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════');
  console.log('Seed complete. Login credentials:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
