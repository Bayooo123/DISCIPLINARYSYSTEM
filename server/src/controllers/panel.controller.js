import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { addWorkingDays } from '../utils/workingDays.utils.js';
import {
  dispatchEmail,
  ratificationRequestHtml,
  verdictNoticeHtml,
  officerVerdictAlertHtml,
} from '../services/notification.service.js';
import { generatePDFs } from './pdf.controller.js';

const prisma = new PrismaClient();

const PLATFORM_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const STUDENT_PORTAL_URL = process.env.STUDENT_PORTAL_URL || 'http://localhost:5174';

const PANEL_CASE_INCLUDE = {
  student: true,
  filedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  offences: { include: { offenceType: true } },
  evidence: { orderBy: { uploadedAt: 'asc' } },
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

function getPanelRole(panelCase, userId) {
  if (!panelCase.panel) return null;
  const membership = panelCase.panel.members.find(m => m.user.id === userId);
  return membership?.panelRole || null;
}

// ── Panel dashboard ───────────────────────────────────────────────────────────

export async function getPanelDashboard(req, res) {
  try {
    const { userId, institutionId } = req.user;

    const myMemberships = await prisma.panelMember.findMany({
      where: { userId },
      include: {
        panel: {
          include: {
            case: {
              include: { student: true, offences: { include: { offenceType: true } } },
            },
          },
        },
      },
    });

    const now = new Date();
    const myCases = myMemberships
      .map(m => ({ ...m.panel.case, panelRole: m.panelRole, panelId: m.panelId }))
      .filter(c => c.status !== 'CLOSED');

    const upcomingHearings = myCases
      .filter(c => c.status === 'HEARING_SCHEDULED' && c.hearingDate && new Date(c.hearingDate) >= now)
      .sort((a, b) => new Date(a.hearingDate) - new Date(b.hearingDate))
      .slice(0, 3);

    // Awaiting my action
    let awaitingAction = 0;
    for (const m of myMemberships) {
      const c = m.panel?.case;
      if (!c) continue;
      if (m.panelRole === 'CHAIRPERSON' && (c.status === 'HEARING_COMPLETE' || c.status === 'HEARING_SCHEDULED')) awaitingAction++;
      if (m.panelRole === 'SECRETARY' && c.status === 'VERDICT_DELIVERED' && c.verdictRecordedAt && !c.verdictRatifiedAt) awaitingAction++;
    }

    res.json({
      stats: {
        assignedCases: myCases.length,
        upcomingHearings: upcomingHearings.length,
        awaitingAction,
      },
      upcomingHearings: upcomingHearings.map(c => ({
        caseId: c.id, referenceNumber: c.referenceNumber,
        studentName: `${c.student.firstName} ${c.student.lastName}`,
        hearingDate: c.hearingDate, hearingTime: c.hearingTime, hearingVenue: c.hearingVenue,
        panelRole: c.panelRole,
      })),
      activeCases: myCases.map(c => ({
        caseId: c.id, referenceNumber: c.referenceNumber,
        studentName: `${c.student.firstName} ${c.student.lastName}`,
        offences: c.offences.map(o => o.offenceType?.name),
        status: c.status, hearingDate: c.hearingDate, panelRole: c.panelRole,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load panel dashboard' });
  }
}

// ── Panel cases list ──────────────────────────────────────────────────────────

export async function getPanelCases(req, res) {
  try {
    const { userId } = req.user;
    const memberships = await prisma.panelMember.findMany({
      where: { userId },
      include: {
        panel: {
          include: {
            case: {
              include: {
                student: true,
                offences: { include: { offenceType: true } },
              },
            },
          },
        },
      },
    });
    const cases = memberships.map(m => ({
      ...m.panel.case,
      panelRole: m.panelRole,
    }));
    res.json(cases);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch panel cases' });
  }
}

// ── Panel case detail ─────────────────────────────────────────────────────────

export async function getPanelCaseById(req, res) {
  try {
    const { userId, institutionId } = req.user;
    const { id } = req.params;

    const c = await prisma.case.findUnique({ where: { id }, include: PANEL_CASE_INCLUDE });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });

    const isMember = c.panel?.members.some(m => m.user.id === userId);
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    const panelRole = getPanelRole(c, userId);

    // Strip committee-only fields
    const result = { ...c, panelRole };
    delete result.internalHearingNotes;
    delete result.verdictDeliberationNotes;

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
}

// ── Record verdict (Chairperson only) ─────────────────────────────────────────

export async function recordVerdict(req, res) {
  try {
    const { userId, institutionId } = req.user;
    const { id: caseId } = req.params;
    const { verdictFinding, verdictPenalty, verdictEffectiveDate, hearingOutcome, verdictDeliberationNotes } = req.body;

    const c = await prisma.case.findUnique({ where: { id: caseId }, include: PANEL_CASE_INCLUDE });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });

    const panelRole = getPanelRole(c, userId);
    if (panelRole !== 'CHAIRPERSON') return res.status(403).json({ error: 'Only the Panel Chairperson can record a verdict' });

    const allowedStatuses = ['HEARING_COMPLETE', 'HEARING_SCHEDULED', 'ESCALATED'];
    if (!allowedStatuses.includes(c.status)) {
      return res.status(409).json({ error: `Cannot record verdict when case is in status ${c.status}` });
    }

    if (!['UPHELD', 'DISMISSED', 'PARTIALLY_UPHELD'].includes(verdictFinding)) {
      return res.status(422).json({ error: 'Invalid verdictFinding value' });
    }

    const now = new Date();
    const effectiveDate = verdictEffectiveDate ? new Date(verdictEffectiveDate) : now;
    const appealDeadline = addWorkingDays(effectiveDate, 10);

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        verdictFinding,
        verdictPenalty,
        verdictEffectiveDate: effectiveDate,
        hearingOutcome,
        verdictDeliberationNotes,
        verdictRecordedAt: now,
        verdictRecordedById: userId,
        appealDeadline,
        status: 'VERDICT_DELIVERED',
      },
      include: PANEL_CASE_INCLUDE,
    });

    const chairperson = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.auditLog.create({
      data: {
        caseId, actorId: userId,
        action: 'VERDICT_RECORDED',
        description: `Verdict recorded for ${c.referenceNumber} by ${chairperson.firstName} ${chairperson.lastName}. Finding: ${verdictFinding}. Penalty: ${verdictPenalty || 'N/A'}.`,
        metadata: { verdictFinding, verdictPenalty, verdictEffectiveDate: effectiveDate.toISOString() },
      },
    });

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });

    // Find secretary and notify
    const secretaryMember = c.panel?.members.find(m => m.panelRole === 'SECRETARY');
    if (secretaryMember) {
      try {
        await dispatchEmail({
          institutionId, institution,
          to: secretaryMember.user.email,
          subject: `Verdict Awaiting Your Ratification — Case ${c.referenceNumber}`,
          html: ratificationRequestHtml({
            secretary: secretaryMember.user,
            chairpersonName: `${chairperson.firstName} ${chairperson.lastName}`,
            referenceNumber: c.referenceNumber,
            student: c.student,
            verdictFinding,
            verdictPenalty,
            verdictEffectiveDate: effectiveDate,
            verdictRecordedAt: now,
            platformUrl: PLATFORM_URL,
            caseId,
          }),
          type: 'VERDICT_NOTICE',
          caseId,
        });
      } catch (_) { /* non-fatal */ }
    }

    // Notify chairman
    const chairman = await prisma.user.findFirst({ where: { institutionId, isChairman: true } });
    if (chairman) {
      try {
        await dispatchEmail({
          institutionId, institution,
          to: chairman.email,
          subject: `Verdict Recorded — Awaiting Ratification — Case ${c.referenceNumber}`,
          html: `<p>Dear ${chairman.firstName},</p><p>The Chairperson of the panel for Case <strong>${c.referenceNumber}</strong> has recorded a verdict. It is now awaiting Secretary ratification before being communicated to the student.</p><p><strong>Finding:</strong> ${verdictFinding}<br/><strong>Penalty:</strong> ${verdictPenalty || 'N/A'}</p>`,
          type: 'VERDICT_NOTICE',
          caseId,
        });
      } catch (_) { /* non-fatal */ }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record verdict' });
  }
}

// ── Ratify verdict (Secretary only) ──────────────────────────────────────────

export async function ratifyVerdict(req, res) {
  try {
    const { userId, institutionId } = req.user;
    const { id: caseId } = req.params;
    const { confirmed, notes } = req.body;

    if (!confirmed) return res.status(400).json({ error: 'confirmed must be true to ratify' });

    const c = await prisma.case.findUnique({ where: { id: caseId }, include: PANEL_CASE_INCLUDE });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });

    const panelRole = getPanelRole(c, userId);
    if (panelRole !== 'SECRETARY') return res.status(403).json({ error: 'Only the Panel Secretary can ratify a verdict' });

    if (!c.verdictRecordedAt) return res.status(409).json({ error: 'No verdict has been recorded yet' });
    if (c.verdictRatifiedAt) return res.status(409).json({ error: 'Verdict has already been ratified' });

    const now = new Date();
    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        verdictRatifiedAt: now,
        verdictRatifiedById: userId,
        status: 'CLOSED',
        closedAt: now,
      },
      include: PANEL_CASE_INCLUDE,
    });

    const secretary = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.auditLog.createMany({
      data: [
        {
          caseId, actorId: userId,
          action: 'VERDICT_RATIFIED',
          description: `Verdict ratified by ${secretary.firstName} ${secretary.lastName} for ${c.referenceNumber}. Case closed.`,
          metadata: { verdictFinding: c.verdictFinding, verdictPenalty: c.verdictPenalty, appealDeadline: c.appealDeadline?.toISOString() },
          timestamp: now,
        },
        {
          caseId, actorId: userId,
          action: 'CASE_CLOSED',
          description: `Case ${c.referenceNumber} closed. Student notified. Appeal deadline: ${c.appealDeadline?.toLocaleDateString('en-GB') || 'N/A'}.`,
          timestamp: now,
        },
      ],
    });

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });

    // Notify student
    const portalUrl = `${STUDENT_PORTAL_URL}/access/${c.studentAccessToken}`;
    try {
      await dispatchEmail({
        institutionId, institution,
        to: c.student.email,
        subject: `Disciplinary Panel Verdict — Case ${c.referenceNumber}`,
        html: verdictNoticeHtml({
          student: c.student,
          referenceNumber: c.referenceNumber,
          finding: c.verdictFinding,
          penalty: c.verdictPenalty,
          effectiveDate: c.verdictEffectiveDate,
          verdictAt: now,
          portalUrl,
          contactEmail: institution?.contactEmail,
        }),
        type: 'VERDICT_NOTICE',
        caseId,
      });
    } catch (_) { /* non-fatal */ }

    // Notify officer who filed
    try {
      const officer = await prisma.user.findUnique({ where: { id: c.filedById } });
      if (officer) {
        await dispatchEmail({
          institutionId, institution,
          to: officer.email,
          subject: `Verdict Delivered — Case ${c.referenceNumber}`,
          html: officerVerdictAlertHtml({
            officer,
            student: c.student,
            referenceNumber: c.referenceNumber,
            verdict: c.hearingOutcome,
            penalty: c.verdictPenalty,
            verdictAt: now,
            platformUrl: PLATFORM_URL,
          }),
          type: 'VERDICT_NOTICE',
          caseId,
        });
      }
    } catch (_) { /* non-fatal */ }

    // Generate PDFs asynchronously
    setImmediate(() => generatePDFs(caseId, institutionId).catch(console.error));

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to ratify verdict' });
  }
}

// ── Reject ratification (Secretary only) ──────────────────────────────────────

export async function rejectRatification(req, res) {
  try {
    const { userId, institutionId } = req.user;
    const { id: caseId } = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) return res.status(422).json({ error: 'Rejection reason is required' });

    const c = await prisma.case.findUnique({ where: { id: caseId }, include: PANEL_CASE_INCLUDE });
    if (!c || c.institutionId !== institutionId) return res.status(404).json({ error: 'Case not found' });

    const panelRole = getPanelRole(c, userId);
    if (panelRole !== 'SECRETARY') return res.status(403).json({ error: 'Only the Panel Secretary can reject a verdict' });
    if (!c.verdictRecordedAt) return res.status(409).json({ error: 'No verdict has been recorded' });
    if (c.verdictRatifiedAt) return res.status(409).json({ error: 'Verdict has already been ratified' });

    const secretary = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.case.update({
      where: { id: caseId },
      data: {
        verdictFinding: null,
        verdictPenalty: null,
        verdictEffectiveDate: null,
        hearingOutcome: null,
        verdictDeliberationNotes: null,
        verdictRecordedAt: null,
        verdictRecordedById: null,
        appealDeadline: null,
        status: 'HEARING_COMPLETE',
      },
    });

    await prisma.auditLog.create({
      data: {
        caseId, actorId: userId,
        action: 'RATIFICATION_REJECTED',
        description: `Verdict ratification rejected by ${secretary.firstName} ${secretary.lastName} for ${c.referenceNumber}. Returned to Chairperson.`,
        metadata: { reason },
      },
    });

    // Notify chairperson
    const chairpersonMember = c.panel?.members.find(m => m.panelRole === 'CHAIRPERSON');
    if (chairpersonMember) {
      const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
      try {
        await dispatchEmail({
          institutionId, institution,
          to: chairpersonMember.user.email,
          subject: `Verdict Ratification Rejected — Case ${c.referenceNumber}`,
          html: `<p>Dear ${chairpersonMember.user.firstName},</p><p>The Secretary has rejected the ratification of your verdict for Case <strong>${c.referenceNumber}</strong>.</p><p><strong>Reason:</strong> ${reason}</p><p>Please log in to the CANDOR platform to revise and resubmit the verdict.</p>`,
          type: 'VERDICT_NOTICE',
          caseId,
        });
      } catch (_) { /* non-fatal */ }
    }

    res.json({ message: 'Verdict returned to Chairperson' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject ratification' });
  }
}
