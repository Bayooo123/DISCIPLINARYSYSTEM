import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding TIDDS database…');

  // ── 1. UNILAG Institution ──────────────────────────────────
  const unilag = await prisma.institution.upsert({
    where:  { slug: 'unilag' },
    update: {},
    create: {
      name:          'University of Lagos',
      slug:          'unilag',
      shortName:     'UNILAG',
      primaryColor:  '#7B1C1C',
      secondaryColor:'#C9930A',
      address:       'University Road, Akoka, Yaba, Lagos, Nigeria',
      website:       'https://unilag.edu.ng',
      contactEmail:  'registrar@unilag.edu.ng',
      contactPhone:  '+234 1 280 2439',
      country:       'Nigeria',
      state:         'Lagos',
      licenceStatus: 'ACTIVE',
      licenceStart:  new Date('2025-01-01'),
      licenceEnd:    new Date('2026-12-31'),
      contractRef:   'TIDDS-UNILAG-2025-001',
      notes:         'Pilot institution. Contract signed Jan 2025.',
    },
  });
  console.log(`Institution: ${unilag.name}`);

  // ── 2. Institution Admin ───────────────────────────────────
  const adminHash = await bcrypt.hash('TIDDSunilag2025!', 12);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@unilag.edu.ng' },
    update: {},
    create: {
      institutionId: unilag.id,
      email:         'admin@unilag.edu.ng',
      passwordHash:  adminHash,
      firstName:     'Adaobi',
      lastName:      'Okonkwo',
      role:          'INSTITUTION_ADMIN',
      department:    'Registry',
      jobTitle:      'Registrar',
      isActive:      true,
      inviteAccepted: true,
    },
  });
  console.log(`Admin: ${admin.firstName} ${admin.lastName}`);

  // ── 3. Sample staff (with pending invites) ─────────────────
  const staffData = [
    { firstName: 'Chukwuemeka', lastName: 'Okafor',  email: 'c.okafor@unilag.edu.ng',   role: 'COMMITTEE_MEMBER',   department: 'Faculty of Law',        jobTitle: 'Professor of Law' },
    { firstName: 'Ngozi',       lastName: 'Adeyemi',  email: 'n.adeyemi@unilag.edu.ng',   role: 'COMMITTEE_MEMBER',   department: 'Student Affairs',       jobTitle: 'Dean of Students' },
    { firstName: 'Babatunde',   lastName: 'Fashola',  email: 'b.fashola@unilag.edu.ng',   role: 'PANEL_MEMBER',       department: 'Faculty of Engineering', jobTitle: 'Associate Professor' },
    { firstName: 'Amaka',       lastName: 'Nwosu',    email: 'a.nwosu@unilag.edu.ng',     role: 'COMPLAINTS_OFFICER', department: 'Student Affairs',       jobTitle: 'Student Welfare Officer' },
    { firstName: 'Emeka',       lastName: 'Chibuike', email: 'e.chibuike@unilag.edu.ng',  role: 'PANEL_MEMBER',       department: 'Faculty of Arts',       jobTitle: 'Senior Lecturer' },
  ];

  for (const s of staffData) {
    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const ph     = await bcrypt.hash('TempPass123!', 12);
    await prisma.user.upsert({
      where:  { email: s.email },
      update: {},
      create: {
        institutionId: unilag.id,
        ...s,
        passwordHash:  ph,
        inviteToken:   token,
        inviteExpiry:  expiry,
        inviteAccepted: false,
      },
    });
    console.log(`Staff: ${s.firstName} ${s.lastName} (${s.role})`);
  }

  // ── 4. Offence Types ──────────────────────────────────────
  const offenceTypes = [
    // Academic
    { category: 'Academic', name: 'Examination Malpractice',      description: 'Any form of cheating or dishonesty during university examinations' },
    { category: 'Academic', name: 'Academic Dishonesty / Plagiarism', description: 'Submitting the work of another as one\'s own, including plagiarism' },
    // Conduct
    { category: 'Conduct', name: 'Physical Misconduct / Assault', description: 'Any physical altercation or threat of physical harm to another person' },
    { category: 'Conduct', name: 'Sexual Harassment',             description: 'Unwelcome sexual advances, requests for sexual favours, or other sexual conduct' },
    { category: 'Conduct', name: 'Threat / Intimidation',         description: 'Any verbal or written threat or intimidation of staff, students or visitors' },
    { category: 'Conduct', name: 'Drug / Substance Abuse',        description: 'Possession, use or distribution of prohibited substances on campus' },
    // Hostel
    { category: 'Hostel', name: 'Hostel Regulation Breach',      description: 'Violation of any university hostel regulation or policy' },
    { category: 'Hostel', name: 'Destruction of Property',        description: 'Wilful damage or destruction of university or personal property' },
    // General
    { category: 'General', name: 'General Misconduct',            description: 'Any conduct deemed contrary to the values and rules of the university' },
  ];

  for (const ot of offenceTypes) {
    const existing = await prisma.offenceType.findFirst({
      where: { institutionId: unilag.id, name: ot.name },
    });
    if (!existing) {
      await prisma.offenceType.create({ data: { institutionId: unilag.id, ...ot } });
    }
    console.log(`Offence type: ${ot.name}`);
  }

  // ── 5. Sample Students ────────────────────────────────────
  const students = [
    { matricNumber: 'LAW/2022/087', firstName: 'Oluwaseun',    lastName: 'Adeleke',   email: 'o.adeleke.187@unilag.edu.ng',    faculty: 'Faculty of Law',        level: '300L' },
    { matricNumber: 'ENG/2021/043', firstName: 'Chidera',      lastName: 'Okonkwo',   email: 'c.okonkwo.943@unilag.edu.ng',   faculty: 'Faculty of Engineering', level: '400L' },
    { matricNumber: 'SOC/2023/112', firstName: 'Aminat',       lastName: 'Balogun',   email: 'a.balogun.112@unilag.edu.ng',   faculty: 'Faculty of Social Sci',  level: '200L' },
    { matricNumber: 'MED/2020/009', firstName: 'Chukwudi',     lastName: 'Nwachukwu', email: 'c.nwachukwu.9@unilag.edu.ng',  faculty: 'College of Medicine',    level: '500L' },
    { matricNumber: 'ART/2022/076', firstName: 'Fatimah',      lastName: 'Adesanya',  email: 'f.adesanya.76@unilag.edu.ng',  faculty: 'Faculty of Arts',        level: '300L' },
    { matricNumber: 'BUS/2023/204', firstName: 'Emeka',        lastName: 'Eze',       email: 'e.eze.204@unilag.edu.ng',       faculty: 'Faculty of Business',    level: '200L' },
    { matricNumber: 'SCI/2021/055', firstName: 'Ngozi',        lastName: 'Obiora',    email: 'n.obiora.55@unilag.edu.ng',    faculty: 'Faculty of Science',     level: '400L' },
    { matricNumber: 'LAW/2023/031', firstName: 'Adewale',      lastName: 'Ogunleye',  email: 'a.ogunleye.31@unilag.edu.ng',  faculty: 'Faculty of Law',         level: '200L' },
    { matricNumber: 'ENG/2022/098', firstName: 'Blessing',     lastName: 'Nwosu',     email: 'b.nwosu.98@unilag.edu.ng',     faculty: 'Faculty of Engineering', level: '300L' },
    { matricNumber: 'ENV/2021/062', firstName: 'Tunde',        lastName: 'Adebisi',   email: 't.adebisi.62@unilag.edu.ng',   faculty: 'Faculty of Env. Sci',    level: '400L' },
  ];

  for (const s of students) {
    const existing = await prisma.student.findUnique({ where: { matricNumber: s.matricNumber } });
    if (!existing) {
      await prisma.student.create({ data: { institutionId: unilag.id, ...s, department: s.faculty } });
    }
    console.log(`Student: ${s.firstName} ${s.lastName} (${s.matricNumber})`);
  }

  // ── 6. System Log Entries ──────────────────────────────────
  const now = new Date();
  const logs = [
    { level: 'INFO',    category: 'EMAIL',       message: 'Invitation email sent to c.okafor@unilag.edu.ng',       createdAt: new Date(now - 1 * 86400000) },
    { level: 'INFO',    category: 'EMAIL',       message: 'Invitation email sent to n.adeyemi@unilag.edu.ng',      createdAt: new Date(now - 2 * 86400000) },
    { level: 'INFO',    category: 'EMAIL',       message: 'Invitation email sent to a.nwosu@unilag.edu.ng',        createdAt: new Date(now - 2 * 86400000) },
    { level: 'INFO',    category: 'EMAIL',       message: 'Invitation email sent to b.fashola@unilag.edu.ng',      createdAt: new Date(now - 3 * 86400000) },
    { level: 'INFO',    category: 'SYSTEM',      message: 'Institution UNILAG configuration updated',              createdAt: new Date(now - 4 * 86400000) },
    { level: 'WARNING', category: 'SMS',         message: 'SMS delivery delayed — Termii gateway timeout',         createdAt: new Date(now - 1 * 86400000) },
    { level: 'WARNING', category: 'SMS',         message: 'SMS retry succeeded after 2 attempts',                  createdAt: new Date(now - 1 * 86400000) },
    { level: 'ERROR',   category: 'INTEGRATION', message: 'SIS API connection timeout — sisApiUrl unreachable',    createdAt: new Date(now - 3 * 86400000) },
  ];

  for (const log of logs) {
    await prisma.systemLog.create({ data: { institutionId: unilag.id, ...log } });
  }
  console.log(`Created ${logs.length} system log entries`);

  console.log('\n✓ Seeding complete.\n');
  console.log('Default credentials:');
  console.log('  Reforma Admin:      admin@reformadigital.com / (from REFORMA_ADMIN_PASSWORD env var)');
  console.log('  Institution Admin:  admin@unilag.edu.ng / TIDDSunilag2025!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
