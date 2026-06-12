import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Mail, Calendar, Sparkles, Check, Edit2 } from 'lucide-react';

const Profile = () => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [updating, setUpdating] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }

    setUpdating(true);
    // Simulating profile update in context state for the mock front-end
    setTimeout(() => {
      setUser((prev) => ({
        ...prev,
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`
      }));
      setUpdating(false);
      showToast('Profile updated successfully!');
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto animate-slide-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center space-x-2.5">
          <User className="w-8 h-8 text-brand-400" />
          <span>My Profile</span>
        </h1>
        <p className="text-slate-400 mt-1">Manage your account information and preferences.</p>
      </div>

      {/* Main card */}
      <div className="glass-card rounded-2xl p-8 border border-slate-800/80 shadow-2xl">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <img
              src={avatarUrl || user?.avatarUrl}
              alt={user?.name}
              className="w-24 h-24 rounded-full border-2 border-slate-700 bg-slate-800 object-cover shadow-lg"
            />
            <span className="text-xs text-slate-400">Personal Avatar</span>
          </div>

          <div className="space-y-4">
            {/* Email Field (Disabled) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Address (Unchangeable)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-500 cursor-not-allowed text-sm font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200"
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>

            {/* Avatar URL Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Avatar Image URL
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Edit2 className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200"
                  placeholder="https://api.dicebear.com/..."
                />
              </div>
            </div>
            
            {/* Join date info */}
            {user?.createdAt && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 pt-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                <span>Member since {new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={updating}
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-600/20"
          >
            {updating ? (
              <span>Updating profile...</span>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
