import * as XLSX from 'xlsx';

export type StudentRosterEntry = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId?: string | null;
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const findHeaderIndex = (headers: string[], aliases: string[]) =>
  headers.findIndex(header => aliases.includes(header));

const createEntryId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const createEmptyStudentEntry = (): StudentRosterEntry => ({
  id: createEntryId(),
  firstName: '',
  lastName: '',
  email: '',
  studentId: null,
});

export const mergeStudentRosterEntries = (
  current: StudentRosterEntry[],
  incoming: StudentRosterEntry[]
) => {
  const merged = [...current];
  const indexByEmail = new Map(
    current.map((student, index) => [student.email.trim().toLowerCase(), index])
  );

  incoming.forEach(student => {
    const email = student.email.trim().toLowerCase();
    if (!email) return;

    const existingIndex = indexByEmail.get(email);

    if (existingIndex === undefined) {
      merged.push(student);
      indexByEmail.set(email, merged.length - 1);
      return;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      firstName: student.firstName || existing.firstName,
      lastName: student.lastName || existing.lastName,
      email: student.email || existing.email,
      studentId: existing.studentId ?? student.studentId ?? null,
    };
  });

  return merged;
};

export const parseStudentRosterFile = async (
  file: File
): Promise<StudentRosterEntry[]> => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!firstSheet) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(cell => normalizeHeader(String(cell ?? '')));
  const emailIndex = findHeaderIndex(headers, ['email', 'emailaddress', 'studentemail']);
  const firstNameIndex = findHeaderIndex(headers, ['firstname', 'givenname', 'studentfirstname']);
  const lastNameIndex = findHeaderIndex(headers, ['lastname', 'surname', 'familyname', 'studentlastname']);

  if (emailIndex === -1) {
    return [];
  }

  return rows
    .slice(1)
    .map(row => {
      const email = String(row[emailIndex] ?? '').trim();
      const firstName = firstNameIndex === -1 ? '' : String(row[firstNameIndex] ?? '').trim();
      const lastName = lastNameIndex === -1 ? '' : String(row[lastNameIndex] ?? '').trim();

      return {
        id: createEntryId(),
        firstName,
        lastName,
        email,
        studentId: null,
      };
    })
    .filter(student => isValidEmail(student.email));
};
