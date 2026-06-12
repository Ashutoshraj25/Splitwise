const prisma = require('../config/database');

// @desc    Record a new settlement payment
// @route   POST /api/settlements
// @access  Private
const recordSettlement = async (req, res, next) => {
  try {
    const { groupId, payerId, payeeId, amount, date } = req.body;

    if (!groupId || !payerId || !payeeId || !amount) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Settlement amount must be a positive number.' });
    }

    // Verify requesting user is in the group
    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: req.user.id,
        },
      },
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group.' });
    }

    // Verify both payer and payee are in the group
    const payerMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payerId } },
    });
    const payeeMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payeeId } },
    });

    if (!payerMember || !payeeMember) {
      return res.status(400).json({ success: false, message: 'Both payer and payee must be members of the group.' });
    }

    // Create settlement
    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        payerId,
        payeeId,
        amount: numericAmount,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        payee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get settlement history for a group
// @route   GET /api/settlements/group/:groupId
// @access  Private
const getSettlements = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Verify user is in the group
    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: req.user.id,
        },
      },
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group.' });
    }

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        payee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json({
      success: true,
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordSettlement,
  getSettlements,
};
