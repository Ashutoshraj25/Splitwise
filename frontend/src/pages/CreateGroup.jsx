import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Users, FileText, ArrowLeft, Check, Camera } from 'lucide-react';

const CreateGroup = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Generate avatar dynamically based on typing group name
  useEffect(() => {
    if (name.trim()) {
      setAvatarUrl(`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`);
    } else {
      setAvatarUrl('https://api.dicebear.com/7.x/identicon/svg?seed=SplitwiseGroup');
    }
  }, [name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide a group name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await groupsAPI.createGroup({
        name: name.trim(),
        description: description.trim(),
        avatarUrl,
      });

      showToast('Group created successfully!');
      // Navigate to the newly created group details page
      navigate(`/groups/${res.data.data.id}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create group. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto animate-slide-in">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-semibold">Back to Dashboard</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Create a Group</h1>
        <p className="text-slate-400 mt-1">Start a ledger to split expenses with friends or flatmates.</p>
      </div>

      {/* Form Card */}
      <div className="glass-card rounded-2xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Group Avatar Preview */}
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <div className="relative">
              <img
                src={avatarUrl}
                alt="Group Logo Preview"
                className="w-24 h-24 rounded-2xl border border-slate-700 bg-slate-800 object-cover"
              />
              <div className="absolute bottom-0 right-0 bg-brand-600 border-2 border-slate-950 p-1.5 rounded-xl text-white">
                <Camera className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xs text-slate-400">Auto-Generated Group Logo</span>
          </div>

          <div>
            <label htmlFor="groupName" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Group Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Users className="w-5 h-5" />
              </span>
              <input
                type="text"
                id="groupName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200"
                placeholder="e.g. Apartment 404, Summer Trip"
                required
                maxLength={40}
              />
            </div>
          </div>

          <div>
            <label htmlFor="groupDesc" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Description (Optional)
            </label>
            <div className="relative">
              <span className="absolute top-3 left-3 flex items-center text-slate-500">
                <FileText className="w-5 h-5" />
              </span>
              <textarea
                id="groupDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 resize-none"
                placeholder="Describe what this group is for..."
                maxLength={120}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 text-slate-400 font-semibold text-center hover:bg-slate-900 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-600/20"
            >
              <Check className="w-5 h-5" />
              <span>{submitting ? 'Creating...' : 'Create'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
