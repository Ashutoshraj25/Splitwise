import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsAPI, expensesAPI, settlementsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import AddExpenseModal from '../components/AddExpenseModal';
import SettlementModal from '../components/SettlementModal';
import { 
  ArrowLeft, Plus, DollarSign, Users, UserPlus, UserMinus, 
  Trash2, Edit, MessageSquare, Send, Sparkles, MessageCircle, 
  ArrowRight, ShieldCheck, FileText, CheckCircle, ChevronDown, ChevronUp 
} from 'lucide-react';

const GroupDetails = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  
  // Add Member State
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  
  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  // Tabs: 'expenses' or 'settlements'
  const [activeTab, setActiveTab] = useState('expenses');

  const messagesEndRef = useRef(null);

  const fetchGroupDetails = async () => {
    try {
      const res = await groupsAPI.getGroupDetails(groupId);
      setGroup(res.data.data);
    } catch (error) {
      console.error('Error fetching group details:', error);
      showToast('Failed to load group details.', 'error');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const res = await groupsAPI.getMessages(groupId);
      setMessages(res.data.data);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchGroupDetails();
    fetchChatMessages();
  }, [groupId]);

  // Handle Socket Chat Room Connection
  useEffect(() => {
    if (!socket || !groupId || !currentUser) return;

    // Join room
    socket.emit('joinGroup', { groupId, userId: currentUser.id });

    // Listen for new messages
    socket.on('messageReceived', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('messageReceived');
    };
  }, [socket, groupId, currentUser]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    setAddingMember(true);
    try {
      await groupsAPI.addMember(groupId, memberEmail.trim());
      showToast('Member added successfully!');
      setMemberEmail('');
      fetchGroupDetails();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add member.', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName}?`)) return;

    try {
      await groupsAPI.removeMember(groupId, userId);
      showToast('Member removed successfully.');
      fetchGroupDetails();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to remove member.', 'error');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      await expensesAPI.deleteExpense(expenseId);
      showToast('Expense deleted successfully.');
      fetchGroupDetails();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete expense.', 'error');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    socket.emit('sendMessage', {
      groupId,
      senderId: currentUser.id,
      content: chatInput.trim()
    });

    setChatInput('');
  };

  const handleEditExpense = (expense) => {
    setExpenseToEdit(expense);
    setIsAddExpenseOpen(true);
  };

  const handleOpenAddExpense = () => {
    setExpenseToEdit(null);
    setIsAddExpenseOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-brand-500 animate-spin glow-green"></div>
        <p className="text-slate-400 font-medium">Loading group details...</p>
      </div>
    );
  }

  // Active user's balance in this group
  const currentUserBalance = group?.balances?.find(b => b.userId === currentUser.id);

  return (
    <div className="relative space-y-8 animate-slide-in">
      {/* Header Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-semibold">Back to Dashboard</span>
      </button>

      {/* Main Info Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-800/40">
        <div className="flex items-center space-x-4">
          <img
            src={group.avatarUrl}
            alt={group.name}
            className="w-16 h-16 rounded-2xl border border-slate-700 bg-slate-800 object-cover"
          />
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{group.name}</h1>
            <p className="text-slate-400 text-sm mt-1">{group.description || 'No description provided.'}</p>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsSettleOpen(true)}
            className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-900 text-slate-200 font-semibold transition-colors duration-200"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Settle Up</span>
          </button>
          
          <button
            onClick={handleOpenAddExpense}
            className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-brand-600/20"
          >
            <Plus className="w-5 h-5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Ledgers (Expenses / Settlements) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab Selector */}
          <div className="flex border-b border-slate-800/60 pb-px">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                activeTab === 'expenses'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Expenses</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold ml-1">
                {group.expenses?.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settlements')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                activeTab === 'settlements'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Settlement History</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold ml-1">
                {group.settlements?.length}
              </span>
            </button>
          </div>

          {/* Expenses Tab content */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              {group.expenses?.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="bg-slate-900/50 p-4 rounded-full border border-slate-800">
                    <DollarSign className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-300">No expenses recorded</h4>
                    <p className="text-slate-500 mt-1 max-w-xs mx-auto">Create a shared expense to split bills among group members.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {group.expenses.map((expense) => {
                    const isPayer = expense.paidById === currentUser.id;
                    const splitForCurrentUser = expense.splits.find(s => s.userId === currentUser.id);
                    
                    return (
                      <div
                        key={expense.id}
                        className="glass-card rounded-2xl p-5 hover:bg-slate-800/20 transition-colors border border-slate-800/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      >
                        <div className="flex items-center space-x-4">
                          <img
                            src={expense.payer?.avatarUrl}
                            alt={expense.payer?.name}
                            className="w-11 h-11 rounded-full border border-slate-700 bg-slate-800 object-cover"
                          />
                          <div>
                            <h4 className="font-bold text-slate-100">{expense.description}</h4>
                            <p className="text-xs text-slate-400 mt-1">
                              Paid by <span className="font-semibold text-slate-300">{isPayer ? 'You' : expense.payer?.name}</span> on {new Date(expense.date).toLocaleDateString()}
                            </p>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-semibold mt-2 inline-block">
                              {expense.splitMethod}
                            </span>
                          </div>
                        </div>

                        {/* Balance split text details */}
                        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-6">
                          <div className="text-left md:text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500">Expense Amount</p>
                            <p className="text-lg font-extrabold text-slate-200">${parseFloat(expense.amount).toFixed(2)}</p>
                          </div>

                          <div className="text-left md:text-right">
                            {isPayer ? (
                              <div>
                                <p className="text-[10px] uppercase font-bold text-emerald-500">You lent</p>
                                <p className="text-lg font-extrabold text-emerald-400">
                                  ${(parseFloat(expense.amount) - (splitForCurrentUser ? parseFloat(splitForCurrentUser.amount) : 0)).toFixed(2)}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-[10px] uppercase font-bold text-rose-500">You owe</p>
                                <p className="text-lg font-extrabold text-rose-400">
                                  ${splitForCurrentUser ? parseFloat(splitForCurrentUser.amount).toFixed(2) : '0.00'}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Actions buttons */}
                          <div className="flex space-x-1.5 self-center">
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="p-2 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
                              title="Edit Expense"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 rounded-xl border border-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Settlements Tab content */}
          {activeTab === 'settlements' && (
            <div className="space-y-4">
              {group.settlements?.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="bg-slate-900/50 p-4 rounded-full border border-slate-800">
                    <CheckCircle className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-300">No settlements logged</h4>
                    <p className="text-slate-500 mt-1 max-w-xs mx-auto">Logged payments will appear here as members settle their balances.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-slide-in">
                  {group.settlements.map((settlement) => {
                    const isPayer = settlement.payerId === currentUser.id;
                    const isPayee = settlement.payeeId === currentUser.id;
                    
                    return (
                      <div
                        key={settlement.id}
                        className="glass-card rounded-2xl p-4 border border-slate-800/40 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="flex -space-x-2.5">
                            <img
                              src={settlement.payer?.avatarUrl}
                              alt={settlement.payer?.name}
                              className="w-9 h-9 rounded-full border border-slate-800 bg-slate-850 object-cover z-10"
                            />
                            <img
                              src={settlement.payee?.avatarUrl}
                              alt={settlement.payee?.name}
                              className="w-9 h-9 rounded-full border border-slate-800 bg-slate-850 object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-200 flex items-center flex-wrap">
                              <span className="text-slate-100">{isPayer ? 'You' : settlement.payer?.name}</span>
                              <span className="mx-1.5 text-xs text-slate-500 font-normal">paid</span>
                              <span className="text-slate-100">{isPayee ? 'You' : settlement.payee?.name}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Recorded on {new Date(settlement.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs uppercase font-extrabold text-slate-500 block">Amount</span>
                          <span className="text-base font-extrabold text-emerald-400">${parseFloat(settlement.amount).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Balances and Members */}
        <div className="space-y-6">

          {/* User Net Balance Status Summary Card */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800/60 relative overflow-hidden">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Your Group Status</h3>
            {currentUserBalance ? (
              <div>
                {currentUserBalance.netBalance > 0.01 ? (
                  <div>
                    <span className="text-3xl font-extrabold text-emerald-400">${currentUserBalance.netBalance.toFixed(2)}</span>
                    <p className="text-xs text-emerald-500 mt-2 font-medium">You are overall owed in this group.</p>
                  </div>
                ) : currentUserBalance.netBalance < -0.01 ? (
                  <div>
                    <span className="text-3xl font-extrabold text-rose-400">${Math.abs(currentUserBalance.netBalance).toFixed(2)}</span>
                    <p className="text-xs text-rose-500 mt-2 font-medium">You overall owe group members.</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl font-extrabold text-slate-400">$0.00</span>
                    <p className="text-xs text-slate-500 mt-2 font-medium">You are all settled up!</p>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xl font-bold text-slate-400">$0.00</span>
            )}
          </div>

          {/* Simplified Debts ledger */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800/60">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
              <Sparkles className="w-4.5 h-4.5 text-brand-400 animate-pulse" />
              <span>Who owes whom</span>
            </h3>

            {group.debts?.length === 0 ? (
              <p className="text-sm text-slate-500 py-3 text-center">Everyone is fully settled up!</p>
            ) : (
              <div className="space-y-3.5">
                {group.debts?.map((debt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-800/30 text-xs"
                  >
                    <div className="flex items-center space-x-2 text-slate-300">
                      <span className="font-bold text-slate-100">{debt.from === currentUser.id ? 'You' : debt.fromName}</span>
                      <span className="text-slate-500">owes</span>
                      <span className="font-bold text-slate-100">{debt.to === currentUser.id ? 'You' : debt.toName}</span>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-rose-400">${debt.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800/60 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Users className="w-4.5 h-4.5 text-brand-400" />
              <span>Members ({group.members?.length})</span>
            </h3>

            {/* Add member form */}
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="email"
                placeholder="Friend's email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="flex-1 py-2 px-3 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                required
              />
              <button
                type="submit"
                disabled={addingMember}
                className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors"
                title="Add member"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </form>

            {/* Members roster */}
            <div className="space-y-3 pt-2 max-h-56 overflow-y-auto pr-1">
              {group.members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 object-cover"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      {member.name} {member.id === currentUser.id && '(You)'}
                    </span>
                  </div>

                  {member.id !== currentUser.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-all duration-150"
                      title="Remove Member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Floating Chat Drawer button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 z-40 bg-brand-600 hover:bg-brand-500 p-4 rounded-full shadow-2xl flex items-center justify-center text-white glow-green hover:scale-105 transition-all duration-200"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="ml-2 font-bold text-sm">Group Chat</span>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {messages.length}
          </span>
        )}
      </button>

      {/* Slide-out Real-time Chat Drawer */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 md:w-96 h-[500px] glass-card rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden animate-slide-in">
          {/* Chat Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-100 font-bold">
              <MessageSquare className="w-4.5 h-4.5 text-brand-400" />
              <span>Group Discussion</span>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-900 transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Messages pane */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-700" />
                <p className="text-xs text-slate-500">No comments yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelf = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex items-start gap-2.5 ${isSelf ? 'flex-row-reverse' : ''}`}>
                    <img
                      src={msg.sender?.avatarUrl}
                      alt={msg.sender?.name}
                      className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 object-cover flex-shrink-0"
                    />
                    <div className="max-w-[70%]">
                      <div className={`p-3 rounded-2xl text-xs leading-normal ${
                        isSelf 
                          ? 'bg-brand-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50'
                      }`}>
                        {!isSelf && <span className="block font-bold text-[10px] text-brand-400 mb-1">{msg.sender?.name}</span>}
                        <p>{msg.content}</p>
                      </div>
                      <span className={`text-[9px] text-slate-500 mt-1 block ${isSelf ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800/80 flex gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 py-2 px-3.5 text-xs rounded-xl border border-slate-850 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              required
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        groupMembers={group.members}
        currentUser={currentUser}
        onExpenseAdded={fetchGroupDetails}
        expenseToEdit={expenseToEdit}
      />

      {/* Settlement Modal */}
      <SettlementModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        groupMembers={group.members}
        groupId={group.id}
        onSettlementRecorded={fetchGroupDetails}
      />

    </div>
  );
};

export default GroupDetails;
