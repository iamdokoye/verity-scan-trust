export const INSTITUTION = "University of Lagos";

export const verifiedDocument = {
  studentName: "Adebayo Olumide Johnson",
  matricNumber: "190201023",
  institution: INSTITUTION,
  documentType: "Degree Certificate",
  programme: "B.Sc. Computer Science",
  dateOfIssue: "12 October 2024",
  issuedBy: "Office of the Registrar",
  verifiedAt: "Verified now",
  hash: "a3f9c2e8b41d7c0f5a92",
  token: "VTA-7K3M-9P2Q-XR4N",
};

export const student = {
  firstName: "Adebayo",
  fullName: "Adebayo Olumide Johnson",
  matric: "190201023",
  department: "Department of Computer Science",
  programme: "B.Sc. Computer Science",
  admissionYear: 2019,
  graduationYear: 2024,
  cgpa: 4.21,
  degreeClass: "First Class",
  institution: INSTITUTION,
};

export const documents = [
  { id: "1", type: "Degree Certificate", title: "B.Sc. Degree Certificate", date: "12 Oct 2024", status: "verified", hash: "a3f9c2e8b41d", token: "VTA-7K3M-9P2Q-XR4N" },
  { id: "2", type: "Transcript", title: "Official Academic Transcript", date: "08 Oct 2024", status: "verified", hash: "b71e0d4a8c93", token: "VTA-3J9L-2N4R-PT8K" },
  { id: "3", type: "Result", title: "2023/2024 Second Semester Result", date: "20 Aug 2024", status: "verified", hash: "f24a91c7b08e", token: "VTA-5M7P-1Q3R-LV6Z" },
  { id: "4", type: "Result", title: "2023/2024 First Semester Result", date: "15 Feb 2024", status: "verified", hash: "9c1d4e7a02b8", token: "VTA-8B2K-4F6L-MN3P" },
];

export const semesters = [
  {
    label: "2023/2024 — Second Semester",
    gpa: 4.45,
    courses: [
      { code: "CSC 402", title: "Software Engineering II", units: 3, grade: "A", point: 5 },
      { code: "CSC 404", title: "Operating Systems", units: 3, grade: "A", point: 5 },
      { code: "CSC 406", title: "Computer Networks", units: 3, grade: "B", point: 4 },
      { code: "CSC 408", title: "Artificial Intelligence", units: 3, grade: "A", point: 5 },
      { code: "GST 402", title: "Entrepreneurship", units: 2, grade: "A", point: 5 },
    ],
  },
  {
    label: "2023/2024 — First Semester",
    gpa: 4.30,
    courses: [
      { code: "CSC 401", title: "Software Engineering I", units: 3, grade: "A", point: 5 },
      { code: "CSC 403", title: "Database Systems", units: 3, grade: "B", point: 4 },
      { code: "CSC 405", title: "Computer Architecture", units: 3, grade: "A", point: 5 },
      { code: "MTH 401", title: "Numerical Analysis", units: 3, grade: "B", point: 4 },
    ],
  },
  {
    label: "2022/2023 — Second Semester",
    gpa: 4.10,
    courses: [
      { code: "CSC 302", title: "Algorithms", units: 3, grade: "A", point: 5 },
      { code: "CSC 304", title: "Web Technologies", units: 3, grade: "B", point: 4 },
      { code: "CSC 306", title: "Data Structures II", units: 3, grade: "A", point: 5 },
    ],
  },
];

export const auditLog = [
  { ts: "2024-10-12 14:32:11", actor: "Dr. F. Adeyemi", role: "Registrar", action: "Document Upload", target: "Degree Certificate — 190201023", ip: "10.0.4.21" },
  { ts: "2024-10-12 13:08:44", actor: "Public Verifier", role: "Public", action: "Verification", target: "VTA-7K3M-9P2Q-XR4N", ip: "102.89.32.14" },
  { ts: "2024-10-12 11:21:09", actor: "Mrs. K. Bello", role: "Faculty Officer", action: "Result Entry", target: "2023/2024 — 190201023", ip: "10.0.4.18" },
  { ts: "2024-10-12 10:14:55", actor: "Dr. F. Adeyemi", role: "Registrar", action: "Login", target: "Admin Portal", ip: "10.0.4.21" },
  { ts: "2024-10-11 17:45:02", actor: "Public Verifier", role: "Public", action: "Verification", target: "VTA-3J9L-2N4R-PT8K", ip: "197.210.45.88" },
  { ts: "2024-10-11 16:02:38", actor: "Unknown", role: "Public", action: "Failed Attempt", target: "INVALID-TOKEN", ip: "41.58.10.2" },
  { ts: "2024-10-11 09:12:14", actor: "Mr. C. Okeke", role: "Faculty Officer", action: "Document Upload", target: "Transcript — 190201019", ip: "10.0.4.32" },
];

export const adminStats = {
  totalStudents: 12482,
  totalDocuments: 41209,
  verificationsToday: 187,
  pendingUploads: 14,
};

export const studentList = [
  { matric: "190201023", name: "Adebayo Olumide Johnson", dept: "Computer Science", year: 2019, cgpa: 4.21 },
  { matric: "190201019", name: "Chiamaka Nwosu", dept: "Computer Science", year: 2019, cgpa: 4.55 },
  { matric: "190301044", name: "Ibrahim Sani Musa", dept: "Electrical Engineering", year: 2019, cgpa: 3.88 },
  { matric: "200201007", name: "Funmilayo Adesanya", dept: "Computer Science", year: 2020, cgpa: 4.02 },
  { matric: "200401012", name: "Tunde Akinyemi", dept: "Mass Communication", year: 2020, cgpa: 3.71 },
];
