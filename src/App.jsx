import React, { useState, useEffect } from 'react';
import { 
  Users, Sword, Shield, Plus, Trash2, LogOut, 
  Settings, User, Calendar, CheckCircle, XCircle, 
  X, Crown, Activity, History, KeyRound, Edit2, Save,
  Globe, AlertTriangle, GripVertical, UserMinus, Star, Copy, Bell
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, 
  onSnapshot, updateDoc, deleteDoc, setDoc
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
  { id: 'ranger', name: '弓星', icon: 'ranger.webp', color: 'text-emerald-400' },
  { id: 'sorcerer', name: '魔導星', icon: 'sorcerer.webp', color: 'text-violet-400' },
  { id: 'spiritmaster', name: '精靈星', icon: 'spiritmaster.webp', color: 'text-purple-400' },
  { id: 'cleric', name: '治癒星', icon: 'cleric.webp', color: 'text-rose-400' }, 
  { id: 'chanter', name: '護法星', icon: 'chanter.webp', color: 'text-rose-400' }, 
];

const ADMIN_USERS = ['Wolf', '水野']; 

const firebaseConfig = {
  apiKey: "AIzaSyCYgTY7d4jvq-q2yj-jtlRfHRysOc-4Fc4",
  authDomain: "sanui-8cdf1.firebaseapp.com",
  projectId: "sanui-8cdf1",
  storageBucket: "sanui-8cdf1.firebasestorage.app",
  messagingSenderId: "444368977868",
  appId: "1:444368977868:web:fb70a03a256f012c9ae769",
  measurementId: "G-M988BQMECB"
};

const appId = 'sanui';

let auth, db;

if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("請在此填入")) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase 初始化失敗:", error);
  }
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

// --- 取得外框樣式的輔助函數 ---
const getCharBorderClass = (job, isMain) => {
    let classes = 'border ';
    if (['cleric', 'chanter'].includes(job)) {
        classes += 'border-rose-500 ';
    } else if (job === 'ranger') {
        classes += 'border-emerald-500 ';
    } else {
        classes += 'border-slate-600 ';
    }
    if (isMain) {
        classes += 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_10px_rgba(251,191,36,0.3)] ';
    }
    return classes;
};

/**
 * ------------------------------------------------------------------
 * Main Application Component
 * ------------------------------------------------------------------
 */
export default function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [webhooks, setWebhooks] = useState({ logUrl: '', notifyUrl: '' });
  const [servers, setServers] = useState([]); 
  const [newServerName, setNewServerName] = useState(''); 
  
  const [users, setUsers] = useState([]);
  const [parties, setParties] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [view, setView] = useState('auth'); 
  const [lobbyFilter, setLobbyFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState({ index: null, name: '' });
  
  const [loginForm, setLoginForm] = useState({ name: '', pin: '' });
  const [createPartyForm, setCreatePartyForm] = useState({ time: '', runs: '4', twoTeams: true });
  const [selectedReserveUsers, setSelectedReserveUsers] = useState([]); 
  
  const [newCharName, setNewCharName] = useState('');
  const [newCharClass, setNewCharClass] = useState('gladiator');
  const [newCharServer, setNewCharServer] = useState(''); 
  const [newCharIsMain, setNewCharIsMain] = useState(false); 
  
  const showToast = (msg, type = 'info') => setToast({ message: msg, type });

  useEffect(() => {
      if (servers.length > 0 && !servers.includes(newCharServer)) {
          setNewCharServer(servers[0]);
      }
  }, [servers]);

  const formatDate = (dateString) => {
    if (!dateString) return '未定';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 
    return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getCharInfo = (charData) => {
    if (typeof charData === 'string') return { name: charData, job: 'unknown', icon: null, isMain: false };
    const cls = CLASSES.find(c => c.id === charData.job);
    return { name: charData.name, job: charData.job, icon: cls ? cls.icon : null, color: cls ? cls.color : 'text-slate-200', isMain: charData.isMain || false };
  };

  const getLastResetTime = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); 
    let daysSinceReset = dayOfWeek - 3;
    if (daysSinceReset < 0) daysSinceReset += 7;
    const resetDate = new Date(now);
    resetDate.setDate(now.getDate() - daysSinceReset);
    resetDate.setHours(12, 0, 0, 0);
    if (dayOfWeek === 3 && now.getHours() < 12) resetDate.setDate(resetDate.getDate() - 7);
    return resetDate.getTime();
  };

  const getCharacterWeeklyRuns = (charName, userId) => {
    const resetTime = getLastResetTime();
    let runs = 0;
    logs.forEach(log => {
      if (log.completedAt >= resetTime) {
        log.participants.forEach(p => {
          if (p && p.userId === userId && p.charName === charName) runs += parseInt(log.runs || 1, 10);
        });
      }
    });
    return runs;
  };

  // --- Discord Webhook 邏輯 ---
  const sendDiscordLog = async (msg) => {
    const url = webhooks.logUrl;
    if (!url || !url.startsWith('http')) return;
    try { 
        await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ content: `[系統日誌] ${new Date().toLocaleTimeString()} - ${msg}`, username: "聖域紀錄員" }) 
        }); 
    } catch (e) { }
  };
  const logAction = (msg) => sendDiscordLog(msg);

  // 🔔 [核心新增] Discord 出團提醒 (排版 Embed)
  const handleNotifyParty = async (party) => {
      if (!webhooks.notifyUrl || !webhooks.notifyUrl.startsWith('http')) {
          return showToast("請先在管理員領域設定 Notification Webhook URL", "error");
      }

      let pings = []; // 收集所有要 Tag 的人

      const formatTeam = (team) => {
          if (!team || team.length === 0) return "無";
          return team.map((slot) => {
              if (!slot) return `> \`[空位]\` 等待加入...`;
              const u = users.find(user => user.id === slot.userId);
              let mention = slot.userName;
              
              // 如果有綁定 Discord ID，就轉換成 Tag 格式
              if (u && u.discordId) {
                  mention = `<@${u.discordId}>`;
                  pings.push(mention); // 加入待 Tag 列表
              }
              
              const charDisplay = slot.charName 
                  ? `**${slot.charName}** (${CLASSES.find(c=>c.id === slot.charJob)?.name || '未知'})` 
                  : '*保留位 (尚未選角)*';
              
              return `> ${mention} ➔ ${charDisplay}`;
          }).join('\n');
      };

      const team1Field = formatTeam(party.team1);
      const team2Field = party.isTwoTeams ? formatTeam(party.team2) : null;

      // 確保 Tag 不重複
      const uniquePings = [...new Set(pings)].join(' ');

      const payload = {
          content: `🔔 **準備出團囉！** ${uniquePings}`,
          embeds: [{
              title: "⚔️ 聖域組隊集結通知",
              description: `隊長 **${party.creatorName}** 發起了出團點名，請各位準備上線囉！`,
              color: 9062319, // 夢幻紫
              fields: [
                  { name: "📅 開團時間", value: formatDate(party.scheduledTime), inline: true },
                  { name: "🔄 預計場次", value: `${party.estimatedRuns} 場`, inline: true },
                  { name: " ", value: " ", inline: false }, // 空行排版用
                  { name: "🛡️ 第一小隊", value: team1Field, inline: false }
              ]
          }]
      };

      if (team2Field) {
          payload.embeds[0].fields.push({ name: "🛡️ 第二小隊", value: team2Field, inline: false });
      }

      try {
          await fetch(webhooks.notifyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          showToast("已發送 Discord 提醒！", "success");
          logAction(`發送組隊提醒: 隊長 ${party.creatorName} (Party ID: ${party.id})`);
      } catch (e) {
          showToast("發送 Discord 失敗，請檢查網址", "error");
      }
  };


  useEffect(() => {
    const initAuth = async () => {
      if (auth) { try { await signInAnonymously(auth); } catch (e) { showToast(`登入失敗: ${e.message}`, "error"); } } else { setLoading(false); }
    };
    initAuth();
    if (auth) {
      const unsub = onAuthStateChanged(auth, (user) => { setAuthUser(user); if (!user) setLoading(false); });
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (auth && authUser) {
      const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (docSnap) => { 
          if (docSnap.exists()) {
              const data = docSnap.data();
              setWebhooks({ logUrl: data.logUrl || '', notifyUrl: data.notifyUrl || '' });
              setServers(data.servers && Array.isArray(data.servers) ? data.servers : ['艾萊', '伊斯拉']); 
          } else {
              setServers(['艾萊', '伊斯拉']);
          }
      });
      const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => { setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
      const unsubParties = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'parties'), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setParties(list);
      });
      const unsubLogs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), (snap) => { setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });

      setLoading(false);
      return () => { unsubSettings(); unsubUsers(); unsubParties(); unsubLogs(); };
    }
  }, [authUser]);

  useEffect(() => {
    if (!currentUser && users.length > 0) {
      const storedUserId = localStorage.getItem('sanctuary_user_id');
      if (storedUserId) {
        const foundUser = users.find(u => u.id === storedUserId);
        if (foundUser) {
            if (ADMIN_USERS.includes(foundUser.name) && foundUser.role !== 'admin') {
                foundUser.role = 'admin';
                updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', foundUser.id), { role: 'admin' });
            }
            setCurrentUser(foundUser);
            setView('lobby');
        }
      }
    }
  }, [users, currentUser]);

  const handleLogin = async () => {
    const { name, pin } = loginForm;
    if (!name || pin.length !== 4) return showToast("請輸入名稱與4位數密碼", "error");
    if (!db) return showToast("資料庫未連線", "error");

    const existingUser = users.find(u => u.name === name);
    if (existingUser) {
      if (existingUser.pin === pin) {
        let userRole = existingUser.role;
        if (ADMIN_USERS.includes(existingUser.name) && userRole !== 'admin') {
            userRole = 'admin';
            updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', existingUser.id), { role: 'admin' });
        }
        const updatedUser = { ...existingUser, role: userRole };
        setCurrentUser(updatedUser);
        localStorage.setItem('sanctuary_user_id', existingUser.id);
        setView('lobby');
        showToast(`歡迎回來，${name}`, "success");
        logAction(`使用者登入: ${name}`);
      } else { 
          showToast("密碼錯誤", "error"); 
          logAction(`登入失敗 (密碼錯誤): ${name}`);
      }
    } else {
      const newUser = { name, pin, role: ADMIN_USERS.includes(name) ? 'admin' : 'user', characters: [], createdAt: Date.now() };
      try {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), newUser);
        setCurrentUser({ ...newUser, id: docRef.id });
        localStorage.setItem('sanctuary_user_id', docRef.id);
        setView('lobby');
        showToast("註冊成功！", "success");
        logAction(`新使用者註冊: ${name}`);
      } catch (e) { showToast(`註冊失敗: ${e.message}`, "error"); }
    }
  };

  const handleCreateParty = async () => {
    if (!createPartyForm.time) return showToast("請選擇出團時間", "error");
    const maxSlots = createPartyForm.twoTeams ? 8 : 4;
    const initialTeam1 = Array(4).fill(null);
    const initialTeam2 = createPartyForm.twoTeams ? Array(4).fill(null) : null;

    selectedReserveUsers.slice(0, maxSlots).forEach((user, idx) => {
        const slotData = { userId: user.id, userName: user.name, charName: null, charJob: null, isMain: false };
        if (idx < 4) initialTeam1[idx] = slotData;
        else if (initialTeam2) initialTeam2[idx - 4] = slotData;
    });

    const newParty = { creatorId: currentUser.id, creatorName: currentUser.name, createdAt: Date.now(), scheduledTime: createPartyForm.time, estimatedRuns: parseInt(createPartyForm.runs) || 1, status: 'open', isTwoTeams: createPartyForm.twoTeams, team1: initialTeam1, team2: initialTeam2 };
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'parties'), newParty);
      setIsCreateModalOpen(false); setCreatePartyForm({ time: '', runs: '4', twoTeams: true }); setSelectedReserveUsers([]); 
      showToast("組隊建立成功", "success");
      logAction(`建立新組隊: by ${currentUser.name}, 時間: ${formatDate(createPartyForm.time)}, 場次: ${createPartyForm.runs}`);
    } catch (e) { showToast(`建立失敗: ${e.message}`, "error"); }
  };

  const handleEditRuns = async (partyId, currentRuns) => {
    const newRuns = prompt("請輸入新的場次數量:", currentRuns);
    if (!newRuns || isNaN(newRuns) || parseInt(newRuns) <= 0) return;
    try { 
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', partyId), { estimatedRuns: parseInt(newRuns) }); 
        showToast("場次已更新", "success"); 
        logAction(`更新場次: Party ID ${partyId} 修改為 ${newRuns} 場`);
    } catch (e) { showToast(`更新失敗: ${e.message}`, "error"); }
  };

  const handleDeleteParty = async (partyId) => {
    if (!window.confirm("確定要刪除這個組隊嗎？")) return;
    try { 
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', partyId)); 
        showToast("組隊已刪除", "info"); 
        logAction(`刪除組隊: Party ID ${partyId} by ${currentUser.name}`);
    } catch (e) { showToast(`刪除失敗: ${e.message}`, "error"); }
  };

  const handleCompleteParty = async (party) => {
    if (!window.confirm("確定標記為已完成嗎？這將會封存紀錄。")) return;
    const logEntry = { partyId: party.id, completedAt: Date.now(), scheduledTime: party.scheduledTime, runs: party.estimatedRuns, participants: [...(party.team1 || []).filter(s => s?.charName), ...(party.team2 || []).filter(s => s?.charName)] };
    try { 
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), logEntry); 
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', party.id), { status: 'completed' }); 
        showToast("封存成功", "success"); 
        logAction(`✅ 完成組隊: Party ID ${party.id} 標記完成`);
    } catch (e) { showToast(`封存失敗: ${e.message}`, "error"); }
  };

  const handleJoinParty = async (partyId, teamKey, slotIndex, charData, targetPlayerUser) => {
    const activeUser = targetPlayerUser || currentUser; 
    const party = parties.find(p => p.id === partyId);
    if (!party) return;

    const allSlots = [...party.team1, ...(party.team2 || [])];
    const isAlreadyInOtherSlot = allSlots.some((slot, idx) => {
        const isSameSlot = (teamKey === 'team1' ? idx : idx + 4) === slotIndex;
        return !isSameSlot && slot && slot.userId === activeUser.id;
    });

    if (isAlreadyInOtherSlot) {
      return showToast(`${activeUser.name} 已經在這個組隊的其他位置中了`, "error");
    }

    const newTeam = [...party[teamKey]];
    newTeam[slotIndex] = { userId: activeUser.id, userName: activeUser.name, charName: charData.name, charJob: charData.job, isMain: charData.isMain || false };

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', partyId), { [teamKey]: newTeam });
      showToast(`${activeUser.name} 加入成功！`, "success");
      logAction(`加入位置: ${activeUser.name} (${charData.name}) 加入了 Party ID ${partyId}`);
    } catch (e) { showToast(`加入失敗: ${e.message}`, "error"); }
  };

  const handleLeaveParty = async (partyId, teamKey, slotIndex) => {
    const party = parties.find(p => p.id === partyId);
    if (!party) return;
    const slot = party[teamKey][slotIndex];
    if (slot.userId !== currentUser.id && currentUser.role !== 'admin' && currentUser.id !== party.creatorId) {
      return showToast("權限不足，無法踢除", "error");
    }
    const newTeam = [...party[teamKey]];
    newTeam[slotIndex] = null;
    try { 
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', partyId), { [teamKey]: newTeam }); 
        logAction(`離開/踢除: ${slot.userName} 離開了 Party ID ${partyId}`);
    } catch (e) { showToast(`操作失敗: ${e.message}`, "error"); }
  };

  const handleDragDropSwap = async (partyId, sourceTeam, sourceIdx, targetTeam, targetIdx) => {
      const party = parties.find(p => p.id === partyId);
      if (!party) return;
      const newTeam1 = [...party.team1]; const newTeam2 = party.team2 ? [...party.team2] : null;
      const getSlot = (t, i) => t === 'team1' ? newTeam1[i] : newTeam2[i];
      const setSlot = (t, i, val) => t === 'team1' ? (newTeam1[i] = val) : (newTeam2[i] = val);
      const temp = getSlot(sourceTeam, sourceIdx); setSlot(sourceTeam, sourceIdx, getSlot(targetTeam, targetIdx)); setSlot(targetTeam, targetIdx, temp);
      try { 
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', partyId), { team1: newTeam1, ...(newTeam2 && { team2: newTeam2 }) }); 
          logAction(`位置調換: Party ID ${partyId} 發生換位`);
      } catch (e) { showToast("換位失敗", "error"); }
  };

  const handleAddCharacter = async () => {
    if (!newCharName.trim()) return;
    if (!newCharServer) return showToast("請先選擇伺服器", "error");
    const fullName = `${newCharName.trim()}[${newCharServer}]`;
    const newCharObj = { name: fullName, job: newCharClass, isMain: newCharIsMain };
    const updatedChars = [...(currentUser.characters || []), newCharObj];
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { characters: updatedChars });
      setCurrentUser({ ...currentUser, characters: updatedChars });
      setNewCharName('');
      showToast("角色已新增", "success");
      logAction(`新增角色: ${currentUser.name} 增加了 ${fullName}`);
    } catch (e) { showToast(`新增失敗: ${e.message}`, "error"); }
  };

  const handleRemoveCharacter = async (charData) => {
    const charName = typeof charData === 'string' ? charData : charData.name;
    const updatedChars = currentUser.characters.filter(c => (typeof c === 'string' ? c : c.name) !== charName);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { characters: updatedChars });
      setCurrentUser({ ...currentUser, characters: updatedChars });
      logAction(`刪除角色: ${currentUser.name} 刪除了 ${charName}`);
    } catch (e) { showToast(`刪除失敗: ${e.message}`, "error"); }
  };

  // --- 管理員操作 ---
  const handleAdminResetPin = async (userId, newPin) => {
      if(db) {
          try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { pin: newPin });
            showToast("密碼已重設", "success");
            logAction(`管理員操作: 重設了 User ID ${userId} 的密碼`);
          } catch (e) { showToast(`重設失敗: ${e.message}`, "error"); }
      }
  };

  const handleAdminUpdateDiscordId = async (userId, newId) => {
      if(db) {
          try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { discordId: newId });
            showToast("Discord ID 已更新", "success");
            logAction(`管理員操作: 更新了 User ID ${userId} 的 Discord ID`);
          } catch (e) { showToast(`更新失敗: ${e.message}`, "error"); }
      }
  };

  const handleAdminDeleteUser = async (userToDelete) => {
      if(!window.confirm(`確定要完全刪除 ${userToDelete.name} 嗎？這將會把他從所有開放中的組隊踢除！`)) return;
      try {
          for (const party of parties.filter(p => p.status === 'open')) {
              let changed = false;
              const cleanTeam = (team) => team.map(s => {
                  if (s && s.userId === userToDelete.id) { changed = true; return null; }
                  return s;
              });
              const newTeam1 = cleanTeam(party.team1);
              const newTeam2 = party.team2 ? cleanTeam(party.team2) : null;
              if (changed) {
                  await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'parties', party.id), {
                      team1: newTeam1, ...(newTeam2 && { team2: newTeam2 })
                  });
              }
          }
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userToDelete.id));
          showToast(`${userToDelete.name} 已被完全刪除`, "success");
          logAction(`管理員操作: 帳號完全刪除 ${userToDelete.name}`);
      } catch (e) { showToast(`刪除失敗: ${e.message}`, "error"); }
  };

  const handleSaveWebhooks = async () => {
      if(db) {
          try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), { ...webhooks, servers: servers }, { merge: true });
            showToast("Webhook 設定已儲存", "success");
            logAction(`管理員操作: 系統 Webhook 設定已更新`);
          } catch (e) { showToast(`儲存失敗: ${e.message}`, "error"); }
      }
  };

  const handleAddServer = async () => {
      if (!newServerName.trim()) return;
      const updatedServers = [...servers, newServerName.trim()];
      try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), { servers: updatedServers }, { merge: true });
          setNewServerName('');
          showToast("伺服器已新增", "success");
          logAction(`管理員操作: 新增伺服器選項 ${newServerName.trim()}`);
      } catch (e) { showToast(`新增伺服器失敗: ${e.message}`, "error"); }
  };

  const handleRemoveServer = async (srvToRemove) => {
      if (!window.confirm(`確定要移除 ${srvToRemove} 伺服器嗎？`)) return;
      const updatedServers = servers.filter(s => s !== srvToRemove);
      try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), { servers: updatedServers }, { merge: true });
          showToast("伺服器已移除", "success");
          logAction(`管理員操作: 移除伺服器選項 ${srvToRemove}`);
      } catch (e) { showToast(`移除伺服器失敗: ${e.message}`, "error"); }
  };

  // --- Sub-Components ---
  const SlotButton = ({ slot, onJoin, onLeave, party, teamKey, index }) => {
    const isCreatorOrAdmin = currentUser?.role === 'admin' || currentUser?.id === party.creatorId;
    const handleDragStart = (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ teamKey, index }));
    const handleDrop = (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.teamKey === teamKey && data.index === index) return; 
            handleDragDropSwap(party.id, data.teamKey, data.index, teamKey, index);
        } catch (err) {}
    };

    if (!slot) {
      return (
        <div onDragOver={isCreatorOrAdmin ? (e) => e.preventDefault() : undefined} onDrop={isCreatorOrAdmin ? handleDrop : undefined} className="h-14 w-full">
          <button onClick={onJoin} className="h-full w-full border border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:border-emerald-400 hover:bg-emerald-400/10 transition-all group">
            <Plus className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      );
    }
    
    const isMe = slot.userId === currentUser?.id;
    const isReserved = slot.charName === null; 
    const jobInfo = CLASSES.find(c => c.id === slot.charJob);

    return (
      <div 
        draggable={isCreatorOrAdmin} onDragStart={isCreatorOrAdmin ? handleDragStart : undefined} onDragOver={isCreatorOrAdmin ? (e) => e.preventDefault() : undefined} onDrop={isCreatorOrAdmin ? handleDrop : undefined}
        className={`h-14 w-full rounded-lg flex items-center justify-between px-2 transition-all ${isMe && !isReserved ? 'bg-violet-600/20 ' : 'bg-slate-800/60 '} ${isCreatorOrAdmin ? 'cursor-grab active:cursor-grabbing ' : ''} ${getCharBorderClass(slot.charJob, slot.isMain)}`}
      >
        <div className="flex items-center gap-2 overflow-hidden w-full">
            {isCreatorOrAdmin && <GripVertical size={16} className="text-slate-500 shrink-0" />}
            <div className={`w-10 h-10 rounded-full bg-slate-900 border flex items-center justify-center shrink-0 relative overflow-hidden ${isReserved ? 'border-dashed border-slate-500 opacity-50' : 'border-slate-700'}`}>
                {jobInfo ? <img src={jobInfo.icon} alt={jobInfo.name} className="w-full h-full object-cover" /> : <span className="text-xs text-slate-500">?</span>}
            </div>
            
            <div className="flex flex-col overflow-hidden w-full" onClick={() => (isReserved || isCreatorOrAdmin) ? onJoin() : null} style={{ cursor: (isReserved || isCreatorOrAdmin) ? 'pointer' : 'default' }}>
                <span className="text-xs text-slate-400 truncate">{slot.userName}</span>
                {isReserved ? (
                    <span className="text-sm font-bold truncate text-slate-500 animate-pulse">保留位 (點擊選角)</span>
                ) : (
                    <span className={`text-sm font-bold truncate flex items-center gap-1 ${isMe ? 'text-violet-300' : jobInfo ? jobInfo.color : 'text-slate-200'}`}>
                        {slot.charName} {slot.isMain && <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0"/>}
                    </span>
                )}
            </div>
        </div>
        {(isMe || isCreatorOrAdmin) && (
          <div className="flex items-center gap-1 shrink-0 ml-1 z-10">
            {!isReserved && slot.charName && (
                <button 
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      navigator.clipboard.writeText(slot.charName); 
                      showToast("已複製角色名稱", "success"); 
                  }} 
                  className="text-slate-500 hover:text-emerald-400 p-1"
                  title="複製角色名稱"
                >
                  <Copy size={16} />
                </button>
            )}
            <button onClick={onLeave} className="text-slate-500 hover:text-rose-400 p-1" title="踢除/離開">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const PartyCard = ({ party }) => {
    const [selectedSlot, setSelectedSlot] = useState(null); 
    const [adminStep, setAdminStep] = useState('selectChar'); 
    const [targetPlayer, setTargetPlayer] = useState(null);

    const handleSlotClick = (teamKey, index) => {
        const existingSlot = party[teamKey][index];
        if (existingSlot && existingSlot.userId !== currentUser.id && currentUser.role !== 'admin' && currentUser.id !== party.creatorId) {
            return showToast("此位置無法操作", "error");
        }
        
        setSelectedSlot({ teamKey, index });
        
        if (currentUser.role === 'admin') {
            if (existingSlot && existingSlot.userId) {
                const p = users.find(u => u.id === existingSlot.userId);
                setTargetPlayer(p || currentUser);
                setAdminStep('selectChar');
            } else {
                setTargetPlayer(null);
                setAdminStep('selectUser');
            }
        } else {
            setTargetPlayer(currentUser);
            setAdminStep('selectChar');
        }
    };

    return (
      <GlassCard className="p-0 animate-slide-up hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-shadow duration-300">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 border-b border-slate-700 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-violet-500/20 text-violet-300 text-xs px-2 py-0.5 rounded border border-violet-500/30 flex items-center gap-1"><Calendar size={12} /> {formatDate(party.scheduledTime)}</span>
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1"><Activity size={12} /> {party.estimatedRuns} 場
                {(currentUser?.id === party.creatorId || currentUser?.role === 'admin') && (<button onClick={() => handleEditRuns(party.id, party.estimatedRuns)} className="ml-1 text-slate-400 hover:text-white"><Edit2 size={10} /></button>)}
              </span>
            </div>
            <div className="text-slate-400 text-xs mt-1">隊長: <span className="text-slate-300">{party.creatorName}</span></div>
          </div>
          <div className="flex gap-2">
            {(currentUser?.id === party.creatorId || currentUser?.role === 'admin') && (
               <>
                <button onClick={() => handleNotifyParty(party)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-full" title="Discord 提醒出團"><Bell size={18} /></button>
                <button onClick={() => handleCompleteParty(party)} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-full" title="標記完成"><CheckCircle size={18} /></button>
                <button onClick={() => handleDeleteParty(party.id)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-full" title="刪除"><Trash2 size={18} /></button>
               </>
            )}
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Sword size={12} /> 第一小隊</h4>
             {party.team1.map((slot, i) => <SlotButton key={i} slot={slot} party={party} teamKey="team1" index={i} onJoin={() => handleSlotClick('team1', i)} onLeave={() => handleLeaveParty(party.id, 'team1', i)} />)}
          </div>
          {party.isTwoTeams && (
            <div className="space-y-2 md:border-l md:border-slate-700 md:pl-4">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Shield size={12} /> 第二小隊</h4>
               {party.team2.map((slot, i) => <SlotButton key={i} slot={slot} party={party} teamKey="team2" index={i} onJoin={() => handleSlotClick('team2', i)} onLeave={() => handleLeaveParty(party.id, 'team2', i)} />)}
            </div>
          )}
        </div>
        
        {selectedSlot && (
            <div className="absolute inset-0 bg-slate-900/95 z-20 flex flex-col items-center justify-center p-4 animate-fade-in">
                {currentUser.role === 'admin' && adminStep === 'selectUser' && (
                    <>
                        <h3 className="text-white mb-4 font-bold text-lg">選擇要指派的玩家</h3>
                        <div className="w-full max-h-64 overflow-y-auto space-y-2 mb-4 p-2 custom-scrollbar">
                            {users.map(u => (
                                <button key={u.id} onClick={() => { setTargetPlayer(u); setAdminStep('selectChar'); }} className="w-full p-2 bg-slate-800 border border-slate-600 rounded-lg hover:bg-violet-600 text-left text-white font-bold transition-colors">
                                    {u.name}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {adminStep === 'selectChar' && targetPlayer && (
                    <>
                        <h3 className="text-white mb-2 font-bold text-lg flex items-center gap-2">
                            {currentUser.role === 'admin' && <button onClick={() => setAdminStep('selectUser')} className="text-slate-400 hover:text-white mr-2 text-sm bg-slate-800 px-2 py-1 rounded">返回</button>}
                            為 {targetPlayer.name} 選擇出戰角色
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">本週限制 4 場</p>
                        <div className="w-full max-h-60 overflow-y-auto space-y-3 mb-4 p-2 custom-scrollbar">
                            {(!targetPlayer.characters || targetPlayer.characters.length === 0) && (
                                <div className="text-slate-500 text-center py-4">這位玩家還沒有建立任何角色</div>
                            )}
                            {targetPlayer.characters?.map((char, idx) => {
                                const info = getCharInfo(char);
                                const weeklyRuns = getCharacterWeeklyRuns(info.name, targetPlayer.id);
                                const requiredRuns = parseInt(party.estimatedRuns);
                                const isMaxedOut = (weeklyRuns + requiredRuns) > 4;
                                const borderClass = getCharBorderClass(info.job, info.isMain);

                                return (
                                    <button 
                                        key={idx} disabled={isMaxedOut}
                                        onClick={() => { handleJoinParty(party.id, selectedSlot.teamKey, selectedSlot.index, char, targetPlayer); setSelectedSlot(null); }}
                                        className={`w-full p-2 rounded-lg transition-colors flex justify-between items-center bg-slate-800 hover:bg-slate-700 ${borderClass} ${isMaxedOut ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden">
                                                {info.icon ? <img src={info.icon} alt={info.job} className="w-full h-full object-cover"/> : <span className="text-xs text-slate-500">?</span>}
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className="text-slate-200 text-sm font-bold flex items-center gap-1">
                                                    {info.name} {info.isMain && <Star size={12} className="text-amber-400 fill-amber-400"/>}
                                                </span>
                                                <span className={`text-xs ${info.color}`}>{CLASSES.find(c => c.id === info.job)?.name}</span>
                                            </div>
                                        </div>
                                        <div className={`text-xs font-bold px-2 py-1 rounded ${isMaxedOut ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-900 text-slate-300'}`}>
                                            已打: {weeklyRuns}/4
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
                <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-white text-sm bg-slate-800 px-6 py-2 rounded-full mt-2">取消</button>
            </div>
        )}
      </GlassCard>
    );
  };

  // --- Main Render ---
  if (view === 'auth') { 
    return (
      <div className="min-h-screen bg-[#0a0a16] flex items-center justify-center p-4 relative overflow-hidden">
        <GlobalStyles /><div className="absolute top-0 left-0 w-full h-full z-0"><div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-900/20 rounded-full blur-[100px] animate-breathe"></div></div>
        <div className="relative z-10 w-full max-w-md"><div className="text-center mb-8"><h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-slate-400 mb-2">聖域小號系統</h1></div>
           <GlassCard className="p-8"><div className="space-y-4">
                 <input type="text" value={loginForm.name} onChange={(e) => setLoginForm({...loginForm, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white text-center" placeholder="輸入暱稱" />
                 <input type="password" maxLength="4" value={loginForm.pin} onChange={(e) => setLoginForm({...loginForm, pin: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white text-center tracking-widest text-lg" placeholder="••••" />
                 <button onClick={handleLogin} className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-lg shadow-lg">進入聖域</button>
              </div></GlassCard>
        </div>{toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  const displayedParties = parties.filter(p => p.status === 'open').filter(p => {
      if (lobbyFilter === 'all') return true;
      const inTeam1 = p.team1.some(s => s && s.userId === currentUser.id);
      const inTeam2 = p.team2 && p.team2.some(s => s && s.userId === currentUser.id);
      return p.creatorId === currentUser.id || inTeam1 || inTeam2;
  });

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-200 font-sans pb-20 relative">
      <GlobalStyles />
      <header className="sticky top-0 z-30 bg-[#0f0f1a]/80 backdrop-blur-lg border-b border-slate-800 px-4 py-3 flex justify-between items-center">
         <div className="flex items-center gap-3"><h1 className="font-bold text-lg text-slate-100">聖域小號系統</h1></div>
         <div className="flex items-center gap-4"><div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700"><User size={14} className="text-violet-400" /><span className="text-sm font-medium">{currentUser?.name}</span></div><button onClick={() => { localStorage.removeItem('sanctuary_user_id'); setView('auth'); setCurrentUser(null); }} className="text-slate-400 hover:text-white"><LogOut size={20} /></button></div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 mt-6 z-10 relative">
        <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800 mb-6">
           <button onClick={() => setView('lobby')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium ${view === 'lobby' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}><Users size={16} /> 副本大廳</button>
           <button onClick={() => setView('profile')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium ${view === 'profile' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}><Settings size={16} /> 角色管理</button>
           {currentUser?.role === 'admin' && <button onClick={() => setView('admin')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium ${view === 'admin' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}><Crown size={16} /> 管理員領域</button>}
        </div>

        {view === 'lobby' && ( 
          <div className="animate-fade-in space-y-6">
             <div className="flex justify-between items-center">
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button onClick={() => setLobbyFilter('all')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${lobbyFilter === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>全部隊伍</button>
                    <button onClick={() => setLobbyFilter('mine')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${lobbyFilter === 'mine' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>我的隊伍</button>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg"><Plus size={18} /> 建立組隊</button>
             </div>
             <div className="grid gap-6">
                {displayedParties.length === 0 ? (<div className="text-center py-20 text-slate-600">無符合條件的組隊</div>) : ( displayedParties.map(party => <PartyCard key={party.id} party={party} />) )}
             </div>
          </div>
        )}

        {view === 'profile' && (
          <div className="animate-fade-in space-y-6">
             <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Settings className="text-violet-400" /> 我的專屬角色庫</h2>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-6">
                    <h3 className="text-sm text-slate-400 mb-3 font-bold uppercase tracking-wider">新增角色</h3>
                    <div className="flex flex-col md:flex-row gap-3">
                        <input type="text" value={newCharName} onChange={(e) => setNewCharName(e.target.value)} placeholder="角色名稱" className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                        <select value={newCharServer} onChange={(e) => setNewCharServer(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm w-full md:w-auto">
                            {servers.map(srv => <option key={srv} value={srv}>{srv} 服</option>)}
                        </select>
                        <select value={newCharClass} onChange={(e) => setNewCharClass(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm w-full md:w-auto">
                            {CLASSES.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                        </select>
                        <select value={newCharIsMain ? 'true' : 'false'} onChange={(e) => setNewCharIsMain(e.target.value === 'true')} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-amber-400 font-bold text-sm w-full md:w-auto">
                            <option value="false">小號 / 分身</option>
                            <option value="true">★ 本尊 / 本號</option>
                        </select>
                        <button onClick={handleAddCharacter} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold">新增</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {currentUser?.characters?.map((char, index) => {
                      const info = getCharInfo(char);
                      return (
                          <div key={index} className={`flex justify-between items-center bg-slate-800/40 p-3 rounded-lg ${getCharBorderClass(info.job, info.isMain)}`}>
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex justify-center items-center overflow-hidden">{info.icon ? <img src={info.icon} className="w-full h-full object-cover" /> : '?'}</div>
                                 <div><div className="font-bold text-slate-200 text-sm flex items-center gap-1">{info.name} {info.isMain && <Star size={12} className="text-amber-400 fill-amber-400"/>}</div><div className={`text-xs ${info.color}`}>{CLASSES.find(c => c.id === info.job)?.name}</div></div>
                             </div>
                             <button onClick={() => handleRemoveCharacter(info.name)} className="text-slate-500 hover:text-rose-400 p-2 bg-slate-900 rounded-lg"><Trash2 size={16} /></button>
                          </div>
                      );
                   })}
                </div>
             </GlassCard>

             <div className="space-y-4 pt-4 border-t border-slate-800">
                <h2 className="text-lg font-bold text-slate-400 px-2 flex items-center gap-2"><Globe size={18} /> 全伺服器玩家角色</h2>
                {users.filter(u => u.id !== currentUser.id).map(user => (
                    <div key={user.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <h3 className="font-bold text-slate-300 mb-3 text-sm flex items-center gap-2"><User size={14}/> {user.name}</h3>
                        {(!user.characters || user.characters.length === 0) ? (
                            <div className="text-xs text-slate-600">無角色資料</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                               {user.characters.map((char, index) => {
                                  const info = getCharInfo(char);
                                  return (
                                      <div key={index} className={`flex items-center gap-2 bg-slate-800/40 p-2 rounded-lg ${getCharBorderClass(info.job, info.isMain)}`}>
                                         <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex justify-center items-center overflow-hidden shrink-0">{info.icon ? <img src={info.icon} className="w-full h-full object-cover" /> : '?'}</div>
                                         <div className="truncate">
                                             <div className="font-bold text-slate-200 text-xs truncate flex items-center gap-1">{info.name} {info.isMain && <Star size={10} className="text-amber-400 fill-amber-400"/>}</div>
                                             <div className={`text-[10px] ${info.color}`}>{CLASSES.find(c => c.id === info.job)?.name}</div>
                                         </div>
                                      </div>
                                  );
                               })}
                            </div>
                        )}
                    </div>
                ))}
             </div>
          </div>
        )}

        {view === 'admin' && currentUser?.role === 'admin' && ( 
          <div className="animate-fade-in space-y-8">
             
             {/* 伺服器管理 */}
             <GlassCard className="p-6 border-emerald-500/30">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                     <Globe size={20} className="text-emerald-400" /> 伺服器管理
                 </h3>
                 <div className="flex gap-2 mb-4">
                     <input 
                         type="text" 
                         value={newServerName}
                         onChange={(e) => setNewServerName(e.target.value)}
                         className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                         placeholder="輸入新伺服器名稱 (例如: 艾萊)" 
                     />
                     <button 
                         onClick={handleAddServer}
                         className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold"
                     >
                         新增
                     </button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                     {servers.length === 0 && <span className="text-slate-500 text-sm">尚未設定伺服器</span>}
                     {servers.map(srv => (
                         <div key={srv} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm text-slate-300">
                             {srv}
                             <button onClick={() => handleRemoveServer(srv)} className="text-slate-500 hover:text-rose-400 ml-1">
                                 <X size={14} />
                             </button>
                         </div>
                     ))}
                 </div>
             </GlassCard>

             {/* System Settings */}
             <GlassCard className="p-6 border-violet-500/30">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                     <Settings size={20} className="text-violet-400" /> 系統設定 (Discord)
                 </h3>
                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs text-slate-400 mb-1">Log Webhook URL (紀錄所有操作)</label>
                         <input type="password" value={webhooks.logUrl} onChange={(e) => setWebhooks({...webhooks, logUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="https://discord.com/api/webhooks/..." />
                     </div>
                     <div>
                         <label className="block text-xs text-slate-400 mb-1">Notification Webhook URL (組隊通知)</label>
                         <input type="password" value={webhooks.notifyUrl} onChange={(e) => setWebhooks({...webhooks, notifyUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="https://discord.com/api/webhooks/..." />
                     </div>
                     <button onClick={handleSaveWebhooks} className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded text-sm font-bold">儲存設定</button>
                 </div>
             </GlassCard>

             {/* Stats Section */}
             <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-400"><History size={24} /></div>
                    <div><div className="text-2xl font-bold text-white">{logs.length}</div><div className="text-xs text-slate-400">已完成場次</div></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-fuchsia-500/20 text-fuchsia-400"><Users size={24} /></div>
                    <div><div className="text-2xl font-bold text-white">{users.length}</div><div className="text-xs text-slate-400">總使用者</div></div>
                </GlassCard>
             </div>

             {/* User Management */}
             <GlassCard className="p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><KeyRound size={20} className="text-rose-400" /> 使用者管理</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-xs uppercase bg-slate-800/50 text-slate-300">
                            <tr>
                                <th className="px-4 py-3">名稱</th>
                                <th className="px-4 py-3">密碼</th>
                                <th className="px-4 py-3">Discord ID</th>
                                <th className="px-4 py-3">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-800/30">
                                    <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                                    <td className="px-4 py-3 font-mono text-violet-300">{u.pin}</td>
                                    {/* Discord ID 編輯區塊 */}
                                    <td className="px-4 py-3 font-mono text-blue-300">
                                        <div className="flex items-center gap-2">
                                            <span className="w-24 truncate" title={u.discordId || '未設定'}>
                                                {u.discordId || '未設定'}
                                            </span>
                                            <button 
                                                onClick={() => { 
                                                    const newId = prompt('請輸入此玩家的 Discord 使用者 ID (純數字):', u.discordId || ''); 
                                                    if(newId !== null) handleAdminUpdateDiscordId(u.id, newId.trim()); 
                                                }} 
                                                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white"
                                            >
                                                <Edit2 size={12}/>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 flex gap-2">
                                        <button onClick={() => { const newP = prompt(`新密碼:`); if(newP && newP.length === 4) handleAdminResetPin(u.id, newP); }} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded">重設密碼</button>
                                        <button onClick={() => handleAdminDeleteUser(u)} className="flex items-center gap-1 text-xs bg-rose-900/50 hover:bg-rose-600 text-rose-200 px-2 py-1 rounded transition-colors"><UserMinus size={12}/> 刪除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </GlassCard>
          </div>
        )}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="建立新組隊">
         <div className="space-y-4">
            <div>
                <label className="block text-slate-400 text-sm mb-1">預計出團時間</label>
                <input type="datetime-local" value={createPartyForm.time} onChange={(e) => setCreatePartyForm({...createPartyForm, time: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white [color-scheme:dark]" />
            </div>
            <div>
                <label className="block text-slate-400 text-sm mb-1">預計場次</label>
                <input type="number" min="1" value={createPartyForm.runs} onChange={(e) => setCreatePartyForm({...createPartyForm, runs: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
            </div>
            <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="twoTeams" checked={createPartyForm.twoTeams} onChange={(e) => setCreatePartyForm({...createPartyForm, twoTeams: e.target.checked})} className="w-5 h-5 accent-violet-500 rounded cursor-pointer" />
                <label htmlFor="twoTeams" className="text-white cursor-pointer select-none">開啟第二小隊 (共 8 人)</label>
            </div>
            <div className="pt-2 border-t border-slate-700">
                <label className="block text-slate-400 text-sm mb-2 flex justify-between">
                    <span>預先保留位置 (點擊玩家排入空位)</span>
                    <span className="text-xs text-violet-400">{selectedReserveUsers.length} / {createPartyForm.twoTeams ? 8 : 4}</span>
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                    {users.map(u => {
                        const isSelected = selectedReserveUsers.some(r => r.id === u.id);
                        return (
                            <button
                                key={u.id}
                                onClick={() => {
                                    if (isSelected) setSelectedReserveUsers(prev => prev.filter(r => r.id !== u.id));
                                    else if (selectedReserveUsers.length < (createPartyForm.twoTeams ? 8 : 4)) setSelectedReserveUsers(prev => [...prev, u]);
                                }}
                                className={`px-2 py-1 rounded text-xs border transition-colors ${isSelected ? 'bg-violet-600 text-white border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                            >
                                {u.name}
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-slate-500 mt-2">被選中的玩家將會在隊伍中佔據「保留位」，由他們上線後自行選擇角色。</p>
            </div>
            <button onClick={handleCreateParty} className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded-lg transition-colors">發布組隊</button>
         </div>
      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}