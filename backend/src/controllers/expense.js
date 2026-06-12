const prisma = require('../config/database');

// Helper to validate and calculate splits
const calculateSplits = (totalAmount, splitMethod, rawSplits) => {
  const amount = parseFloat(totalAmount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Expense amount must be a positive number.');
  }

  if (!rawSplits || rawSplits.length === 0) {
    throw new Error('Expense must be split with at least one user.');
  }

  const numSplitters = rawSplits.length;
  let calculatedSplits = [];
  let sumCalculated = 0;

  if (splitMethod === 'EQUAL') {
    const baseShare = Math.floor((amount / numSplitters) * 100) / 100;
    calculatedSplits = rawSplits.map((split) => ({
      userId: split.userId,
      amount: baseShare,
    }));
    
    // Add remaining pennies to the first person
    sumCalculated = baseShare * numSplitters;
    const remainder = Math.round((amount - sumCalculated) * 100) / 100;
    if (remainder !== 0) {
      calculatedSplits[0].amount = Math.round((calculatedSplits[0].amount + remainder) * 100) / 100;
    }

  } else if (splitMethod === 'UNEQUAL') {
    let rawSum = 0;
    calculatedSplits = rawSplits.map((split) => {
      const splitAmount = parseFloat(split.amount);
      if (isNaN(splitAmount) || splitAmount < 0) {
        throw new Error('Split amounts must be non-negative numbers.');
      }
      rawSum += splitAmount;
      return {
        userId: split.userId,
        amount: Math.round(splitAmount * 100) / 100,
      };
    });

    if (Math.abs(rawSum - amount) > 0.01) {
      throw new Error(`The sum of split amounts ($${rawSum.toFixed(2)}) must equal the total expense amount ($${amount.toFixed(2)}).`);
    }

  } else if (splitMethod === 'PERCENTAGE') {
    let totalPct = 0;
    rawSplits.forEach(split => {
      const pct = parseFloat(split.percentage);
      if (isNaN(pct) || pct < 0) {
        throw new Error('Split percentages must be non-negative.');
      }
      totalPct += pct;
    });

    if (Math.abs(totalPct - 100) > 0.01) {
      throw new Error(`The sum of split percentages must equal 100% (currently ${totalPct}%).`);
    }

    calculatedSplits = rawSplits.map((split) => {
      const pct = parseFloat(split.percentage);
      const splitAmount = Math.floor((amount * (pct / 100)) * 100) / 100;
      sumCalculated += splitAmount;
      return {
        userId: split.userId,
        percentage: pct,
        amount: splitAmount,
      };
    });

    // Add remaining pennies to the first person
    const remainder = Math.round((amount - sumCalculated) * 100) / 100;
    if (remainder !== 0) {
      calculatedSplits[0].amount = Math.round((calculatedSplits[0].amount + remainder) * 100) / 100;
    }

  } else if (splitMethod === 'SHARE') {
    let totalShares = 0;
    rawSplits.forEach(split => {
      const sh = parseFloat(split.share);
      if (isNaN(sh) || sh < 0) {
        throw new Error('Split shares must be non-negative.');
      }
      totalShares += sh;
    });

    if (totalShares <= 0) {
      throw new Error('Total shares must be greater than zero.');
    }

    calculatedSplits = rawSplits.map((split) => {
      const sh = parseFloat(split.share);
      const splitAmount = Math.floor((amount * (sh / totalShares)) * 100) / 100;
      sumCalculated += splitAmount;
      return {
        userId: split.userId,
        share: sh,
        amount: splitAmount,
      };
    });

    // Add remaining pennies to the first person
    const remainder = Math.round((amount - sumCalculated) * 100) / 100;
    if (remainder !== 0) {
      calculatedSplits[0].amount = Math.round((calculatedSplits[0].amount + remainder) * 100) / 100;
    }
  } else {
    throw new Error('Invalid split method.');
  }

  return calculatedSplits;
};

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res, next) => {
  try {
    const { groupId, amount, description, date, splitMethod, splits } = req.body;

    if (!groupId || !amount || !description || !splitMethod || !splits) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
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

    // Calculate splits
    let calculatedSplits;
    try {
      calculatedSplits = calculateSplits(amount, splitMethod, splits);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // Create expense and splits inside a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          groupId,
          paidById: req.user.id,
          amount,
          description,
          date: date ? new Date(date) : new Date(),
          splitMethod,
        },
      });

      // Map splits with expenseId
      const splitsData = calculatedSplits.map(s => ({
        expenseId: newExpense.id,
        userId: s.userId,
        amount: s.amount,
        percentage: s.percentage || null,
        share: s.share || null,
      }));

      // Create splits
      for (const split of splitsData) {
        await tx.expenseSplit.create({
          data: split,
        });
      }

      return tx.expense.findUnique({
        where: { id: newExpense.id },
        include: {
          splits: true,
        },
      });
    });

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit an existing expense
// @route   PUT /api/expenses/:id
// @access  Private
const editExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, description, date, splitMethod, splits } = req.body;

    if (!amount || !description || !splitMethod || !splits) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    // Verify requesting user is in the group of the expense
    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: existingExpense.groupId,
          userId: req.user.id,
        },
      },
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this expense.' });
    }

    // Calculate new splits
    let calculatedSplits;
    try {
      calculatedSplits = calculateSplits(amount, splitMethod, splits);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // Update inside transaction (delete splits, update expense, insert splits)
    const updatedExpense = await prisma.$transaction(async (tx) => {
      // Delete old splits
      await tx.expenseSplit.deleteMany({
        where: { expenseId: id },
      });

      // Update core expense fields
      await tx.expense.update({
        where: { id },
        data: {
          amount,
          description,
          date: date ? new Date(date) : new Date(),
          splitMethod,
        },
      });

      // Recreate splits
      const splitsData = calculatedSplits.map(s => ({
        expenseId: id,
        userId: s.userId,
        amount: s.amount,
        percentage: s.percentage || null,
        share: s.share || null,
      }));

      for (const split of splitsData) {
        await tx.expenseSplit.create({
          data: split,
        });
      }

      return tx.expense.findUnique({
        where: { id },
        include: {
          splits: true,
        },
      });
    });

    res.json({
      success: true,
      data: updatedExpense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    // Verify user is member of the group
    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: expense.groupId,
          userId: req.user.id,
        },
      },
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this expense.' });
    }

    // Delete expense (which cascade deletes splits in Prisma due to onDelete: Cascade)
    await prisma.expense.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Expense deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  editExpense,
  deleteExpense,
};
