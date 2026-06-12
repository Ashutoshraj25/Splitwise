/**
 * Computes net balances for all members and returns simplified debt relations (who owes whom).
 * 
 * @param {Array} members - Array of group members, e.g. [{ user: { id, name, email, avatarUrl } }]
 * @param {Array} expenses - Array of expenses, each containing splits: [{ id, amount, paidById, splits: [{ userId, amount }] }]
 * @param {Array} settlements - Array of settlements: [{ id, amount, payerId, payeeId }]
 * @returns {Object} { memberBalances: Array, debts: Array }
 */
const calculateBalances = (members, expenses, settlements) => {
  const balances = {};

  // Initialize balance for each group member
  members.forEach(member => {
    const userId = member.userId || member.user.id;
    balances[userId] = {
      userId,
      name: member.user.name,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      paid: 0,
      owed: 0,
      sent: 0,
      received: 0,
      netBalance: 0 // Will hold the net balance: paid - owed + sent - received
    };
  });

  // Calculate expenses paid and owed
  expenses.forEach(expense => {
    const payerId = expense.paidById;
    const expenseAmount = parseFloat(expense.amount);

    if (balances[payerId]) {
      balances[payerId].paid += expenseAmount;
    }

    expense.splits.forEach(split => {
      const splitterId = split.userId;
      const splitAmount = parseFloat(split.amount);

      if (balances[splitterId]) {
        balances[splitterId].owed += splitAmount;
      }
    });
  });

  // Calculate settlements sent and received
  settlements.forEach(settlement => {
    const payerId = settlement.payerId;
    const payeeId = settlement.payeeId;
    const amount = parseFloat(settlement.amount);

    if (balances[payerId]) {
      balances[payerId].sent += amount;
    }
    if (balances[payeeId]) {
      balances[payeeId].received += amount;
    }
  });

  // Compute final net balance for each member
  const memberBalances = Object.values(balances).map(member => {
    const net = member.paid - member.owed + member.sent - member.received;
    // Round to 2 decimal places to avoid floating point precision issues
    member.netBalance = Math.round(net * 100) / 100;
    return member;
  });

  // Solve debt relationships using greedy matching
  const debtors = [];
  const creditors = [];

  memberBalances.forEach(member => {
    if (member.netBalance < -0.01) {
      debtors.push({ ...member, balance: member.netBalance });
    } else if (member.netBalance > 0.01) {
      creditors.push({ ...member, balance: member.netBalance });
    }
  });

  const debts = [];

  // Sort debtors ascending (most negative first) and creditors descending (most positive first)
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amountOwed = Math.min(Math.abs(debtor.balance), creditor.balance);
    const roundedAmount = Math.round(amountOwed * 100) / 100;

    if (roundedAmount > 0) {
      debts.push({
        from: debtor.userId,
        fromName: debtor.name,
        fromAvatarUrl: debtor.avatarUrl,
        to: creditor.userId,
        toName: creditor.name,
        toAvatarUrl: creditor.avatarUrl,
        amount: roundedAmount
      });
    }

    debtor.balance += amountOwed;
    creditor.balance -= amountOwed;

    // Check if debtor is fully settled (close to 0)
    if (Math.abs(debtor.balance) < 0.01) {
      i++;
    }
    // Check if creditor is fully settled (close to 0)
    if (Math.abs(creditor.balance) < 0.01) {
      j++;
    }
  }

  return {
    memberBalances,
    debts
  };
};

module.exports = {
  calculateBalances
};
