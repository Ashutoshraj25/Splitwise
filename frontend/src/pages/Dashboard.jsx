import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Users, TrendingUp, TrendingDown, DollarSign, ArrowRight, Plus } from 'lucide-react';

const Dashboard = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await groupsAPI.getGroups();
        setGroups(res.data.data);
      } catch (error) {
        console.error('Error fetching groups:', error);
        showToast('Failed to load groups. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [showToast]);

  // Calculate totals
  const totalBalance = groups.reduce((sum, g) => sum + g.userNetBalance, 0);
  const totalOwed = groups.reduce((sum, g) => (g.userNetBalance > 0 ? sum + g.userNetBalance : sum), 0);
  const totalOwe = groups.reduce((sum, g) => (g.userNetBalance < 0 ? sum + Math.abs(g.userNetBalance) : sum), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-brand-500 animate-spin glow-green"></div>
        <p className="text-slate-400 font-medium">Fetching dashboard summaries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1">Quick summary of all your groups and balances.</p>
        </div>
        <Link
          to="/create-group"
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-brand-600/20 self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>New Group</span>
        </Link>
      </div>

      {/* Aggregate Balance Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Net Balance Card */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16 text-slate-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Balance</p>
          <h3 className={`text-3xl font-extrabold ${totalBalance > 0.01 ? 'text-emerald-400' : totalBalance < -0.01 ? 'text-rose-400' : 'text-slate-200'}`}>
            {totalBalance >= 0 ? '+' : '-'}${Math.abs(totalBalance).toFixed(2)}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Aggregated across all groups</p>
        </div>

        {/* You Are Owed Card */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden border-l-4 border-emerald-500">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">You Are Owed</p>
          <h3 className="text-3xl font-extrabold text-emerald-400">
            ${totalOwed.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Money friends owe you</p>
        </div>

        {/* You Owe Card */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden border-l-4 border-rose-500">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingDown className="w-16 h-16 text-rose-500" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">You Owe</p>
          <h3 className="text-3xl font-extrabold text-rose-400">
            ${totalOwe.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Money you owe friends</p>
        </div>
      </div>

      {/* Groups List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Users className="w-5 h-5 text-brand-400" />
          <span>My Groups</span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-medium ml-2">
            {groups.length}
          </span>
        </h2>

        {groups.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="bg-slate-900/50 p-4 rounded-full border border-slate-800">
              <Users className="w-10 h-10 text-slate-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-300">No groups yet</h4>
              <p className="text-slate-500 mt-1 max-w-sm">Create a group or ask a friend to add you by email to start splitting bills.</p>
            </div>
            <Link
              to="/create-group"
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors duration-200 text-sm shadow-md"
            >
              Get Started
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="group glass-card rounded-2xl p-5 hover:bg-slate-800/25 transition-all duration-200 hover:border-slate-700/50 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={group.avatarUrl}
                    alt={group.name}
                    className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 object-cover"
                  />
                  <div>
                    <h3 className="font-bold text-slate-100 group-hover:text-brand-400 transition-colors duration-150">
                      {group.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 truncate max-w-xs">{group.description || 'No description.'}</p>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-semibold mt-2 inline-block">
                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {group.userNetBalance > 0.01 ? (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-500">You are owed</p>
                      <p className="text-lg font-extrabold text-emerald-400">${group.userNetBalance.toFixed(2)}</p>
                    </div>
                  ) : group.userNetBalance < -0.01 ? (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-500">You owe</p>
                      <p className="text-lg font-extrabold text-rose-400">${Math.abs(group.userNetBalance).toFixed(2)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Settled up</p>
                      <p className="text-lg font-extrabold text-slate-500">$0.00</p>
                    </div>
                  )}
                  <div className="inline-flex items-center space-x-1 mt-2 text-xs font-semibold text-brand-400 group-hover:text-brand-300 transition-colors">
                    <span>Details</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
