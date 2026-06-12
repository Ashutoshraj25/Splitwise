import React, { useState, useEffect } from 'react';
import { settlementsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { X, DollarSign, Calendar, ArrowRight } from 'lucide-react';

const SettlementModal = ({ isOpen, onClose, groupMembers, groupId, onSettlementRecorded }) => {
  const [payerId, setPayerId] = useState('');
  const [payeeId, setPayeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    // Reset fields on open
    setPayerId('');
    setPayeeId('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!payerId || !payeeId) {
      showToast('Please select both payer and payee.', 'error');
      return;
    }

    if (payerId === payeeId) {
      showToast('Payer and payee cannot be the same person.', 'error');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast('Please enter a valid positive amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await settlementsAPI.recordSettlement({
        groupId,
        payerId,
        payeeId,
        amount: numericAmount,
        date
      });

      showToast('Settlement payment recorded successfully!');
      onSettlementRecorded();
      onClose();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to record settlement.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md glass-card rounded-2xl shadow-2xl border border-slate-800/80 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/50">
          <h2 className="text-xl font-bold text-white">Record a Payment</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-900/30 p-4 rounded-xl border border-slate-800/40">
            {/* Payer (Payer of settlement, i.e., Debtor) */}
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Who Paid
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full text-xs font-semibold py-2 px-2.5 rounded-lg border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-brand-500"
                required
              >
                <option value="">Select Debtor</option>
                {groupMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-shrink-0 pt-4 text-slate-500">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Payee (Recipient of settlement, i.e., Creditor) */}
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Received By
              </label>
              <select
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                className="w-full text-xs font-semibold py-2 px-2.5 rounded-lg border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-brand-500"
                required
              >
                <option value="">Select Creditor</option>
                {groupMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

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
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Payment Date
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-white focus:outline-none focus:border-brand-500"
                required
              />
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
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-600/20"
            >
              <span>{submitting ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettlementModal;
