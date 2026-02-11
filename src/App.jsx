import React, { useState, useEffect } from 'react';
import { 
  Users, Sword, Shield, Plus, Trash2, LogOut, 
  Settings, User, Calendar, CheckCircle, XCircle, 
  X, Crown, Activity, History, KeyRound, Edit2, Save,
  MessageSquare, Globe
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, 
  onSnapshot, updateDoc, deleteDoc, setDoc, getDoc
} from 'firebase/firestore';

/**
 * ------------------------------------------------------------------
 * Constants & Configuration
 * ------------------------------------------------------------------
 */
const CLASSES = [
  { id: 'gladiator', name: '劍星', icon: 'gladiator.webp', color: 'text-sky-400' },
  { id: 'templar', name: '守護星', icon: 'templar.webp', color: 'text-blue-400' },
  { id: 'assassin', name: '殺星', icon: 'assassin.webp', color: 'text-red-400' },
  { id: 'ranger', name: '弓星', icon: 'ranger.webp', color: 'text-amber-400' },
  { id: 'sorcerer', name: '魔導星', icon: 'sorcerer.webp', color: 'text-violet-400' },
  { id: 'spiritmaster', name: '精靈星', icon: 'spiritmaster.webp', color: 'text-purple-400' },
  { id: 'cleric', name: '治癒星', icon: 'cleric.webp', color: 'text-pink-400' },
  { id: 'chanter', name: '護法星', icon: 'chanter.webp', color: 'text-indigo-400' },
];

// --- 修改後的 Vercel/本地端程式碼 ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const appId = 'sanctuary-production'; // 您可以自訂一個 ID

// 初始化邏輯也要稍微改一下，確保 config 存在才初始化
let auth, db;
if (firebaseConfig.apiKey) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

/**
 * ------------------------------------------------------------------
 * Utility Components & Styles
 * ------------------------------------------------------------------
 */

const GlobalStyles = () => (
  <style>{`
    @keyframes breathe {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
    .animate-breathe {
      animation: breathe 4s ease-in-out infinite;
    }
    .class-icon-shadow {
      filter: drop-shadow(0 0 5px rgba(255,255,255,0.3));
    }
  `}</style>
);

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-emerald-500/90 border-emerald-400',
    error: 'bg-rose-500/90 border-rose-400',
    info: 'bg-blue-500/90 border-blue-400',
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] text-white font-medium border ${bgColors[type] || bgColors.info} flex items-center gap-2 animate-bounce-in backdrop-blur-md`}>
      {type === 'success' && <CheckCircle size={18} />}
      {type === 'error' && <XCircle size={18} />}
      {message}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900/90 border border-slate-700 w-full max-w-md rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.2)] overflow-hidden transform transition-all animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center p-4 border-b border-slate-700/50 bg-slate-800/50 sticky top-0 backdrop-blur-md z-10">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const GlassCard = ({ children, className = "" }) => (
  <div className={`relative bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

/**
 * ------------------------------------------------------------------
 * Main Application Component
 * ------------------------------------------------------------------
 */
export default function App() {
  // --- Global State ---
  const [currentUser, setCurrentUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [webhooks, setWebhooks] = useState({ logUrl: '', notifyUrl: '' });
  
  // --- Data State ---
  const [users, setUsers] = useState([]);
  const [parties, setParties] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // --- Local UI State ---
  const [view, setView] = useState('auth'); 
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState({ index: null, name: '' });
  
  // --- Inputs ---
  const [loginForm, setLoginForm] = useState({ name: '', pin: '' });
  const [createPartyForm, setCreatePartyForm] = useState({ time: '', runs: '4', twoTeams: true });
  const [newCharName, setNewCharName] = useState('');
  const [newCharClass, setNewCharClass] = useState('gladiator'); // Default class
  
  // --- Helpers ---
  const showToast = (msg, type = 'info') => setToast({ message: msg, type });

  const formatDate = (dateString) => {
    if (!dateString) return '未定';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 
    return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Helper to safely get character info (handles old string format vs new object format)
  const getCharInfo = (charData) => {
    if (typeof charData === 'string') {
      return { name: charData, job: 'unknown', icon: null };
    }
    const cls = CLASSES.find(c => c.id === charData.job);
    return { name: charData.name, job: charData.job, icon: cls ? cls.icon : null, color: cls ? cls.color : 'text-slate-200' };
  };

  // --- Discord Logic ---
  const sendDiscord = async (type, content) => {
    // type: 'log' or 'notify'
    const url = type === 'notify' ? webhooks.notifyUrl : webhooks.logUrl;
    if (!url || !url.startsWith('http')) return;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: content,
          username: "聖域系統 (Sanctuary)",
          avatar_url: "https://cdn-icons-png.flaticon.com/512/3578/3578768.png" // Generic sword icon
        }),
      });
    } catch (e) {
      console.error("Discord Webhook Error (Expected in browser due to CORS if no proxy):", e);
      // Note: Browsers block direct Discord webhook calls due to CORS usually. 
      // If this fails silently, it's a known browser limitation without a backend proxy.
      // However, we implement it as requested.
    }
  };

  const logAction = (msg) => sendDiscord('log', `[LOG] ${new Date().toLocaleTimeString()} - ${msg}`);
  const notifyAction = (msg) => sendDiscord('notify', `📣 **聖域快訊**\n${msg}`);


  // --- Auth & Data Loading Effects ---
  useEffect(() => {
    const initAuth = async () => {
      if (auth) {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } else {
        setLoading(false);
      }
    };
    initAuth();
    
    if (auth) {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (!user) setLoading(false); 
      });
      return () => unsub();
    }
  }, []);

  // Fetch Data
  useEffect(() => {
    if (auth && auth.currentUser) {
      // 1. Settings (Webhooks)
      const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (docSnap) => {
        if (docSnap.exists()) {
          setWebhooks(docSnap.data());
        }
      });

      // 2. Users
      const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Users fetch error", err));

      // 3. Parties
      const unsubParties = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'parties'), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setParties(list);
      }, (err) => console.error("Parties fetch error", err));

      // 4. Logs
      const unsubLogs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), (snap) => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Logs fetch error", err));

      setLoading(false);
      return () => { unsubSettings(); unsubUsers(); unsubParties(); unsubLogs(); };
    }
  }, [auth?.currentUser]);


  // --- Actions ---

  const handleLogin = async () => {
    const { name, pin } = loginForm;
    if (!name || pin.length !== 4) return showToast("請輸入名稱與4位數密碼", "error");

    const existingUser = users.find(u => u.name === name);

    if (existingUser) {
      if (existingUser.pin === pin) {
        setCurrentUser(existingUser);
        setView('lobby');
        showToast(`歡迎回來，${name}`, "success");
        logAction(`使用者登入: ${name}`);
      } else {
        showToast("密碼錯誤", "error");
        logAction(`登入失敗: ${name} (密碼錯誤)`);
      }
    } else {
      // Register
      const newUser = {
        name,
        pin,
        role: name === 'Wolf' ? 'admin' : 'user', 
        characters: [],
        createdAt: Date.now()
      };

      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), newUser);
          setCurrentUser({ ...newUser, id: docRef.id });
          logAction(`新使用者註冊: ${name}`);
        } catch (e) {
          console.error("Error adding user: ", e);
          return showToast("註冊失敗，請重試", "error");
        }
      }
      
      setView('lobby');
      showToast("註冊成功！", "success");
    }
  };

  const handleCreateParty = async () => {
    if (!createPartyForm.time) return showToast("請選擇出團時間", "error");

    const newParty = {
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      createdAt: Date.now(),
      scheduledTime: createPartyForm.time,
      estimatedRuns: createPartyForm.runs,
      status: 'open',
      isTwoTeams: createPartyForm.twoTeams,
      team1: Array(4).fill(null), 
      team2: createPartyForm.twoTeams ? Array(4).fill(null) : null,
    };

    if (db) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'parties'), newParty);
    }
    
    notifyAction(`${currentUser.name} 建立了一個新組隊！\n📅 時間: ${formatDate(createPartyForm.time)}\n⚔️ 場次: ${createPartyForm.runs} 場`);
    logAction(`建立組隊: by ${currentUser.name}, Time: ${createPartyForm.time}`);

    setIsCreateModalOpen(false);
    setCreatePartyForm({ time: '', runs: '4', twoTeams: true });
    showToast("組隊建立成功", "success");
  };

  const handleDeleteParty = async (partyId) => {
    if (!window.confirm("確定要刪除這個組隊嗎？")) return;
    const party = parties.find(p => p.id === partyId);
    if (db) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', partyId));
    }
    notifyAction(`❌ 組隊已取消/刪除\n建立者: ${party?.creatorName}\n時間: ${formatDate(party?.scheduledTime)}`);
    logAction(`刪除組隊: ID ${partyId} by ${currentUser.name}`);
    showToast("組隊已刪除", "info");
  };

  const handleJoinParty = async (partyId, teamKey, slotIndex, charData) => {
    // charData is now { name: "Name", job: "classId" }
    const party = parties.find(p => p.id === partyId);
    if (!party) return;

    // Check if user is already in this party
    const allSlots = [...party.team1, ...(party.team2 || [])];
    const isAlreadyInParty = allSlots.some(slot => slot && slot.userId === currentUser.id);

    if (isAlreadyInParty) {
      return showToast("您已經在這個組隊中了 (一人一角)", "error");
    }

    const newTeam = [...party[teamKey]];
    newTeam[slotIndex] = {
      userId: currentUser.id,
      userName: currentUser.name,
      charName: charData.name,
      charJob: charData.job // Store job in the slot
    };

    if (db) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', partyId), {
        [teamKey]: newTeam
      });
    }

    const className = CLASSES.find(c => c.id === charData.job)?.name || "未知";
    notifyAction(`➕ ${currentUser.name} 加入了組隊\n角色: ${charData.name} (${className})`);
    logAction(`加入組隊: ${currentUser.name} joined Party ${partyId}`);
    showToast("加入成功！", "success");
  };

  const handleLeaveParty = async (partyId, teamKey, slotIndex) => {
    const party = parties.find(p => p.id === partyId);
    if (!party) return;
    
    const slot = party[teamKey][slotIndex];
    if (slot.userId !== currentUser.id && currentUser.role !== 'admin') {
      return showToast("你不能踢出別人", "error");
    }

    const newTeam = [...party[teamKey]];
    newTeam[slotIndex] = null;

    if (db) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', partyId), {
        [teamKey]: newTeam
      });
    }

    notifyAction(`➖ ${slot.userName} 離開了組隊\n角色: ${slot.charName}`);
    logAction(`離開組隊: ${slot.userName} left Party ${partyId}`);
    showToast("已離開位置", "info");
  };

  const handleCompleteParty = async (party) => {
    if (!window.confirm("確定標記為已完成嗎？這將會封存紀錄。")) return;

    const logEntry = {
      partyId: party.id,
      completedAt: Date.now(),
      scheduledTime: party.scheduledTime,
      runs: party.estimatedRuns,
      participants: [
        ...(party.team1 || []).filter(s => s),
        ...(party.team2 || []).filter(s => s)
      ]
    };

    if (db) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), logEntry);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', party.id), { status: 'completed' });
    }
    
    notifyAction(`✅ 組隊通關完成！\n隊長: ${party.creatorName}\n時間: ${formatDate(party.scheduledTime)}\n場次: ${party.estimatedRuns}`);
    logAction(`完成組隊: Party ${party.id} completed`);
    showToast("組隊已完成並封存", "success");
  };

  // NEW: Updated to handle object structure { name, job }
  const handleAddCharacter = async () => {
    if (!newCharName.trim()) return;
    
    const newCharObj = {
        name: newCharName.trim(),
        job: newCharClass
    };

    const updatedChars = [...(currentUser.characters || []), newCharObj];
    
    setCurrentUser({ ...currentUser, characters: updatedChars });

    if (db) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), {
        characters: updatedChars
      });
    }
    
    logAction(`新增角色: ${currentUser.name} added ${newCharObj.name} (${newCharObj.job})`);
    setNewCharName('');
    showToast("角色已新增", "success");
  };

  const handleUpdateCharacter = async () => {
    const { index, name } = editingChar;
    if (!name.trim() || index === null) return;
    
    const updatedChars = [...currentUser.characters];
    // Keep the existing job, only update name. 
    // Need to handle if the existing entry is just a string (old format)
    const oldEntry = updatedChars[index];
    const job = typeof oldEntry === 'string' ? 'unknown' : oldEntry.job;
    
    updatedChars[index] = { name: name.trim(), job };
    
    setCurrentUser({ ...currentUser, characters: updatedChars });
    
    if (db) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), {
        characters: updatedChars
      });
    }
    setEditingChar({ index: null, name: '' });
    showToast("角色名稱已更新", "success");
  };

  const handleRemoveCharacter = async (charData) => {
    // charData could be string or object
    const charName = typeof charData === 'string' ? charData : charData.name;
    const updatedChars = currentUser.characters.filter(c => {
        const cName = typeof c === 'string' ? c : c.name;
        return cName !== charName;
    });

    setCurrentUser({ ...currentUser, characters: updatedChars });
    
    if (db) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), {
        characters: updatedChars
      });
    }
  };
  
  const handleAdminResetPin = async (userId, newPin) => {
      if(db) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { pin: newPin });
          logAction(`管理員重設密碼: for User ID ${userId}`);
      }
      showToast("密碼已重設", "success");
  }

  const handleSaveWebhooks = async () => {
      if(db) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), webhooks);
          logAction(`系統設定更新: Webhooks updated`);
          showToast("Webhook 設定已儲存", "success");
      }
  }

  // --- Sub-Components ---

  const SlotButton = ({ slot, onJoin, onLeave }) => {
    if (!slot) {
      return (
        <button 
          onClick={onJoin}
          className="h-14 w-full border border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:border-emerald-400 hover:bg-emerald-400/10 transition-all group"
        >
          <Plus className="group-hover:scale-110 transition-transform" />
        </button>
      );
    }
    
    const isMe = slot.userId === currentUser.id;
    // slot.charJob should be stored in party data. If not (old data), fallback.
    const jobInfo = CLASSES.find(c => c.id === slot.charJob);

    return (
      <div className={`h-14 w-full rounded-lg flex items-center justify-between px-3 border transition-all ${isMe ? 'bg-violet-600/20 border-violet-500/50' : 'bg-slate-700/50 border-slate-600'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
            {/* Class Icon */}
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center shrink-0 relative overflow-hidden">
                {jobInfo ? (
                    <img src={jobInfo.icon} alt={jobInfo.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-xs text-slate-500">?</span>
                )}
            </div>
            
            <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-slate-400 truncate">{slot.userName}</span>
                <span className={`text-sm font-bold truncate ${isMe ? 'text-violet-300' : jobInfo ? jobInfo.color : 'text-slate-200'}`}>
                    {slot.charName}
                </span>
            </div>
        </div>
        {(isMe || currentUser.role === 'admin') && (
          <button onClick={onLeave} className="text-slate-500 hover:text-rose-400 p-1">
            <X size={16} />
          </button>
        )}
      </div>
    );
  };

  const PartyCard = ({ party }) => {
    const [selectedSlot, setSelectedSlot] = useState(null); 

    const handleSlotClick = (teamKey, index) => {
        if (!currentUser.characters || currentUser.characters.length === 0) {
            showToast("請先至個人頁面新增角色！", "error");
            setView('profile');
            return;
        }
        setSelectedSlot({ teamKey, index });
    };

    const confirmJoin = (charData) => {
        handleJoinParty(party.id, selectedSlot.teamKey, selectedSlot.index, charData);
        setSelectedSlot(null);
    };

    return (
      <GlassCard className="p-0 animate-slide-up hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-shadow duration-300">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 border-b border-slate-700 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-violet-500/20 text-violet-300 text-xs px-2 py-0.5 rounded border border-violet-500/30 flex items-center gap-1">
                <Calendar size={12} /> {formatDate(party.scheduledTime)}
              </span>
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1">
                <Activity size={12} /> {party.estimatedRuns} 場
              </span>
            </div>
            <div className="text-slate-400 text-xs mt-1">
              隊長: <span className="text-slate-300">{party.creatorName}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {(currentUser.id === party.creatorId || currentUser.role === 'admin') && (
               <>
                <button 
                  onClick={() => handleCompleteParty(party)}
                  className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors"
                  title="標記完成"
                >
                    <CheckCircle size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteParty(party.id)}
                  className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-full transition-colors"
                  title="刪除"
                >
                    <Trash2 size={18} />
                </button>
               </>
            )}
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Sword size={12} /> 第一小隊
             </h4>
             {party.team1.map((slot, i) => (
               <SlotButton 
                 key={i} 
                 slot={slot} 
                 onJoin={() => handleSlotClick('team1', i)} 
                 onLeave={() => handleLeaveParty(party.id, 'team1', i)} 
               />
             ))}
          </div>

          {party.isTwoTeams && (
            <div className="space-y-2 md:border-l md:border-slate-700 md:pl-4">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Shield size={12} /> 第二小隊
               </h4>
               {party.team2.map((slot, i) => (
                 <SlotButton 
                    key={i} 
                    slot={slot} 
                    onJoin={() => handleSlotClick('team2', i)} 
                    onLeave={() => handleLeaveParty(party.id, 'team2', i)} 
                />
               ))}
            </div>
          )}
        </div>
        
        {selectedSlot && (
            <div className="absolute inset-0 bg-slate-900/95 z-10 flex flex-col items-center justify-center p-4 animate-fade-in">
                <h3 className="text-white mb-4 font-bold">選擇出戰角色</h3>
                <div className="w-full max-h-60 overflow-y-auto space-y-2 mb-4 px-2">
                    {currentUser.characters.map((char, idx) => {
                        const info = getCharInfo(char);
                        return (
                            <button 
                                key={idx}
                                onClick={() => confirmJoin(char)} // Pass the whole char object (or string)
                                className="w-full p-2 bg-slate-800 hover:bg-violet-600 hover:text-white rounded-lg transition-colors flex items-center gap-3 border border-slate-700"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center overflow-hidden">
                                     {info.icon ? <img src={info.icon} alt={info.job} className="w-full h-full object-cover"/> : <span className="text-xs text-slate-500">?</span>}
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-slate-200 text-sm font-bold">{info.name}</span>
                                    <span className={`text-xs ${info.color}`}>{CLASSES.find(c => c.id === info.job)?.name || '未知職業'}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <button 
                    onClick={() => setSelectedSlot(null)}
                    className="text-slate-500 hover:text-white text-sm"
                >
                    取消
                </button>
            </div>
        )}
      </GlassCard>
    );
  };

  // --- Main Render ---
  
  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-[#0a0a16] flex items-center justify-center p-4 relative overflow-hidden">
        <GlobalStyles />
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-900/20 rounded-full blur-[100px] animate-breathe"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px] animate-breathe" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
           <div className="text-center mb-8 animate-fade-in-down">
              <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-2xl rotate-45 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.4)]">
                 <Sword className="text-white -rotate-45" size={32} />
              </div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-slate-400 mb-2">
                聖域小號系統
              </h1>
              <p className="text-slate-500 text-sm tracking-widest uppercase">Sanctuary Alt System</p>
           </div>

           <GlassCard className="p-8 backdrop-blur-xl bg-slate-800/60 border-slate-700/50">
              <div className="space-y-4">
                 <div>
                   <label className="block text-slate-400 text-xs uppercase font-bold mb-2 text-center">使用者名稱</label>
                   <input 
                     type="text" 
                     value={loginForm.name}
                     onChange={(e) => setLoginForm({...loginForm, name: e.target.value})}
                     className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-violet-500 transition-colors text-center"
                     placeholder="輸入您的暱稱"
                   />
                 </div>
                 <div>
                   <label className="block text-slate-400 text-xs uppercase font-bold mb-2 text-center">4位數 PIN 碼</label>
                   <input 
                     type="password" 
                     maxLength="4"
                     value={loginForm.pin}
                     onChange={(e) => setLoginForm({...loginForm, pin: e.target.value.replace(/\D/g, '')})}
                     className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-violet-500 transition-colors tracking-widest text-center text-lg"
                     placeholder="••••"
                   />
                   <p className="text-xs text-slate-500 mt-2 text-center">初次使用將自動註冊</p>
                 </div>
                 <button 
                   onClick={handleLogin}
                   className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transform hover:-translate-y-1 transition-all"
                 >
                   進入聖域
                 </button>
              </div>
           </GlassCard>
        </div>
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // App Layout
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-200 font-sans pb-20 relative">
      <GlobalStyles />
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[10%] right-[20%] w-[30vw] h-[30vw] bg-violet-900/10 rounded-full blur-[120px] animate-breathe"></div>
          <div className="absolute bottom-[10%] left-[10%] w-[25vw] h-[25vw] bg-indigo-900/10 rounded-full blur-[100px] animate-breathe" style={{ animationDelay: '2.5s' }}></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0f0f1a]/80 backdrop-blur-lg border-b border-slate-800 px-4 py-3 flex justify-between items-center">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-lg rotate-12 flex items-center justify-center shadow-lg">
               <Sword size={16} className="text-white -rotate-12" />
            </div>
            <h1 className="font-bold text-lg text-slate-100 hidden sm:block">聖域小號系統</h1>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
               <User size={14} className="text-violet-400" />
               <span className="text-sm font-medium">{currentUser?.name}</span>
            </div>
            <button 
              onClick={() => { setView('auth'); setCurrentUser(null); }}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={20} />
            </button>
         </div>
      </header>

      {/* Navigation Tabs */}
      <div className="container mx-auto max-w-4xl px-4 mt-6 z-10 relative">
        <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800 backdrop-blur-sm mb-6">
           <button 
             onClick={() => setView('lobby')}
             className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${view === 'lobby' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <Users size={16} /> 副本大廳
           </button>
           <button 
             onClick={() => setView('profile')}
             className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${view === 'profile' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <Settings size={16} /> 角色管理
           </button>
           {currentUser?.role === 'admin' && (
             <button 
               onClick={() => setView('admin')}
               className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${view === 'admin' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
             >
               <Crown size={16} /> Wolf 領域
             </button>
           )}
        </div>

        {/* --- View: Lobby --- */}
        {view === 'lobby' && (
          <div className="animate-fade-in space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">當前組隊</h2>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
                >
                  <Plus size={18} /> 建立組隊
                </button>
             </div>
             
             <div className="grid gap-6">
                {parties.filter(p => p.status === 'open').length === 0 ? (
                    <div className="text-center py-20 text-slate-600">
                        <Sword size={48} className="mx-auto mb-4 opacity-20" />
                        <p>目前沒有開放的組隊，當個隊長吧！</p>
                    </div>
                ) : (
                    parties.filter(p => p.status === 'open').map(party => (
                      <PartyCard key={party.id} party={party} />
                    ))
                )}
             </div>
          </div>
        )}

        {/* --- View: Profile --- */}
        {view === 'profile' && (
          <div className="animate-fade-in">
             <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Settings className="text-violet-400" /> 我的角色庫
                </h2>
                
                {/* Add Character Form */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-6">
                    <h3 className="text-sm text-slate-400 mb-3 font-bold uppercase tracking-wider">新增角色</h3>
                    <div className="flex flex-col md:flex-row gap-4">
                        <input 
                            type="text" 
                            value={newCharName}
                            onChange={(e) => setNewCharName(e.target.value)}
                            placeholder="輸入角色名稱"
                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-violet-500 text-white"
                        />
                        <select 
                            value={newCharClass}
                            onChange={(e) => setNewCharClass(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500"
                        >
                            {CLASSES.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleAddCharacter}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-emerald-900/20"
                        >
                            新增
                        </button>
                    </div>
                </div>

                {/* Character List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {(!currentUser?.characters || currentUser.characters.length === 0) && (
                       <p className="text-slate-500 text-center py-4 col-span-2">尚未新增任何角色，快去新增吧！</p>
                   )}
                   {currentUser?.characters?.map((char, index) => {
                      const info = getCharInfo(char);
                      return (
                          <div key={index} className="flex justify-between items-center bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 group hover:border-violet-500/30 transition-colors">
                             {editingChar.index === index ? (
                               <div className="flex flex-1 gap-2 items-center">
                                 <input 
                                    type="text" 
                                    value={editingChar.name}
                                    onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                    autoFocus
                                 />
                                 <button onClick={handleUpdateCharacter} className="text-emerald-400 p-1 hover:bg-emerald-400/20 rounded"><Save size={16}/></button>
                                 <button onClick={() => setEditingChar({ index: null, name: '' })} className="text-slate-400 p-1 hover:bg-slate-600 rounded"><X size={16}/></button>
                               </div>
                             ) : (
                               <>
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center overflow-hidden">
                                         {info.icon ? (
                                             <img src={info.icon} alt={info.job} className="w-full h-full object-cover" />
                                         ) : (
                                             <span className="text-slate-500 font-bold text-xs">?</span>
                                         )}
                                     </div>
                                     <div>
                                         <div className="font-bold text-slate-200">{info.name}</div>
                                         <div className={`text-xs ${info.color}`}>{CLASSES.find(c => c.id === info.job)?.name || '未知職業'}</div>
                                     </div>
                                 </div>
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                       onClick={() => setEditingChar({ index, name: info.name })}
                                       className="text-slate-500 hover:text-blue-400 p-2"
                                       title="修改名稱"
                                     >
                                        <Edit2 size={16} />
                                     </button>
                                     <button 
                                       onClick={() => handleRemoveCharacter(info.name)}
                                       className="text-slate-500 hover:text-rose-400 p-2"
                                       title="刪除角色"
                                     >
                                        <Trash2 size={16} />
                                     </button>
                                 </div>
                               </>
                             )}
                          </div>
                      );
                   })}
                </div>
             </GlassCard>
          </div>
        )}

        {/* --- View: Admin --- */}
        {view === 'admin' && currentUser?.role === 'admin' && (
          <div className="animate-fade-in space-y-8">
             {/* System Settings */}
             <GlassCard className="p-6 border-violet-500/30">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                     <Globe size={20} className="text-violet-400" /> 系統設定 (Discord)
                 </h3>
                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs text-slate-400 mb-1">Log Webhook URL (紀錄所有操作)</label>
                         <input 
                            type="password" 
                            value={webhooks.logUrl}
                            onChange={(e) => setWebhooks({...webhooks, logUrl: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                            placeholder="https://discord.com/api/webhooks/..."
                         />
                     </div>
                     <div>
                         <label className="block text-xs text-slate-400 mb-1">Notification Webhook URL (組隊通知)</label>
                         <input 
                            type="password" 
                            value={webhooks.notifyUrl}
                            onChange={(e) => setWebhooks({...webhooks, notifyUrl: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                            placeholder="https://discord.com/api/webhooks/..."
                         />
                     </div>
                     <button 
                        onClick={handleSaveWebhooks}
                        className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded text-sm font-bold"
                     >
                         儲存設定
                     </button>
                 </div>
             </GlassCard>

             {/* Stats Section */}
             <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                        <History size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{logs.length}</div>
                        <div className="text-xs text-slate-400">已完成場次</div>
                    </div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-fuchsia-500/20 text-fuchsia-400">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{users.length}</div>
                        <div className="text-xs text-slate-400">總使用者</div>
                    </div>
                </GlassCard>
             </div>

             {/* User Management */}
             <GlassCard className="p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <KeyRound size={20} className="text-rose-400" /> 使用者管理
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-xs uppercase bg-slate-800/50 text-slate-300">
                            <tr>
                                <th className="px-4 py-3">名稱</th>
                                <th className="px-4 py-3">密碼</th>
                                <th className="px-4 py-3">角色數</th>
                                <th className="px-4 py-3">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-800/30">
                                    <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                                    <td className="px-4 py-3 font-mono text-violet-300">{u.pin}</td>
                                    <td className="px-4 py-3">{u.characters?.length || 0}</td>
                                    <td className="px-4 py-3">
                                        <button 
                                            onClick={() => {
                                                const newP = prompt(`為 ${u.name} 設定新密碼:`);
                                                if(newP && newP.length === 4) handleAdminResetPin(u.id, newP);
                                            }}
                                            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded"
                                        >
                                            重設密碼
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </GlassCard>

             {/* Logs */}
             <GlassCard className="p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-400" /> 通關紀錄
                </h3>
                <div className="space-y-3">
                    {logs.length === 0 && <p className="text-slate-500">尚無紀錄</p>}
                    {logs.map((log, i) => (
                        <div key={i} className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                            <div className="flex justify-between mb-2">
                                <span className="text-emerald-400 font-bold">{formatDate(log.scheduledTime)}</span>
                                <span className="text-slate-500 text-xs">{new Date(log.completedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-sm text-slate-300 mb-2">
                                完成場次: {log.runs} 場
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {log.participants.map((p, idx) => (
                                    <span key={idx} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                                        {p.userName} ({p.charName})
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
             </GlassCard>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title="建立新組隊"
      >
         <div className="space-y-4">
            <div>
                <label className="block text-slate-400 text-sm mb-1">預計出團時間</label>
                <div className="relative">
                  <input 
                      type="datetime-local" 
                      value={createPartyForm.time}
                      onChange={(e) => setCreatePartyForm({...createPartyForm, time: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                  />
                </div>
            </div>
            <div>
                <label className="block text-slate-400 text-sm mb-1">預計場次</label>
                <input 
                    type="number" 
                    min="1"
                    value={createPartyForm.runs}
                    onChange={(e) => setCreatePartyForm({...createPartyForm, runs: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-violet-500 focus:outline-none"
                />
            </div>
            <div className="flex items-center gap-3 pt-2">
                <input 
                    type="checkbox" 
                    id="twoTeams"
                    checked={createPartyForm.twoTeams}
                    onChange={(e) => setCreatePartyForm({...createPartyForm, twoTeams: e.target.checked})}
                    className="w-5 h-5 accent-violet-500 rounded cursor-pointer"
                />
                <label htmlFor="twoTeams" className="text-white cursor-pointer select-none">開啟第二小隊 (共8人)</label>
            </div>
            <button 
                onClick={handleCreateParty}
                className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded-lg transition-colors"
            >
                發布組隊
            </button>
         </div>
      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}