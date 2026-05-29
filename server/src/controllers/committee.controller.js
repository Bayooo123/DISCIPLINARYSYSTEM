import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { addWorkingDays } from '../utils/workingDays.utils.js';
import {
  dispatchEmail,
  panelAssignmentHtml,
  hearingNoticeHtml,
  nonAppearanceAlertHtml,
  officerVerdictAlertHtml,
} from '../services/notification.service.js';

const prisma = new PrismaClient();

const PLATFORM_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const STUDENT_PORTAL_URL = process.env.STUDENT_PORTAL_URL || 'http://localhost:5174';

const FULL_CASE_INCLUDE = {
  student: true,
  filedBy: { select: { id: true, firstName: true, lastName: true, email: true, department: true, jobTitle: true } },
  offences: { include: { offenceType: true } },
  evidence: { orderBy: { uploadedAt: 'asc' } },
  auditLogs: { orderBy: { timestamp: 'asc' }, include: { actor: { select: { id: true, firstName: true, lastName: true, role: true } } } },
  panel: {
    include: {
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, role: true } },
        },
      },
    },
  },
  verdictRecordedBy: { select: { id: true, firstName: true, lastName: true } },
  verdictRatifiedBy: { select: { id: true, firstName: true, lastName: true } },
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getCommitteeDashboard(req, res) {
  try {
    const { institutionId } = req.user;
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [totalCases, pendingResponse, hearingsThisWeek, closedThisYear,
           overdueAlerts, upcomingHearings, awaitingRatification, nonAppearanceFlags] = await Promise.all([
      prisma.case.count({ where: { institutionId } }),
      prisma.case.count({ where: { institutionId, status: { in: ['STUDENT_NOTIFIED', 'AWAITING_RESPONSE'] } } }),
      prisma.case.count({ where: { institutionId, status: 'HEARING_SCHEDULED', hearingDate: { gte: now, lte: weekFromNow } } }),
      prisma.case.count({ where: { institutionId, status: 'CLOSED', closedAt: { gte: yearStart } } }),
      prisma.case.findMany({
        where: { institutionId, status: 'RESPONSE_OVERDUE' },
        include: { student: true },
        orderBy: { responseDeadline: 'asc' },
        take: 10,
      }),
      prisma.case.findMany({
        where: { institutionId, status: 'HEARING_SCHEDULED', hearingDate: { gte: now } },
        include: { student: true, panel: true },
        orderBy: { hearingDate: 'asc' },
        take: 5,
      }),
      prisma.case.findMany({
        where: { institutionId, verdictRecordedAt: { not: null }, verdictRatifiedAt: null, status: 'VERDICT_DELIVERED' },
        include: { student: true, verdictRecordedBy: { select: { firstName: true, lastName: true } } },
        orderBy: { verdictRecordedAt: 'asc' },
        take: 10,
      }),
      prisma.case.findMany({
        where: { institutionId, nonAppearanceFlaggedAt: { not: null }, status: 'ESCALATED' },
        include: { student: true },
        orderBy: { nonAppearanceFlaggedAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      stats: { totalCases, pendingResponse, hearingsThisWeek, closedThisYear },
      overdueAlerts: overdueAlerts.map(c => ({
        caseId: c.id, referenceNumber: c.referenceNumber,
        studentName: `${c.student.firstName} ${c.student.lastName}`,
        responseDeadline: c.responseDeadline,
        daysPast: Math.floor((now - new Date(c.responseDeadline)) / 86400000),
      })),
      upcomingHearings: upcomingHearings.map(c => ({
        caseId: c.id, referenceNumber: c.referenceNumber,
        studentName: `${c.student.firstName} ${c.student.lastName}`,
        hearingDate: c.hearingDate, hearingTime: c.hearingTime, hearingVenue: c.hearingVenue,
        panelName: c.panel?.name || null,
      })),
      awaitingRatification: awaitingRatification.map(c => ({
        caseId: c.id, referenceNumber: c.referenceNumber,
        studentName: `${c.student.firstName} ${c.student.lastName}`,
        verdictRecordedAt: c.verdictRecordedAt,
        chairpersonName: c.verdictRecordedBy ? `${c.verdictRecordedBy.firstName} ${c.verdictRecordedBy.lastName}` : '—',
      })),
      nonAppearanceFlags: nonAppearanceFlags.map(c => ({
        caseId: c.id, referenceNumber: c.referenceNumber,
        studentName: `${c.student.firstName} ${c.student.lastName}`,
        hearingDate: c.hearingDate, flaggedAt: c.nonAppearanceFlaggedAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load committee dashboard' });
  }
}

// ── Cases list ─────────────────────────────────────────────────────────────────

export async function getCommitteeCases(req, res) {
  try {
    const { institutionId } = req.user;
    const { status, faculty, offenceCategory, from, to, search, page = 1, limit = 25 } = req.query;

    const where = { institutionId };
    if (status) where.status = { in: status.split(',') };
    if (from || to) where.filedAt = {};
    if (from) where.filedAt.gte = new Date(from);
    if (to) where.filedAt.lte = new Date(to);
    if (faculty) where.student = { faculty };
    if (offenceCategory) where.offences = { some: { offenceType: { category: offenceCategory } } };
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { matricNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          student: true,
          offences: { include: { offenceType: true } },
          panel: { include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } } },
          verdictRecordedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { filedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.case.count({ where }),
    ]);

    res.json({ cases, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
}

// ── Case detail ────────────────────────────────────────────────────────────────

export async function getCommitteeCaseById(req, res) {
  try {
    const { institutionId, role } = req.user;
    const { id } = req.params;

    const c = await prisma.case.findUnique({
      where: { id },
      include: FULL_CASE_INCLUDE,
    });

    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });

    // Panel members can only see their own assigned cases
    if (role === 'PANEL_MEMBER') {
      const isMember = c.panel?.members.some(m => m.user.id === req.user.userId);
      if (!isMember) return res.status(403).json({ error: 'Access denied' });

      // Strip committee-only fields for panel members
      delete c.internalHearingNotes;
      delete c.verdictDeliberationNotes;
      c.auditLogs = [];
    }

    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
}

// ── Constitute panel (Chairman only) ─────────────────────────────────────────

export async function constitutePanel(req, res) {
  try {
    const { institutionId, userId } = req.user;
    const { id: caseId } = req.params;
    const { members } = req.body;

    if (!members || !Array.isArray(members) || members.length < 3) {
      return res.status(422).json({ error: 'Panel must have at least 3 members' });
    }

    const chairpersons = members.filter(m => m.panelRole === 'CHAIRPERSON');
    const secretaries  = members.filter(m => m.panelRole === 'SECRETARY');
    const regularMembers = members.filter(m => m.panelRole === 'MEMBER');

    if (chairpersons.length !== 1) return res.status(422).json({ error: 'Exactly one Chairperson is required' });
    if (secretaries.length  !== 1) return res.status(422).json({ error: 'Exactly one Secretary is required' });
    if (regularMembers.length < 1) return res.status(422).json({ error: 'At least one Member is required' });

    const userIds = members.map(m => m.userId);
    if (new Set(userIds).size !== userIds.length) {
      return res.status(422).json({ error: 'A user cannot hold two roles on the same panel' });
    }

    const c = await prisma.case.findUnique({ where: { id: caseId }, include: { panel: true } });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });
    if (c.panel) return res.status(409).json({ error: 'A panel has already been constituted for this case' });

    // Cannot include the officer who filed the case
    if (userIds.includes(c.filedById)) {
      return res.status(422).json({ error: 'The complaints officer who filed this case cannot serve on its panel' });
    }

    const panel = await prisma.panel.create({
      data: {
        institutionId,
        caseId,
        name: `Panel — ${c.referenceNumber}`,
        status: 'ACTIVE',
        members: { create: members.map(m => ({ userId: m.userId, panelRole: m.panelRole })) },
      },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true } } } },
      },
    });

    await prisma.case.update({ where: { id: caseId }, data: { status: 'PANEL_CONSTITUTED' } });

    const chairman = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.auditLog.create({
      data: {
        caseId,
        actorId: userId,
        action: 'PANEL_CONSTITUTED',
        description: `Panel constituted for ${c.referenceNumber} by Chairman ${chairman.firstName} ${chairman.lastName}. Members: ${panel.members.map(m => `${m.user.firstName} ${m.user.lastName} (${m.panelRole})`).join(', ')}.`,
        metadata: { panelId: panel.id, memberIds: userIds },
      },
    });

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });

    // Send assignment emails to all members
    for (const pm of panel.members) {
      try {
        await dispatchEmail({
          institutionId,
          institution,
          to: pm.user.email,
          subject: `Panel Assignment — Case ${c.referenceNumber}`,
          html: panelAssignmentHtml({
            member: pm.user,
            panelRole: pm.panelRole,
            referenceNumber: c.referenceNumber,
            student: c.student || (await prisma.student.findUnique({ where: { id: c.studentId } })),
            offences: c.offences || [],
            filedAt: c.filedAt,
            platformUrl: PLATFORM_URL,
            caseId,
          }),
          type: 'PANEL_CONSTITUTION',
          caseId,
        });
      } catch (_) { /* non-fatal */ }
    }

    res.status(201).json(panel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to constitute panel' });
  }
}

// ── Update panel (Chairman only, before hearing) ──────────────────────────────

export async function updatePanel(req, res) {
  try {
    const { institutionId, userId } = req.user;
    const { id: caseId } = req.params;
    const { members } = req.body;

    const c = await prisma.case.findUnique({ where: { id: caseId }, include: { panel: true } });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });
    if (!c.panel) return res.status(404).json({ error: 'No panel found for this case' });
    if (c.hearingDate && new Date(c.hearingDate) < new Date()) {
      return res.status(409).json({ error: 'Cannot modify panel after the hearing date has passed' });
    }

    await prisma.panelMember.deleteMany({ where: { panelId: c.panel.id } });
    await prisma.panelMember.createMany({
      data: members.map(m => ({ panelId: c.panel.id, userId: m.userId, panelRole: m.panelRole })),
    });

    const updated = await prisma.panel.findUnique({
      where: { id: c.panel.id },
      include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    });

    await prisma.auditLog.create({
      data: {
        caseId, actorId: userId, action: 'PANEL_UPDATED',
        description: `Panel composition updated for ${c.referenceNumber}.`,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update panel' });
  }
}

// ── Schedule / reschedule hearing (Chairman only) ─────────────────────────────

export async function scheduleHearing(req, res) {
  try {
    const { institutionId, userId } = req.user;
    const { id: caseId } = req.params;
    const { hearingDate, hearingTime, hearingVenue, penaltyRange, internalHearingNotes } = req.body;

    const c = await prisma.case.findUnique({
      where: { id: caseId },
      include: { student: true, offences: { include: { offenceType: true } }, panel: { include: { members: { include: { user: true } } } } },
    });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });

    const allowedStatuses = ['PANEL_CONSTITUTED', 'RESPONSE_RECEIVED', 'RESPONSE_OVERDUE', 'HEARING_SCHEDULED'];
    if (!allowedStatuses.includes(c.status)) {
      return res.status(409).json({ error: `Cannot schedule hearing when case is in status ${c.status}` });
    }

    const isReschedule = c.status === 'HEARING_SCHEDULED';
    const oldDate = c.hearingDate;

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        hearingDate: new Date(hearingDate),
        hearingTime, hearingVenue, penaltyRange, internalHearingNotes,
        status: 'HEARING_SCHEDULED',
      },
      include: FULL_CASE_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        caseId, actorId: userId,
        action: isReschedule ? 'HEARING_RESCHEDULED' : 'HEARING_SCHEDULED',
        description: isReschedule
          ? `Hearing rescheduled for ${c.referenceNumber}. New date: ${hearingDate}.`
          : `Hearing scheduled for ${c.referenceNumber} on ${hearingDate} at ${hearingVenue}.`,
        metadata: isReschedule
          ? { oldDate: oldDate?.toISOString(), newDate: hearingDate, hearingVenue }
          : { hearingDate, hearingTime, hearingVenue },
      },
    });

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    const portalUrl = `${STUDENT_PORTAL_URL}/access/${c.studentAccessToken}`;

    // Notify student
    try {
      await dispatchEmail({
        institutionId, institution,
        to: c.student.email,
        subject: `${isReschedule ? '[Updated] ' : ''}Hearing Notice — Case ${c.referenceNumber}`,
        html: hearingNoticeHtml({
          student: c.student,
          referenceNumber: c.referenceNumber,
          hearingDate: new Date(hearingDate),
          hearingVenue,
          panelName: c.panel?.name,
          offences: c.offences,
          penaltyRange,
          portalUrl,
        }),
        type: 'APPEARANCE_NOTICE',
        caseId,
      });
    } catch (_) { /* non-fatal */ }

    // Notify all panel members
    if (c.panel?.members) {
      for (const pm of c.panel.members) {
        try {
          await dispatchEmail({
            institutionId, institution,
            to: pm.user.email,
            subject: `Hearing ${isReschedule ? 'Rescheduled' : 'Scheduled'} — Case ${c.referenceNumber}`,
            html: `<p>Dear ${pm.user.firstName},</p><p>A hearing has been ${isReschedule ? 'rescheduled' : 'scheduled'} for Case <strong>${c.referenceNumber}</strong>.</p><p><strong>Date:</strong> ${new Date(hearingDate).toDateString()}<br/><strong>Time:</strong> ${hearingTime}<br/><strong>Venue:</strong> ${hearingVenue}</p><p>Please log in to the CANDOR platform for full details.</p>`,
            type: 'APPEARANCE_NOTICE',
            caseId,
          });
        } catch (_) { /* non-fatal */ }
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to schedule hearing' });
  }
}

// ── Record student appearance ──────────────────────────────────────────────────

export async function recordAppearance(req, res) {
  try {
    const { institutionId, userId } = req.user;
    const { id: caseId } = req.params;
    const { studentAppeared } = req.body;

    const c = await prisma.case.findUnique({ where: { id: caseId }, include: { student: true } });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        studentAppeared,
        status: studentAppeared ? 'HEARING_COMPLETE' : c.status,
      },
      include: FULL_CASE_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        caseId, actorId: userId,
        action: studentAppeared ? 'STUDENT_APPEARED' : 'NON_APPEARANCE_FLAGGED',
        description: studentAppeared
          ? `Student ${c.student.matricNumber} appeared at hearing for ${c.referenceNumber}.`
          : `Student ${c.student.matricNumber} did not appear at hearing for ${c.referenceNumber}.`,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record appearance' });
  }
}

// ── Flag non-appearance ───────────────────────────────────────────────────────

export async function flagNonAppearance(req, res) {
  try {
    const { institutionId, userId } = req.user;
    const { id: caseId } = req.params;
    const { notes } = req.body;
    const now = new Date();

    const c = await prisma.case.findUnique({
      where: { id: caseId },
      include: { student: true },
    });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        studentAppeared: false,
        nonAppearanceFlaggedAt: now,
        status: 'ESCALATED',
      },
      include: FULL_CASE_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        caseId, actorId: userId,
        action: 'NON_APPEARANCE_FLAGGED',
        description: `Student ${c.student.matricNumber} did not appear at hearing for ${c.referenceNumber}. Chairman alerted.`,
        metadata: { hearingDate: c.hearingDate, flaggedBy: userId, notes },
      },
    });

    // Alert the Chairman
    const chairman = await prisma.user.findFirst({ where: { institutionId, isChairman: true } });
    if (chairman && chairman.id !== userId) {
      const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
      try {
        await dispatchEmail({
          institutionId, institution,
          to: chairman.email,
          subject: `Student Did Not Appear — Case ${c.referenceNumber}`,
          html: nonAppearanceAlertHtml({
            chairman,
            referenceNumber: c.referenceNumber,
            student: c.student,
            hearingDate: c.hearingDate,
            hearingTime: c.hearingTime,
            hearingVenue: c.hearingVenue,
            flaggedAt: now,
            platformUrl: PLATFORM_URL,
            caseId,
          }),
          type: 'APPEARANCE_NOTICE',
          caseId,
        });
        await prisma.case.update({ where: { id: caseId }, data: { nonAppearanceAlertSentAt: new Date() } });
      } catch (_) { /* non-fatal */ }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to flag non-appearance' });
  }
}

// ── File appeal ───────────────────────────────────────────────────────────────

export async function fileAppeal(req, res) {
  try {
    const { institutionId, userId } = req.user;
    const { id: caseId } = req.params;
    const { appealFiledAt, appealNotes } = req.body;

    const c = await prisma.case.findUnique({ where: { id: caseId } });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });
    if (c.status !== 'CLOSED') return res.status(409).json({ error: 'Appeals can only be filed on closed cases' });

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { appealFiled: true, appealFiledAt: appealFiledAt ? new Date(appealFiledAt) : new Date(), appealNotes },
      include: FULL_CASE_INCLUDE,
    });

    await prisma.auditLog.create({
      data: {
        caseId, actorId: userId,
        action: 'APPEAL_FILED',
        description: `Appeal filed against verdict in ${c.referenceNumber}.`,
        metadata: { appealFiledAt: appealFiledAt || new Date().toISOString() },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record appeal' });
  }
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function getAnalytics(req, res) {
  try {
    const { institutionId } = req.user;
    const now = new Date();

    const [allCases, byStatus, byOffenceCategory, byFaculty] = await Promise.all([
      prisma.case.findMany({
        where: { institutionId },
        select: { id: true, status: true, filedAt: true, closedAt: true, student: { select: { faculty: true } } },
      }),
      prisma.case.groupBy({ by: ['status'], where: { institutionId }, _count: { id: true } }),
      prisma.caseOffence.groupBy({
        by: ['offenceTypeId'],
        where: { case: { institutionId } },
        _count: { id: true },
      }),
      prisma.student.groupBy({
        by: ['faculty'],
        where: { cases: { some: { institutionId } } },
        _count: { id: true },
      }),
    ]);

    // Resolution time by month (last 12 months)
    const closedCases = allCases.filter(c => c.closedAt);
    const monthlyResolution = {};
    for (const c of closedCases) {
      const month = `${new Date(c.closedAt).getFullYear()}-${String(new Date(c.closedAt).getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyResolution[month]) monthlyResolution[month] = { total: 0, days: 0 };
      monthlyResolution[month].total++;
      monthlyResolution[month].days += (new Date(c.closedAt) - new Date(c.filedAt)) / 86400000;
    }
    const resolutionByMonth = Object.entries(monthlyResolution)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, { total, days }]) => ({ month, avgDays: Math.round(days / total) }));

    // Pending caseload — stuck in status > 14 working days
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const stuckCases = await prisma.case.findMany({
      where: {
        institutionId,
        status: { notIn: ['CLOSED'] },
        filedAt: { lte: fourteenDaysAgo },
      },
      include: { student: true },
      orderBy: { filedAt: 'asc' },
    });

    // Offence category breakdown — get categories for offence type IDs
    const offenceTypeIds = byOffenceCategory.map(g => g.offenceTypeId);
    const offenceTypes = await prisma.offenceType.findMany({ where: { id: { in: offenceTypeIds } } });
    const offenceTypeMap = Object.fromEntries(offenceTypes.map(ot => [ot.id, ot]));
    const categoryBreakdown = {};
    for (const g of byOffenceCategory) {
      const cat = offenceTypeMap[g.offenceTypeId]?.category || 'GENERAL';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + g._count.id;
    }

    const totalCases = allCases.length;
    const yearStart = new Date(now.getFullYear(), 0, 1);

    res.json({
      stats: {
        totalCases,
        pendingResponse: byStatus.find(s => s.status === 'AWAITING_RESPONSE')?._count.id || 0,
        hearingsThisWeek: allCases.filter(c => c.status === 'HEARING_SCHEDULED').length,
        closedThisYear: closedCases.filter(c => new Date(c.closedAt) >= yearStart).length,
      },
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      byOffenceCategory: Object.entries(categoryBreakdown).map(([category, count]) => ({ category, count })),
      byFaculty: byFaculty.map(f => ({ faculty: f.faculty, count: f._count.id })).sort((a, b) => b.count - a.count),
      resolutionByMonth,
      pendingCaseload: stuckCases.map(c => ({
        id: c.id,
        referenceNumber: c.referenceNumber,
        studentName: `${c.student.firstName} ${c.student.lastName}`,
        status: c.status,
        daysInStatus: Math.floor((now - new Date(c.filedAt)) / 86400000),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

// ── Get panel-eligible users ──────────────────────────────────────────────────

export async function getPanelEligibleUsers(req, res) {
  try {
    const { institutionId } = req.user;
    const users = await prisma.user.findMany({
      where: { institutionId, role: { in: ['COMMITTEE_MEMBER', 'PANEL_MEMBER'] }, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, jobTitle: true, department: true, isChairman: true },
      orderBy: { firstName: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch eligible users' });
  }
}
