import pkg from '@prisma/client';
const { PrismaClient } = pkg;
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
      name:           'University of Lagos',
      slug:           'unilag',
      shortName:      'UNILAG',
      primaryColor:   '#7B1C1C',
      secondaryColor: '#C9930A',
      address:        'University Road, Akoka, Yaba, Lagos, Nigeria',
      website:        'https://unilag.edu.ng',
      contactEmail:   'registrar@unilag.edu.ng',
      contactPhone:   '+234 1 280 2439',
      country:        'Nigeria',
      state:          'Lagos',
      licenceStatus:  'ACTIVE',
      licenceStart:   new Date('2025-01-01'),
      licenceEnd:     new Date('2026-12-31'),
      contractRef:    'TIDDS-UNILAG-2025-001',
      notes:          'Pilot institution. Contract signed Jan 2025.',
    },
  });
  console.log(`Institution: ${unilag.name}`);

  // ── 2. Institution Admin ───────────────────────────────────
  const adminHash = await bcrypt.hash('TIDDSunilag2025!', 12);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@unilag.edu.ng' },
    update: {},
    create: {
      institutionId:  unilag.id,
      email:          'admin@unilag.edu.ng',
      passwordHash:   adminHash,
      firstName:      'Adaobi',
      lastName:       'Okonkwo',
      role:           'INSTITUTION_ADMIN',
      department:     'Registry',
      jobTitle:       'Registrar',
      isActive:       true,
      inviteAccepted: true,
    },
  });
  console.log(`Admin: ${admin.firstName} ${admin.lastName}`);

  // ── 3. Committee & Panel members ──────────────────────────
  const staffData = [
    { firstName: 'Chukwuemeka', lastName: 'Okafor',   email: 'c.okafor@unilag.edu.ng',    role: 'COMMITTEE_MEMBER',   department: 'Faculty of Law',         jobTitle: 'Professor of Law' },
    { firstName: 'Ngozi',       lastName: 'Adeyemi',   email: 'n.adeyemi@unilag.edu.ng',   role: 'COMMITTEE_MEMBER',   department: 'Student Affairs',        jobTitle: 'Dean of Students' },
    { firstName: 'Babatunde',   lastName: 'Fashola',   email: 'b.fashola@unilag.edu.ng',   role: 'PANEL_MEMBER',       department: 'Faculty of Engineering', jobTitle: 'Associate Professor' },
    { firstName: 'Emeka',       lastName: 'Chibuike',  email: 'e.chibuike@unilag.edu.ng',  role: 'PANEL_MEMBER',       department: 'Faculty of Arts',        jobTitle: 'Senior Lecturer' },
  ];

  for (const s of staffData) {
    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const ph     = await bcrypt.hash('TempPass123!', 12);
    await prisma.user.upsert({
      where:  { email: s.email },
      update: {},
      create: {
        institutionId:  unilag.id,
        ...s,
        passwordHash:   ph,
        inviteToken:    token,
        inviteExpiry:   expiry,
        inviteAccepted: false,
      },
    });
    console.log(`Staff: ${s.firstName} ${s.lastName} (${s.role})`);
  }

  // ── 4. Complaints Officers ─────────────────────────────────
  const officerPass = await bcrypt.hash('Officer2025!', 12);
  const officers = [
    {
      firstName: 'Amaka',       lastName: 'Nwosu',    email: 'a.nwosu@unilag.edu.ng',
      department: 'Faculty of Law',    jobTitle: 'Faculty Complaints Officer',
    },
    {
      firstName: 'Segun',       lastName: 'Adebayo',  email: 's.adebayo@unilag.edu.ng',
      department: 'Student Affairs',   jobTitle: 'Hostel Welfare Officer',
    },
    {
      firstName: 'Uchenna',     lastName: 'Obiora',   email: 'u.obiora@unilag.edu.ng',
      department: 'Registry',          jobTitle: 'Disciplinary Complaints Officer',
    },
  ];

  const officerUsers = {};
  for (const o of officers) {
    const user = await prisma.user.upsert({
      where:  { email: o.email },
      update: {},
      create: {
        institutionId:  unilag.id,
        role:           'COMPLAINTS_OFFICER',
        passwordHash:   officerPass,
        isActive:       true,
        inviteAccepted: true,
        ...o,
      },
    });
    officerUsers[o.email] = user;
    console.log(`Officer: ${o.firstName} ${o.lastName}`);
  }

  // ── 5. Offence Types (44 offences, UNILAG list) ────────────
  await prisma.offenceType.deleteMany({ where: { institutionId: unilag.id } });

  const offenceTypes = [
    // EXAMINATION (12)
    { name: 'Examination Malpractice — Copying',            category: 'EXAMINATION', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Copying from another student or unauthorized material during an examination.' },
    { name: 'Examination Malpractice — Impersonation',      category: 'EXAMINATION', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Having another person sit an examination on one\'s behalf or sitting for another.' },
    { name: 'Possession of Unauthorized Materials in Exam', category: 'EXAMINATION', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Bringing textbooks, notes, or electronic devices into an examination hall without authorization.' },
    { name: 'Leaking or Obtaining Examination Questions',   category: 'EXAMINATION', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Illegally obtaining, distributing, or using leaked examination questions.' },
    { name: 'Collusion in Examination',                     category: 'EXAMINATION', penaltyTier: 'RUSTICATION_2',  defaultPenalty: '2-semester rustication',  description: 'Collaborating with another candidate to commit examination fraud.' },
    { name: 'Submission of Falsified Academic Work',        category: 'EXAMINATION', penaltyTier: 'RUSTICATION_2',  defaultPenalty: '2-semester rustication',  description: 'Submitting forged, falsified, or fabricated academic work or data.' },
    { name: 'Plagiarism',                                   category: 'EXAMINATION', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Presenting the work, ideas, or words of another person as one\'s own without proper attribution.' },
    { name: 'Bribery of Examination Personnel',             category: 'EXAMINATION', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Offering or giving a bribe to any examination official in exchange for academic advantage.' },
    { name: 'Disruption of Examination',                    category: 'EXAMINATION', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Willfully disrupting or obstructing the conduct of an examination.' },
    { name: 'Tampering with Answer Scripts',                category: 'EXAMINATION', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Altering, defacing, or tampering with one\'s own or another student\'s examination script.' },
    { name: 'Contract Cheating',                            category: 'EXAMINATION', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Paying or commissioning a third party to produce academic work submitted as one\'s own.' },
    { name: 'Use of Electronic Device to Cheat',            category: 'EXAMINATION', penaltyTier: 'RUSTICATION_2',  defaultPenalty: '2-semester rustication',  description: 'Using a mobile phone, smartwatch, or any electronic device to cheat in an examination.' },

    // DRUG_RELATED (8)
    { name: 'Possession of Cannabis (Marijuana)',           category: 'DRUG_RELATED', penaltyTier: 'RUSTICATION_2',  defaultPenalty: '2-semester rustication',  description: 'Found in possession of cannabis on university premises.' },
    { name: 'Possession of Hard Drugs',                    category: 'DRUG_RELATED', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Possession of cocaine, heroin, methamphetamine, or other Class A substances on campus.' },
    { name: 'Drug Trafficking on Campus',                  category: 'DRUG_RELATED', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Sale, distribution, or trafficking of any illicit drug on university premises.' },
    { name: 'Alcohol Intoxication on Campus',              category: 'DRUG_RELATED', penaltyTier: 'WARNING',        defaultPenalty: 'Formal warning',          description: 'Appearing visibly intoxicated by alcohol in a university building or during an academic event.' },
    { name: 'Substance Abuse (Prescription Misuse)',       category: 'DRUG_RELATED', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Misuse or sharing of prescription medication for recreational or performance-enhancing purposes.' },
    { name: 'Supply of Alcohol to Minors on Campus',       category: 'DRUG_RELATED', penaltyTier: 'RUSTICATION_2',  defaultPenalty: '2-semester rustication',  description: 'Supplying or facilitating the supply of alcohol to students under the legal drinking age.' },
    { name: 'Smoking in Prohibited Areas',                 category: 'DRUG_RELATED', penaltyTier: 'WARNING',        defaultPenalty: 'Formal warning',          description: 'Smoking tobacco or e-cigarettes in lecture halls, libraries, laboratories, or hostel rooms.' },
    { name: 'Possession of Drug Paraphernalia',            category: 'DRUG_RELATED', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Possession of items used for preparing or consuming illicit drugs on campus.' },

    // SOCIAL_CONDUCT (14)
    { name: 'Physical Assault',                            category: 'SOCIAL_CONDUCT', penaltyTier: 'RUSTICATION_4',  defaultPenalty: '4-semester rustication',  description: 'Intentional physical attack on another student, staff member, or visitor.' },
    { name: 'Sexual Assault',                              category: 'SOCIAL_CONDUCT', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Any form of non-consensual sexual contact or act.' },
    { name: 'Sexual Harassment',                           category: 'SOCIAL_CONDUCT', penaltyTier: 'RUSTICATION_4',  defaultPenalty: '4-semester rustication',  description: 'Unwelcome sexual advances, requests for sexual favours, or other verbal or physical sexual conduct.' },
    { name: 'Bullying and Intimidation',                   category: 'SOCIAL_CONDUCT', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Repeated aggressive behaviour intended to hurt, threaten, or coerce another person.' },
    { name: 'Cultism / Secret Society Membership',        category: 'SOCIAL_CONDUCT', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Membership of, or recruitment into, any secret cult or unlawful society on or off campus.' },
    { name: 'Cultism-Related Violence',                    category: 'SOCIAL_CONDUCT', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Participation in cult clashes, rituals, or gang violence linked to secret societies.' },
    { name: 'Verbal Abuse / Threatening Language',         category: 'SOCIAL_CONDUCT', penaltyTier: 'WARNING',        defaultPenalty: 'Formal warning',          description: 'Use of offensive, threatening, or abusive language toward any member of the university community.' },
    { name: 'Cyberbullying / Online Harassment',           category: 'SOCIAL_CONDUCT', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Harassment, defamation, or intimidation conducted through digital platforms or social media.' },
    { name: 'Indecent Exposure / Public Indecency',        category: 'SOCIAL_CONDUCT', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Any act of public indecency or exposure of one\'s body in a lewd or obscene manner on campus.' },
    { name: 'Theft / Stealing',                            category: 'SOCIAL_CONDUCT', penaltyTier: 'RUSTICATION_2',  defaultPenalty: '2-semester rustication',  description: 'Taking another person\'s property without consent, whether from a student, staff member, or the university.' },
    { name: 'Fraud / Forgery',                             category: 'SOCIAL_CONDUCT', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Forging university documents, signatures, stamps, or results, or fraudulently misrepresenting information.' },
    { name: 'Extortion',                                   category: 'SOCIAL_CONDUCT', penaltyTier: 'RUSTICATION_4',  defaultPenalty: '4-semester rustication',  description: 'Obtaining money or favours from another person through coercion, threats, or fear.' },
    { name: 'Discrimination / Hate Speech',                category: 'SOCIAL_CONDUCT', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Acts or statements that discriminate against or incite hatred toward individuals based on ethnicity, religion, gender, or disability.' },
    { name: 'Unauthorized Recording / Privacy Violation',  category: 'SOCIAL_CONDUCT', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Recording, photographing, or distributing images of individuals without consent in private or restricted settings.' },

    // HOSTEL (6)
    { name: 'Hostel Trespass',                             category: 'HOSTEL', penaltyTier: 'WARNING',        defaultPenalty: 'Formal warning',          description: 'Entering the hostel block of the opposite sex or a hostel to which one is not assigned.' },
    { name: 'Destruction of Hostel Property',              category: 'HOSTEL', penaltyTier: 'PANEL_DECISION', defaultPenalty: 'Restitution + penalty',    description: 'Willful damage or destruction of university property within the hostel premises.' },
    { name: 'Hosting Non-Residents Overnight',             category: 'HOSTEL', penaltyTier: 'WARNING',        defaultPenalty: 'Formal warning',          description: 'Allowing an unauthorized person to spend the night in a hostel room without approval.' },
    { name: 'Running an Illegal Business from Hostel',     category: 'HOSTEL', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Operating an unauthorized commercial enterprise from a hostel room in violation of hall regulations.' },
    { name: 'Noise Pollution / Disturbance of Peace',      category: 'HOSTEL', penaltyTier: 'WARNING',        defaultPenalty: 'Formal warning',          description: 'Creating persistent noise or disturbance that disrupts the study or rest of other hostel residents.' },
    { name: 'Possession of Weapons in Hostel',             category: 'HOSTEL', penaltyTier: 'EXPULSION',      defaultPenalty: 'Expulsion',               description: 'Possession of firearms, knives, or any other offensive weapon within the hostel.' },

    // GENERAL (4)
    { name: 'Vandalism of University Property',            category: 'GENERAL', penaltyTier: 'PANEL_DECISION', defaultPenalty: 'Restitution + penalty',    description: 'Willful damage or defacing of university buildings, equipment, vehicles, or other property.' },
    { name: 'Unauthorized Protest / Campus Disturbance',   category: 'GENERAL', penaltyTier: 'RUSTICATION_1',  defaultPenalty: '1-semester rustication',  description: 'Organizing or participating in an unauthorized protest, rally, or disturbance that disrupts university operations.' },
    { name: 'Misrepresentation of Identity or Status',     category: 'GENERAL', penaltyTier: 'RUSTICATION_2',  defaultPenalty: '2-semester rustication',  description: 'Falsely claiming student status, degree, or identity to gain access, benefits, or privileges from the university.' },
    { name: 'General Misconduct',                          category: 'GENERAL', penaltyTier: 'PANEL_DECISION', defaultPenalty: 'At panel\'s discretion',   description: 'Any conduct deemed injurious to the good name and discipline of the university not covered by other categories.' },
  ];

  const createdOffences = {};
  for (const ot of offenceTypes) {
    const created = await prisma.offenceType.create({ data: { institutionId: unilag.id, ...ot } });
    createdOffences[ot.name] = created;
    console.log(`Offence type: ${ot.name}`);
  }

  // ── 6. Students ────────────────────────────────────────────
  const students = [
    { matricNumber: 'LAW/2022/087', firstName: 'Oluwaseun',  lastName: 'Adeleke',   email: 'o.adeleke.187@unilag.edu.ng',   faculty: 'Faculty of Law',        department: 'Private Law',          level: '300L' },
    { matricNumber: 'ENG/2021/043', firstName: 'Chidera',    lastName: 'Okonkwo',   email: 'c.okonkwo.943@unilag.edu.ng',  faculty: 'Faculty of Engineering', department: 'Electrical Engineering', level: '400L' },
    { matricNumber: 'SOC/2023/112', firstName: 'Aminat',     lastName: 'Balogun',   email: 'a.balogun.112@unilag.edu.ng',  faculty: 'Faculty of Social Sciences', department: 'Sociology',         level: '200L' },
    { matricNumber: 'MED/2020/009', firstName: 'Chukwudi',   lastName: 'Nwachukwu', email: 'c.nwachukwu.9@unilag.edu.ng', faculty: 'College of Medicine',    department: 'Medicine & Surgery',   level: '500L' },
    { matricNumber: 'ART/2022/076', firstName: 'Fatimah',    lastName: 'Adesanya',  email: 'f.adesanya.76@unilag.edu.ng', faculty: 'Faculty of Arts',        department: 'English',              level: '300L' },
    { matricNumber: 'BUS/2023/204', firstName: 'Emeka',      lastName: 'Eze',       email: 'e.eze.204@unilag.edu.ng',      faculty: 'Faculty of Business Admin', department: 'Accounting',        level: '200L' },
    { matricNumber: 'SCI/2021/055', firstName: 'Ngozi',      lastName: 'Obiora',    email: 'n.obiora.55@unilag.edu.ng',   faculty: 'Faculty of Science',     department: 'Chemistry',            level: '400L' },
    { matricNumber: 'LAW/2023/031', firstName: 'Adewale',    lastName: 'Ogunleye',  email: 'a.ogunleye.31@unilag.edu.ng', faculty: 'Faculty of Law',         department: 'Public Law',           level: '200L' },
    { matricNumber: 'ENG/2022/098', firstName: 'Blessing',   lastName: 'Nwosu',     email: 'b.nwosu.98@unilag.edu.ng',    faculty: 'Faculty of Engineering', department: 'Civil Engineering',    level: '300L' },
    { matricNumber: 'ENV/2021/062', firstName: 'Tunde',      lastName: 'Adebisi',   email: 't.adebisi.62@unilag.edu.ng',  faculty: 'Faculty of Environmental Sciences', department: 'Urban Planning', level: '400L' },
  ];

  const createdStudents = {};
  for (const s of students) {
    const existing = await prisma.student.findUnique({ where: { matricNumber: s.matricNumber } });
    const student = existing
      ? existing
      : await prisma.student.create({ data: { institutionId: unilag.id, ...s } });
    createdStudents[s.matricNumber] = student;
    console.log(`Student: ${s.firstName} ${s.lastName} (${s.matricNumber})`);
  }

  // ── 7. Sample Cases ────────────────────────────────────────
  const lawOfficer  = officerUsers['a.nwosu@unilag.edu.ng'];
  const genOfficer  = officerUsers['u.obiora@unilag.edu.ng'];

  const existingCase1 = await prisma.case.findFirst({
    where: { institutionId: unilag.id, referenceNumber: 'DSC-2025-001' },
  });
  if (!existingCase1) {
    const s1 = createdStudents['ENG/2021/043'];
    const c1 = await prisma.case.create({
      data: {
        referenceNumber:  'DSC-2025-001',
        institutionId:    unilag.id,
        studentId:        s1.id,
        filedById:        lawOfficer.id,
        originType:       'FACULTY',
        description:      'Student was observed using a concealed mobile phone during the EEG 412 final examination on 14 November 2025. The phone was confiscated by the invigilator and contained photographs of examination-relevant notes.',
        incidentDate:     new Date('2025-11-14'),
        incidentLocation: 'Main Examination Hall, Faculty of Engineering',
        witnessName:      'Dr. Emeka Obi (Chief Invigilator)',
        courseCode:       'EEG 412',
        courseTitle:      'Advanced Control Systems',
        filedAt:          new Date('2025-11-15T09:30:00Z'),
        responseDeadline: new Date('2025-11-20T23:59:00Z'),
        status:           'RESPONSE_RECEIVED',
        studentResponse:  'I did not intend to cheat. The phone was in my pocket and vibrated. I picked it up reflexively. I understand this looks bad but I was not using it to copy. I am deeply sorry.',
        studentResponseAt: new Date('2025-11-18T14:22:00Z'),
        plea:             'GUILTY',
        offences: {
          create: [
            { offenceTypeId: createdOffences['Use of Electronic Device to Cheat'].id },
            { offenceTypeId: createdOffences['Examination Malpractice — Copying'].id },
          ],
        },
      },
    });
    await prisma.auditLog.createMany({
      data: [
        { caseId: c1.id, actorId: lawOfficer.id, action: 'COMPLAINT_FILED', description: `Complaint filed by Amaka Nwosu (FACULTY) against Chidera Okonkwo (ENG/2021/043). Offences: Use of Electronic Device to Cheat, Examination Malpractice — Copying.`, metadata: { originType: 'FACULTY', courseCode: 'EEG 412' }, timestamp: new Date('2025-11-15T09:30:00Z') },
        { caseId: c1.id, actorId: null, action: 'STUDENT_NOTIFIED_EMAIL', description: 'Complaint notice email sent to c.okonkwo.943@unilag.edu.ng.', timestamp: new Date('2025-11-15T09:31:00Z') },
        { caseId: c1.id, actorId: null, action: 'STUDENT_RESPONSE_RECEIVED', description: 'Student submitted response with plea: GUILTY.', timestamp: new Date('2025-11-18T14:22:00Z') },
      ],
    });
    console.log('Case: DSC-2025-001 (Chidera Okonkwo — RESPONSE_RECEIVED)');
  }

  const existingCase2 = await prisma.case.findFirst({
    where: { institutionId: unilag.id, referenceNumber: 'DSC-2025-002' },
  });
  if (!existingCase2) {
    const s2 = createdStudents['SOC/2023/112'];
    const c2 = await prisma.case.create({
      data: {
        referenceNumber:  'DSC-2025-002',
        institutionId:    unilag.id,
        studentId:        s2.id,
        filedById:        genOfficer.id,
        originType:       'HOSTEL',
        description:      'Student was found in possession of a quantity of cannabis in Moremi Hall Room 214 during a routine inspection on 20 November 2025. Approximately 15g was confiscated. Student initially denied ownership but witness statement from roommate contradicts this.',
        incidentDate:     new Date('2025-11-20'),
        incidentLocation: 'Moremi Hall, Room 214',
        witnessName:      'Hall Warden — Mrs. Grace Adeyinka',
        filedAt:          new Date('2025-11-21T10:00:00Z'),
        responseDeadline: new Date('2025-11-26T23:59:00Z'),
        status:           'AWAITING_RESPONSE',
        offences: {
          create: [
            { offenceTypeId: createdOffences['Possession of Cannabis (Marijuana)'].id },
            { offenceTypeId: createdOffences['Hostel Trespass'].id },
          ],
        },
      },
    });
    await prisma.auditLog.createMany({
      data: [
        { caseId: c2.id, actorId: genOfficer.id, action: 'COMPLAINT_FILED', description: `Complaint filed by Uchenna Obiora (HOSTEL) against Aminat Balogun (SOC/2023/112). Offences: Possession of Cannabis (Marijuana), Hostel Trespass.`, metadata: { originType: 'HOSTEL' }, timestamp: new Date('2025-11-21T10:00:00Z') },
        { caseId: c2.id, actorId: null, action: 'STUDENT_NOTIFIED_EMAIL', description: 'Complaint notice email sent to a.balogun.112@unilag.edu.ng.', timestamp: new Date('2025-11-21T10:01:00Z') },
      ],
    });
    console.log('Case: DSC-2025-002 (Aminat Balogun — AWAITING_RESPONSE)');
  }

  // ── 8. System Log Entries ──────────────────────────────────
  const now = new Date();
  const logs = [
    { level: 'INFO',    category: 'EMAIL',       message: 'Invitation email sent to c.okafor@unilag.edu.ng',    createdAt: new Date(now - 1 * 86400000) },
    { level: 'INFO',    category: 'EMAIL',       message: 'Invitation email sent to n.adeyemi@unilag.edu.ng',   createdAt: new Date(now - 2 * 86400000) },
    { level: 'INFO',    category: 'EMAIL',       message: 'Invitation email sent to a.nwosu@unilag.edu.ng',     createdAt: new Date(now - 2 * 86400000) },
    { level: 'INFO',    category: 'EMAIL',       message: 'Invitation email sent to b.fashola@unilag.edu.ng',   createdAt: new Date(now - 3 * 86400000) },
    { level: 'INFO',    category: 'SYSTEM',      message: 'Institution UNILAG configuration updated',           createdAt: new Date(now - 4 * 86400000) },
    { level: 'WARNING', category: 'SMS',         message: 'SMS delivery delayed — Termii gateway timeout',      createdAt: new Date(now - 1 * 86400000) },
    { level: 'WARNING', category: 'SMS',         message: 'SMS retry succeeded after 2 attempts',               createdAt: new Date(now - 1 * 86400000) },
    { level: 'ERROR',   category: 'INTEGRATION', message: 'SIS API connection timeout — sisApiUrl unreachable', createdAt: new Date(now - 3 * 86400000) },
  ];

  for (const log of logs) {
    await prisma.systemLog.create({ data: { institutionId: unilag.id, ...log } });
  }
  console.log(`Created ${logs.length} system log entries`);

  console.log('\n✓ Seeding complete.\n');
  console.log('Credentials:');
  console.log('  Reforma Admin:       admin@reformadigital.com / (REFORMA_ADMIN_PASSWORD env var)');
  console.log('  Institution Admin:   admin@unilag.edu.ng / TIDDSunilag2025!');
  console.log('  Law Officer:         a.nwosu@unilag.edu.ng / Officer2025!');
  console.log('  Hostel Officer:      s.adebayo@unilag.edu.ng / Officer2025!');
  console.log('  General Officer:     u.obiora@unilag.edu.ng / Officer2025!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
