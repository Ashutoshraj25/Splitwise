import React, { useState, useEffect } from 'react';
import { expensesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { X, DollarSign, Calendar, Info } from 'lucide-react';

const AddExpenseModal = ({ isOpen, onClose, groupMembers, currentUser, onExpenseAdded, expenseToEdit }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitMethod, setSplitMethod] = useState('EQUAL');
  
  // Custom split state for each member: { userId, checked, amount, percentage, share }
  const [memberSplits, setMemberSplits] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  // Initialize splits when modal opens or members change
  useEffect(() => {
    if (!isOpen) return;

    if (expenseToEdit) {
      // Setup editing states
      setDescription(expenseToEdit.description);
      setAmount(parseFloat(expenseToEdit.amount).toString());
      setDate(new Date(expenseToEdit.date).toISOString().split('T')[0]);
      setSplitMethod(expenseToEdit.splitMethod);

      const splitsMap = {};
      expenseToEdit.splits.forEach(s => {
        splitsMap[s.userId] = s;
      });

      const initialSplits = groupMembers.map(m => {
        const existingSplit = splitsMap[m.id];
        return {
          userId: m.id,
          name: m.name,
          checked: !!existingSplit,
          amount: existingSplit ? parseFloat(existingSplit.amount).toString() : '',
          percentage: existingSplit && existingSplit.percentage ? parseFloat(existingSplit.percentage).toString() : '',
          share: existingSplit && existingSplit.share ? parseFloat(existingSplit.share).toString() : '1'
        };
      });
      setMemberSplits(initialSplits);
    } else {
      // Setup default creating states
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setSplitMethod('EQUAL');

      const initialSplits = groupMembers.map(m => ({
        userId: m.id,
        name: m.name,
        checked: true, // Default to all selected for equal
        amount: '',
        percentage: '',
        share: '1' // Default 1 share
      }));
      setMemberSplits(initialSplits);
    }
    setValidationError('');
  }, [isOpen, groupMembers, expenseToEdit]);

  // Handle client-side split calculations and validations
  useEffect(() => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setValidationError('');
      return;
    }

    if (splitMethod === 'EQUAL') {
      const selected = memberSplits.filter(m => m.checked);
      if (selected.length === 0) {
        setValidationError('At least one member must be selected.');
      } else {
        setValidationError('');
      }
    } else if (splitMethod === 'UNEQUAL') {
      const sum = memberSplits.reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);
      const diff = Math.abs(sum - amt);
      if (diff > 0.01) {
        setValidationError(`Sum of splits ($${sum.toFixed(2)}) must equal total amount ($${amt.toFixed(2)}). Difference: $${(amt - sum).toFixed(2)}`);
      } else {
        setValidationError('');
      }
    } else if (splitMethod === 'PERCENTAGE') {
      const sumPct = memberSplits.reduce((acc, m) => acc + (parseFloat(m.percentage) || 0), 0);
      const diff = Math.abs(sumPct - 100);
      if (diff > 0.01) {
        setValidationError(`Sum of percentages must equal 100% (currently ${sumPct.toFixed(1)}%). Difference: ${(100 - sumPct).toFixed(1)}%`);
      } else {
        setValidationError('');
      }
    } else if (splitMethod === 'SHARE') {
      const sumShares = memberSplits.reduce((acc, m) => acc + (parseFloat(m.share) || 0), 0);
      if (sumShares <= 0) {
        setValidationError('Sum of shares must be greater than zero.');
      } else {
        setValidationError('');
      }
    }
  }, [amount, splitMethod, memberSplits]);

  const handleSplitValueChange = (userId, field, value) => {
    setMemberSplits(prev =>
      prev.map(item => (item.userId === userId ? { ...item, [field]: value } : item))
    );
  };

  const handleCheckboxChange = (userId) => {
    setMemberSplits(prev =>
      prev.map(item => (item.userId === userId ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validationError) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }

    setSubmitting(true);

    // Format splits according to split method
    let splitsData = [];
    if (splitMethod === 'EQUAL') {
      const selected = memberSplits.filter(m => m.checked);
      splitsData = selected.map(s => ({ userId: s.userId }));
    } else if (splitMethod === 'UNEQUAL') {
      splitsData = memberSplits.map(s => ({
        userId: s.userId,
        amount: parseFloat(s.amount) || 0
      }));
    } else if (splitMethod === 'PERCENTAGE') {
      splitsData = memberSplits.map(s => ({
        userId: s.userId,
        percentage: parseFloat(s.percentage) || 0
      }));
    } else if (splitMethod === 'SHARE') {
      splitsData = memberSplits.map(s => ({
        userId: s.userId,
        share: parseFloat(s.share) || 0
      }));
    }

    const expensePayload = {
      amount: parsedAmount,
      description: description.trim(),
      date,
      splitMethod,
      splits: splitsData
    };

    try {
      if (expenseToEdit) {
        await expensesAPI.editExpense(expenseToEdit.id, expensePayload);
        showToast('Expense updated successfully!');
      } else {
        // Group ID needs to be passed for new expense creation
        await expensesAPI.createExpense({
          ...expensePayload,
          groupId: expenseToEdit?.groupId || groupMembers[0]?.groupId // fallback or context group id
        });
        showToast('Expense added successfully!');
      }
      onExpenseAdded();
      onClose();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to save expense.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-card rounded-2xl shadow-2xl border border-slate-800/80 max-h-[90vh] flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/50">
          <h2 className="text-xl font-bold text-white">
            {expenseToEdit ? 'Edit Expense' : 'Add an Expense'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Core Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                placeholder="e.g. Flight tickets, dinner"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <DollarSign className="w-4 h-4" />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-white focus:outline-none focus:border-brand-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Date
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Splitting Method Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Split Method
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800/80">
              {['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARE'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSplitMethod(method)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                    splitMethod === method
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Splitting Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center">
              <Info className="w-3.5 h-3.5 mr-1.5 text-brand-400" />
              <span>Split details</span>
            </h3>

            {validationError && (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-semibold leading-relaxed">
                {validationError}
              </div>
            )}

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1.5">
              {memberSplits.map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/40">
                  <div className="flex items-center space-x-3">
                    {splitMethod === 'EQUAL' && (
                      <input
                        type="checkbox"
                        checked={member.checked}
                        onChange={() => handleCheckboxChange(member.userId)}
                        className="w-4.5 h-4.5 text-brand-600 bg-slate-950 border-slate-800 rounded focus:ring-brand-500 focus:ring-offset-slate-900 focus:ring-2"
                      />
                    )}
                    <span className="text-sm font-medium text-slate-200">
                      {member.name} {member.userId === currentUser.id && '(You)'}
                    </span>
                  </div>

                  <div className="flex items-center">
                    {splitMethod === 'EQUAL' && member.checked && (
                      <span className="text-xs font-bold text-slate-500">
                        ${(parseFloat(amount) / memberSplits.filter(m => m.checked).length || 0).toFixed(2)}
                      </span>
                    )}

                    {splitMethod === 'UNEQUAL' && (
                      <div className="relative w-28">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={member.amount}
                          onChange={(e) => handleSplitValueChange(member.userId, 'amount', e.target.value)}
                          className="w-full text-right pr-3 pl-6 py-1.5 text-sm rounded-lg border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-brand-500"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {splitMethod === 'PERCENTAGE' && (
                      <div className="relative w-28">
                        <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 text-xs font-bold">
                          %
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={member.percentage}
                          onChange={(e) => handleSplitValueChange(member.userId, 'percentage', e.target.value)}
                          className="w-full text-right pr-6 pl-3 py-1.5 text-sm rounded-lg border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-brand-500"
                          placeholder="0.0"
                        />
                      </div>
                    )}

                    {splitMethod === 'SHARE' && (
                      <div className="relative w-28">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={member.share}
                          onChange={(e) => handleSplitValueChange(member.userId, 'share', e.target.value)}
                          className="w-full text-center py-1.5 text-sm rounded-lg border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-brand-500"
                          placeholder="1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-800/50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-800 text-slate-400 font-semibold hover:bg-slate-900 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !!validationError}
              className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-600/20"
            >
              <span>{submitting ? 'Saving...' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
