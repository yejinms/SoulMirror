import { useState, useRef, useEffect } from 'react';
import { Send, LogOut, Moon, Sparkles, History, PlusCircle, MessageCircle, MoreHorizontal, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from './hooks/useAuth';
import { useSessions, useSession, useNotes } from './hooks/useSessions';
import { chatWithCoachStream } from './lib/gemini';
import { cn } from './lib/utils';

export default function App() {
  const { user, loading: authLoading, signIn, logout } = useAuth();
  const { sessions, loading: sessionsLoading, createSession, deleteSession } = useSessions();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'reports'>('chat');
  
  // Mobile responsive states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Automatically select the most recent active session on load if none selected
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0 && !sessionsLoading) {
      const lastActive = sessions.find(s => s.status === 'active') || sessions[0];
      setActiveSessionId(lastActive.id);
    }
  }, [sessions, activeSessionId, sessionsLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030704] text-[#e8f1ec]">
        <div className="aura-bg" />
        <div className="forest-overlay" />
        <motion.div 
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-xs font-light tracking-[0.5em] text-emerald-500/50"
        >
          SoulMirror
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030704] text-[#e8f1ec] p-6 relative overflow-hidden text-center">
        <div className="aura-bg" />
        <div className="forest-overlay" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="z-10 max-w-sm"
        >
          <div className="flex justify-center mb-10">
            <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-xl">
              <Sparkles className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-5xl font-extralight tracking-tighter mb-6 text-white italic">SoulMirror</h1>
          <p className="text-[#a0afaf] mb-16 font-light leading-relaxed px-4 italic opacity-80">
            "가장 깊은 숲속에서도, 당신의 진실은 빛나고 있습니다."<br />
            무의식의 숲을 지나, 당신만의 거울에 닿는 시간.
          </p>
          <button 
            onClick={signIn}
            className="w-full py-5 px-8 bg-white/90 text-[#030704] rounded-[2rem] font-medium hover:bg-white transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] tracking-widest text-xs uppercase"
          >
             시작하기
          </button>
        </motion.div>
      </div>
    );
  }

  const handleStartNewSession = async () => {
    const id = await createSession();
    if (id) {
      setActiveSessionId(id);
      setView('chat');
      setIsSidebarOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (sessionToDelete) {
      await deleteSession(sessionToDelete);
      if (activeSessionId === sessionToDelete) setActiveSessionId(null);
      setSessionToDelete(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#030704] text-[#e8f1ec] overflow-hidden relative font-sans">
      <div className="aura-bg" />
      <div className="forest-overlay" />
      <div className="chat-bg-image" />
      <div className="noise-overlay" />
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 transition-transform duration-500 ease-out w-80 h-full",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar 
          setView={(v: any) => { setView(v); setIsSidebarOpen(false); }} 
          view={view} 
          activeSessionId={activeSessionId} 
          setActiveSessionId={(id: any) => { setActiveSessionId(id); setIsSidebarOpen(false); }}
          sessions={sessions}
          onNewSession={handleStartNewSession}
          onDeleteSession={(id: string) => setSessionToDelete(id)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col min-w-0 h-full">
        <header className="flex items-center justify-between px-6 lg:px-12 py-6 lg:py-8 z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 -ml-3 text-white/50 hover:text-white lg:hidden backdrop-blur-md bg-white/5 rounded-2xl transition-all"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            {view === 'chat' ? (
              <h2 className="text-xl lg:text-2xl font-extralight tracking-tight text-white/90">오늘의 저널링</h2>
            ) : (
              <h2 className="text-xl lg:text-2xl font-extralight tracking-tight text-white/90">리포트 기록</h2>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-[1.25rem] border border-white/5 backdrop-blur-md">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <span className="text-[11px] font-medium tracking-wide text-white/70">{user.displayName}</span>
            </div>
            <button 
              onClick={logout}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/50 hover:text-white transition-all backdrop-blur-md border border-white/5"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col relative z-10">
          <AnimatePresence mode="wait">
            {view === 'chat' ? (
              <ChatView 
                key={activeSessionId || 'no-session'} 
                sessionId={activeSessionId} 
                onStartSession={handleStartNewSession}
              />
            ) : (
              <ReportsView 
                key="reports" 
                onSelectReport={() => {}} 
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSessionToDelete(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm glass-panel p-10 relative z-10 text-center border-white/5"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-[1.5rem] flex items-center justify-center border border-red-500/20 mx-auto mb-8 shadow-2xl shadow-red-500/10">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-light text-white mb-3 tracking-tight">세션 삭제</h3>
              <p className="text-sm text-[#aabfb3] font-light mb-10 leading-relaxed px-4 opacity-80">
                이 소중한 기록을 지우시겠습니까?<br />
                숲에서 사라진 발자국처럼 영구히 삭제됩니다.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 py-4 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold tracking-widest text-[#66776e] hover:bg-white/10 transition-all uppercase"
                >
                  취소
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-red-500/90 hover:bg-red-600 text-white rounded-2xl text-xs font-bold tracking-widest transition-all uppercase shadow-2xl shadow-red-500/20"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sidebar({ setView, view, activeSessionId, setActiveSessionId, sessions, onNewSession, onDeleteSession }: any) {
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteSession(id);
  };

  return (
    <aside className="w-full flex flex-col bg-[#050c08]/60 backdrop-blur-3xl h-full border-r border-white/5">
      <div className="p-10">
        <div className="flex items-center gap-4 mb-16">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-xl font-extralight tracking-tight text-white">SoulMirror</span>
        </div>

        <nav className="space-y-4">
          <button 
            onClick={() => setView('chat')}
            className={cn(
              "w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all font-light text-sm tracking-wide",
              view === 'chat' ? "bg-white/10 text-white shadow-xl" : "text-[#88998f] hover:text-white"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            저널링
          </button>
          <button 
            onClick={() => setView('reports')}
            className={cn(
              "w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all font-light text-sm tracking-wide",
              view === 'reports' ? "bg-white/10 text-white shadow-xl" : "text-[#88998f] hover:text-white"
            )}
          >
            <History className="w-4 h-4" />
            기록
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8 no-scrollbar">
        <div className="px-6 mb-6 text-[10px] uppercase tracking-[0.4em] text-[#55665b] font-bold">
          최근 세션
        </div>
        <div className="space-y-2">
          <button 
            onClick={onNewSession}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-emerald-400 font-light text-sm text-left mb-6 border border-emerald-500/10"
          >
            <PlusCircle className="w-4 h-4" />
            새로운 시작
          </button>

          {sessions.filter((s: any) => s.status === 'active').slice(0, 10).map((s: any) => (
            <div key={s.id} className="group relative">
              <button
                onClick={() => {
                  setActiveSessionId(s.id);
                  setView('chat');
                }}
                className={cn(
                  "w-full px-6 py-4 pr-12 rounded-[1.5rem] text-left text-sm transition-all truncate font-light tracking-tight",
                  activeSessionId === s.id ? "bg-white/5 text-white border border-white/5" : "text-[#66776e] hover:text-[#aabfb3] hover:bg-white/5"
                )}
              >
                {s.title || (s.messages?.length > 0 ? s.messages[0].content : "New Session")}
              </button>
              <button 
                onClick={(e) => handleDelete(e, s.id)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 text-[#44554b] hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-8 border-t border-white/5 mt-auto">
      </div>
    </aside>
  );
}

function ChatView({ sessionId, onStartSession }: { sessionId: string | null, onStartSession: () => void }) {
  const { session, addMessage, endSession } = useSession(sessionId || "");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const END_SESSION_INTENT_REGEX =
    /(세션\s*종료|종료할게|종료할래|끝낼게|끝낼래|마무리할게|마무리할래|오늘은\s*여기까지|여기까지할게|이만할게|그만할게|대화\s*끝|끝내자|마칠게)/i;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages, isTyping]);

  useEffect(() => {
    if (session && session.messages.length === 0 && !isTyping) {
      const welcome = "당신의 내면을 비추는 거울입니다. 오늘 하루, 당신의 마음이 머문 곳은 어디인가요?";
      addMessage(welcome, 'model');
    }
  }, [session?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping || !session || session.status === 'completed') return;

    const userMessage = input.trim();
    setInput("");
    await addMessage(userMessage, 'user');

    const isExplicitEndCommand = userMessage === "/세션종료";
    const hasEndIntent = END_SESSION_INTENT_REGEX.test(userMessage);
    if (!isExplicitEndCommand && hasEndIntent) {
      await addMessage("세션을 마무리하고 리포트를 저장하려면 아래의 **세션 종료** 버튼을 눌러주세요.", 'model');
      return;
    }
    
    setIsTyping(true);
    try {
      const chatHistory = session.messages.map(m => ({ role: m.role, content: m.content }));
      chatHistory.push({ role: 'user', content: userMessage });
      
      let fullResponse = "";
      const stream = chatWithCoachStream(chatHistory);
      for await (const chunk of stream) {
        fullResponse += chunk;
      }
      
      await addMessage(fullResponse, 'model');
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEndSession = async () => {
    if (!session || isTyping || session.status === 'completed') return;
    
    setIsTyping(true);
    try {
      const chatHistory = [...session.messages.map(m => ({ role: m.role, content: m.content }))];
      chatHistory.push({ role: 'user', content: "/세션종료" });
      
      let report = "";
      const stream = chatWithCoachStream(chatHistory);
      for await (const chunk of stream) {
        report += chunk;
      }
      
      await addMessage(report, 'model');
      await endSession(report);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  if (!sessionId || !session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 text-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-sm"
        >
          <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 mx-auto mb-12 backdrop-blur-2xl shadow-3xl">
            <MessageCircle className="w-10 h-10 text-emerald-400/20" />
          </div>
          <h3 className="text-3xl font-extralight mb-6 text-white tracking-widest italic font-serif">숲의 고요함 속으로</h3>
          <p className="text-base text-[#88998f] font-light mb-16 leading-relaxed px-8 opacity-70 italic">
            "지나온 길을 되돌아보며,<br />당신만의 숨결을 문장으로 남겨보세요."
          </p>
          <button 
            onClick={onStartSession}
            className="px-14 py-6 bg-white text-[#030704] rounded-full hover:bg-emerald-50 transition-all font-bold text-xs uppercase tracking-[0.4em] shadow-[0_0_50px_rgba(255,255,255,0.1)] active:scale-95"
          >
            대화 시작하기
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full relative h-full"
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-10 flex flex-col gap-8 scroll-smooth no-scrollbar">
        {session.messages.map((m, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "w-full flex flex-col gap-1.5",
              m.role === 'user' ? "items-end" : "items-start"
            )}
          >
            <span className="text-[10px] text-[#708078] font-bold tracking-[0.3em] uppercase px-2 mb-1">
              {m.role === 'user' ? '나' : '코치'} · {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className={cn(
              "p-6 lg:p-8 rounded-[2.5rem] font-light leading-relaxed text-[16px] shadow-2xl max-w-[85%] md:max-w-[70%] backdrop-blur-[40px]",
              m.role === 'user' 
                ? "bg-emerald-600/40 text-white rounded-tr-none border border-white/10" 
                : "bg-white/5 border border-white/5 text-white/90 rounded-tl-none prose prose-invert max-w-none shadow-[0_0_40px_rgba(0,0,0,0.1)]"
            )}>
              {m.role === 'model' ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              )}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 items-start mt-4 px-2">
             <span className="text-[9px] text-[#708078] font-bold tracking-[0.4em] uppercase mb-1">
               답변을 생각하고 있어요...
             </span>
             <div className="flex gap-1.5 p-4 rounded-full bg-white/5 border border-white/5">
               <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
               <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
               <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
             </div>
          </motion.div>
        )}
      </div>

      <div className="px-6 lg:px-12 pb-10 lg:pb-16 bg-gradient-to-t from-[#030704] via-[#030704]/80 to-transparent pt-10">
        {session.status === 'active' ? (
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="relative group max-w-4xl mx-auto w-full">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="어떤 문장이 지금 마음 속에 머무나요?"
                className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 lg:py-6 px-8 pr-16 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-white/10 transition-all font-light text-base placeholder:text-[#55665b]"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-3 top-3 bottom-3 aspect-square bg-white text-[#030704] rounded-[1.5rem] hover:bg-emerald-50 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all shadow-2xl flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="flex justify-center">
              <button 
                onClick={handleEndSession}
                disabled={isTyping}
                className="text-[11px] text-[#66776e] hover:text-emerald-400 transition-all uppercase tracking-[0.4em] font-bold py-3 px-8 rounded-full border border-white/5 hover:border-emerald-500/20 active:scale-95 backdrop-blur-md"
              >
                세션 종료
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 lg:p-12 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] text-center max-w-4xl mx-auto w-full backdrop-blur-3xl shadow-3xl">
            <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-4 opacity-50" />
            <p className="text-sm font-extralight tracking-widest text-emerald-200/70">세션이 종료되었습니다. 리포트가 저장되었습니다.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HistoryModal({ sessionId, onClose }: { sessionId: string, onClose: () => void }) {
  const { session, loading } = useSession(sessionId);
  
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 lg:p-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl h-[80vh] glass-panel p-6 lg:p-10 relative z-10 flex flex-col border-white/5"
      >
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
          <div>
            <h3 className="text-xl font-light text-white tracking-tight">전체 대화 내역</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-8">
          {loading ? (
            <div className="h-full flex items-center justify-center text-[#66776e]">대화 기록을 불러오는 중...</div>
          ) : session?.messages.map((m, i) => (
            <div key={i} className={cn("flex flex-col gap-2", m.role === 'user' ? "items-end text-right" : "items-start text-left")}>
              <span className="text-[10px] text-[#66776e] font-bold tracking-[0.2em] uppercase px-1">
                {m.role === 'user' ? '나' : '코치'} · {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className={cn(
                "p-5 rounded-[1.5rem] text-sm font-light leading-relaxed max-w-[85%] lg:max-w-[70%]",
                m.role === 'user' ? "bg-emerald-600/20 text-white border border-emerald-500/20" : "bg-white/5 text-white/80 border border-white/5"
              )}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ReportsView({ onSelectReport }: { onSelectReport: (report: any) => void }) {
  const { notes, loading, deleteNote } = useNotes();
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [showHistoryForId, setShowHistoryForId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const confirmDeleteReport = async () => {
    if (reportToDelete) {
      await deleteNote(reportToDelete);
      setReportToDelete(null);
      if (selectedReport?.id === reportToDelete) {
        setSelectedReport(null);
      }
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-[#50505f]">로딩 중...</div>;
  }

  if (selectedReport) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 p-4 lg:p-10 max-w-3xl mx-auto overflow-y-auto h-full"
      >
        <div className="flex items-center justify-between mb-6 lg:mb-10">
          <button 
            onClick={() => setSelectedReport(null)}
            className="text-[10px] lg:text-xs text-[#66776e] hover:text-emerald-300 tracking-[0.4em] uppercase flex items-center gap-3 group p-2 transition-colors font-bold"
          >
            <X className="w-4 h-4" />
            목록으로 돌아가기
          </button>
          
          <div className="flex items-center gap-3">
            {selectedReport.sessionId && (
              <button 
                onClick={() => setShowHistoryForId(selectedReport.sessionId)}
                className="text-[10px] lg:text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-6 py-2 rounded-full tracking-[0.2em] transition-all font-bold uppercase border border-emerald-500/20"
              >
                전체 대화 보기
              </button>
            )}
            <button 
              onClick={() => setReportToDelete(selectedReport.id)}
              className="p-2 text-[#55665b] hover:text-red-400 transition-all bg-white/5 rounded-full border border-white/5"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-8 lg:p-12 bg-white/5 border border-white/5 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] backdrop-blur-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
          <div className="markdown-body prose-blockquote:italic prose-blockquote:text-emerald-200/60 font-light">
             <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedReport.content || "숲이 아직 침묵하고 있습니다."}</ReactMarkdown>
          </div>
        </div>

        <AnimatePresence>
          {showHistoryForId && (
            <HistoryModal 
              sessionId={showHistoryForId} 
              onClose={() => setShowHistoryForId(null)} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reportToDelete && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setReportToDelete(null)}
                className="fixed inset-0 bg-black/40 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm glass-panel p-10 relative z-[130] text-center border-white/5"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-[1.5rem] flex items-center justify-center border border-red-500/20 mx-auto mb-8">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-light text-white mb-3 tracking-tight">리포트 삭제</h3>
                <p className="text-sm text-[#aabfb3] font-light mb-10 opacity-80 leading-relaxed px-4">
                  이 리포트를 영구히 삭제하시겠습니까?
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setReportToDelete(null)}
                    className="flex-1 py-4 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold tracking-widest text-[#66776e] uppercase shadow-sm"
                  >
                    취소
                  </button>
                  <button 
                    onClick={confirmDeleteReport}
                    className="flex-1 py-4 bg-red-500/90 hover:bg-red-600 text-white rounded-2xl text-xs font-bold tracking-widest uppercase shadow-2xl shadow-red-500/20"
                  >
                    삭제
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 p-4 lg:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 overflow-y-auto h-full"
    >
      <AnimatePresence>
        {reportToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportToDelete(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-panel p-10 relative z-[130] text-center border-white/5"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-[1.5rem] flex items-center justify-center border border-red-500/20 mx-auto mb-8">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-light text-white mb-3 tracking-tight">리포트 삭제</h3>
              <p className="text-sm text-[#aabfb3] font-light mb-10 opacity-80 leading-relaxed px-4">
                이 리포트를 영구히 삭제하시겠습니까?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setReportToDelete(null)}
                  className="flex-1 py-4 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold tracking-widest text-[#66776e] uppercase shadow-sm"
                >
                  취소
                </button>
                <button 
                  onClick={confirmDeleteReport}
                  className="flex-1 py-4 bg-red-500/90 hover:bg-red-600 text-white rounded-2xl text-xs font-bold tracking-widest uppercase shadow-2xl shadow-red-500/20"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {notes.map((n) => (
        <motion.div 
          key={n.id}
          whileHover={{ y: -8, scale: 1.02 }}
          onClick={() => setSelectedReport(n)}
          className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/20 transition-all group h-fit relative backdrop-blur-3xl shadow-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setReportToDelete(n.id);
            }}
            className="absolute top-6 right-6 p-2 opacity-0 group-hover:opacity-100 text-[#55665b] hover:text-red-400 transition-all z-10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            <span className="text-[10px] text-[#66776e] font-bold uppercase tracking-[0.3em] leading-none">
              {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : new Date(n.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h3 className="text-base font-light text-white mb-3 line-clamp-1 relative z-10">
            {n.title || "저널 리포트"}
          </h3>
          
          {n.summary && (
            <p className="text-xs text-[#aabfb3] mb-6 line-clamp-2 leading-relaxed font-light italic opacity-80 relative z-10">
              "{n.summary}"
            </p>
          )}

          {n.keywords && (
            <div className="flex flex-wrap gap-2 mb-8 relative z-10">
              {n.keywords.split(',').map((kw: string, idx: number) => (
                <span key={idx} className="text-[9px] px-3 py-1 bg-white/5 text-emerald-200/70 rounded-full border border-white/5 font-medium tracking-tight">
                  {kw.trim()}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
            <span className="text-[10px] text-[#66776e] uppercase tracking-[0.4em] font-bold">
              보기
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400/40" />
          </div>
        </motion.div>
      ))}
      {notes.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center p-20 text-[#50505f]">
          <History className="w-10 h-10 mb-4 opacity-10" />
          <p className="font-light tracking-widest text-xs lg:text-sm">리포트 기록이 아직 없습니다.</p>
        </div>
      )}
    </motion.div>
  );
}
