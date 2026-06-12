import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, PlusCircle, User, LogOut, Users, Receipt } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Create Group', path: '/create-group', icon: PlusCircle },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-slate-950/80 border-r border-slate-800/60 flex flex-col min-h-screen text-slate-300">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-800/40 flex items-center space-x-3">
        <div className="bg-brand-500/20 p-2 rounded-xl border border-brand-500/30">
          <Receipt className="w-6 h-6 text-brand-400" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white flex items-center">
          Split<span className="text-brand-500">wise</span>
        </span>
      </div>

      {/* User Info Card */}
      {user && (
        <div className="p-6 border-b border-slate-800/40 flex items-center space-x-3">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 object-cover"
          />
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-slate-100 truncate">{user.name}</h4>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                    : 'hover:bg-slate-900/60 hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-slate-800/40">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
