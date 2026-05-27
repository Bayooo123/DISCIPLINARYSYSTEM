import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function reformaDashboard(req, res) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo    = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sixtyDays    = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const [totalInstitutions, activeInstitutions, totalUsers, emailsSent, smsSent, errors24h, licenceAlerts, recentActivity] = await Promise.all([
      prisma.institution.count(),
      prisma.institution.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.notification.count({ where: { channel: 'EMAIL', status: 'SENT', sentAt: { gte: sevenDaysAgo } } }),
      prisma.notification.count({ where: { channel: 'SMS',   status: 'SENT', sentAt: { gte: sevenDaysAgo } } }),
      prisma.systemLog.count({ where: { level: { in: ['ERROR', 'CRITICAL'] }, createdAt: { gte: oneDayAgo } } }),
      prisma.institution.findMany({
        where:   { isActive: true, licenceEnd: { lte: sixtyDays, gte: new Date() } },
        select:  { id: true, name: true, slug: true, licenceEnd: true, licenceStatus: true },
        orderBy: { licenceEnd: 'asc' },
      }),
      prisma.systemLog.findMany({
        take:    10,
        orderBy: { createdAt: 'desc' },
        include: { institution: { select: { name: true, slug: true } } },
      }),
    ]);

    const emailTotal  = await prisma.notification.count({ where: { channel: 'EMAIL', sentAt: { gte: sevenDaysAgo } } });
    const smsTotal    = await prisma.notification.count({ where: { channel: 'SMS',   sentAt: { gte: sevenDaysAgo } } });

    const institutions = await prisma.institution.findMany({
      where:   { isActive: true },
      select: {
        id: true, name: true, slug: true, shortName: true, logoUrl: true,
        licenceStatus: true, licenceEnd: true, createdAt: true, isActive: true,
        _count: { select: { users: true, cases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      totalInstitutions,
      activeInstitutions,
      totalUsers,
      notificationsSent7d: emailsSent + smsSent,
      systemHealth: {
        emailDeliveryRate: emailTotal ? Math.round((emailsSent / emailTotal) * 100) : 100,
        smsDeliveryRate:   smsTotal   ? Math.round((smsSent   / smsTotal)   * 100) : 100,
        errorCount24h:     errors24h,
      },
      licenceAlerts: licenceAlerts.map(i => ({
        ...i,
        daysRemaining: Math.ceil((new Date(i.licenceEnd) - new Date()) / (1000 * 60 * 60 * 24)),
      })),
      recentActivity,
      institutions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function institutionDashboard(req, res) {
  try {
    const { institutionId } = req.params;
    if (req.user.role === 'INSTITUTION_ADMIN' && req.user.institutionId !== institutionId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const [users, offenceTypeCount, pendingInvites, recentLogs] = await Promise.all([
      prisma.user.findMany({ where: { institutionId }, select: { role: true, isActive: true, inviteAccepted: true } }),
      prisma.offenceType.count({ where: { institutionId, isActive: true } }),
      prisma.user.count({ where: { institutionId, inviteAccepted: false } }),
      prisma.systemLog.findMany({
        where:   { institutionId },
        take:    5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const roleCount = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    res.json({
      institution: {
        id: institution.id, name: institution.name, logoUrl: institution.logoUrl,
        licenceStatus: institution.licenceStatus, licenceEnd: institution.licenceEnd,
        primaryColor: institution.primaryColor, secondaryColor: institution.secondaryColor,
      },
      totalUsers:    users.length,
      pendingInvites,
      usersByRole:   roleCount,
      offenceTypeCount,
      integrationStatus: {
        email: !!(institution.smtpHost && institution.smtpUser),
        sms:   institution.smsEnabled,
        sis:   !!institution.sisApiUrl,
      },
      recentSystemLogs: recentLogs,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
