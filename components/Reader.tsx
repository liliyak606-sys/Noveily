
import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, X, Loader2, Send } from 'lucide-react';
import { Comic, ComicPage, ChatMessage } from '../types';
import { getComicPages, updateComicProgress } from '../utils/db';
import { getAiPageAnalysis } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface ReaderProps {
  comic: Comic;
  onClose: () => void;
}

// Memoized component to display a single page image, handling its own blob URL lifecycle to prevent memory leaks.
const ReaderPageImage: React.FC<{ page: ComicPage }> = React.memo(({ page }) => {
    const [imageUrl, setImageUrl] = useState('');

    useEffect(() => {
        if (page.blob) {
            const url = URL.createObjectURL(page.blob);
            setImageUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [page.blob]);

    if (!imageUrl) return <div className="w-full min-h-[50vh] bg-black/20" />; // Placeholder for aspect ratio

    return (
        <img
            src={imageUrl}
            alt={`Page ${page.order + 1}`}
            className="max-w-full h-auto object-contain"
            loading="lazy"
        />
    );
});


const Reader: React.FC<ReaderProps> = ({ comic, onClose }) => {
  const [pages, setPages] = useState<ComicPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(comic.lastReadPage || 0);
  const [loading, setLoading] = useState(true);
  
  // AI State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { t } = useLanguage();

  // Save progress on unmount
  useEffect(() => {
    return () => {
      updateComicProgress(comic.id, currentPageIndex);
    };
  }, [comic.id, currentPageIndex]);
  
  // Reset AI chat when page changes
  useEffect(() => {
    setChatHistory([]);
    setShowAiModal(false);
  }, [currentPageIndex]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);


  useEffect(() => {
    const loadPages = async () => {
      setLoading(true);
      try {
        const loadedPages = await getComicPages(comic.id);
        setPages(loadedPages);
        pageRefs.current = pageRefs.current.slice(0, loadedPages.length);
        
        // Scroll to last read page on initial load
        setTimeout(() => {
            const initialPage = pageRefs.current[comic.lastReadPage || 0];
            if (initialPage) {
                initialPage.scrollIntoView({ block: 'center' });
            }
        }, 100);

      } catch (err) {
        console.error("Failed to load pages", err);
      } finally {
        setLoading(false);
      }
    };
    loadPages();
  }, [comic.id]);

  // Intersection Observer for current page tracking
  useEffect(() => {
    if (loading || pages.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
                    setCurrentPageIndex(index);
                }
            });
        },
        { threshold: 0.7 } // Trigger when 70% of the page is visible
    );

    const currentRefs = pageRefs.current;
    currentRefs.forEach(ref => {
        if (ref) observer.observe(ref);
    });

    return () => {
        currentRefs.forEach(ref => {
            if (ref) observer.unobserve(ref);
        });
    };
  }, [loading, pages]);

  const openAiChat = async () => {
    if (pages.length === 0) return;
    setShowAiModal(true);

    if (chatHistory.length === 0) { // First time opening for this page
      setIsAiAnalyzing(true);
      try {
        const result = await getAiPageAnalysis(
          pages[currentPageIndex].blob,
          t('reader.ai.initialPrompt')
        );
        setChatHistory([{ role: 'model', content: result }]);
      } catch (e) {
        setChatHistory([{ role: 'model', content: t('reader.aiModal.initialAnalysisError') }]);
      } finally {
        setIsAiAnalyzing(false);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessage.trim() || isAiAnalyzing || pages.length === 0) return;

    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    setChatHistory(prev => [...prev, newUserMessage]);
    setUserMessage('');
    setIsAiAnalyzing(true);

    const historyText = [...chatHistory, newUserMessage].map(m => `${m.role}: ${m.content}`).join('\n');
    const fullPrompt = t('reader.ai.followUpPrompt', { history: historyText });

    try {
      const result = await getAiPageAnalysis(pages[currentPageIndex].blob, fullPrompt);
      setChatHistory(prev => [...prev, { role: 'model', content: result }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', content: t('reader.aiModal.responseError') }]);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <Loader2 className="animate-spin mr-2" /> {t('reader.loading')}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Close Button */}
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 z-30 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/80 active:bg-white/20 active:text-white transition-all"
        aria-label="Close reader"
      >
        <X size={24} />
      </button>
      
      {/* Main Reader Area */}
      <div className="h-full w-full overflow-y-auto no-scrollbar">
          <div className="w-full flex flex-col items-center">
            {pages.map((page, idx) => (
              <div 
                key={page.id}
                ref={el => { pageRefs.current[idx] = el; }}
                data-index={idx}
                className="w-full flex justify-center py-1"
              >
                <ReaderPageImage page={page} />
              </div>
            ))}
          </div>
      </div>

      {/* Glass AI Modal Overlay */}
      {showAiModal && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={() => setShowAiModal(false)}>
           <div 
             className="bg-slate-900/80 backdrop-blur-xl border-t border-white/20 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[80vh]" 
             onClick={(e) => e.stopPropagation()}
           >
             <div className="flex justify-between items-start p-5 border-b border-white/10">
               <div className="flex items-center gap-3 text-indigo-300">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <BrainCircuit size={24} />
                  </div>
                  <h3 className="font-bold text-lg text-white">{t('reader.aiModal.title')}</h3>
               </div>
               <button onClick={() => setShowAiModal(false)} className="p-2 text-white/50 active:text-white bg-white/5 rounded-full transition-colors"><X size={20} /></button>
             </div>
             
             <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 border backdrop-blur-md ${
                          msg.role === 'user' 
                          ? 'bg-indigo-600/80 border-indigo-500/50 text-white rounded-br-sm' 
                          : 'bg-white/10 border-white/10 text-slate-100 rounded-bl-sm'
                        }`}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isAiAnalyzing && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-5 py-3 flex items-center gap-3">
                          <Loader2 className="animate-spin text-indigo-400" size={18} />
                          <span className="text-xs text-white/50">{t('reader.aiModal.analyzing')}</span>
                        </div>
                    </div>
                )}
             </div>
             
             <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex items-center gap-3 bg-black/20">
                <input 
                  type="text" 
                  value={userMessage} 
                  onChange={e => setUserMessage(e.target.value)} 
                  placeholder={t('reader.aiModal.placeholder')}
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 text-white placeholder:text-white/30 transition-all" 
                />
                <button 
                  type="submit" 
                  disabled={!userMessage.trim() || isAiAnalyzing} 
                  className="p-3 bg-indigo-600 active:bg-indigo-500 rounded-full text-white disabled:opacity-50 disabled:bg-slate-700 shadow-lg shadow-indigo-900/30 transition-transform active:scale-95"
                >
                  <Send size={20} />
                </button>
             </form>
           </div>
        </div>
      )}

      {/* AI Floating Action Button */}
      {!showAiModal && pages.length > 0 && (
         <button 
          onClick={openAiChat} 
          className="absolute bottom-4 right-4 z-20 p-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white/80 active:bg-white/20 shadow-lg opacity-80 hover:opacity-100 focus-visible:opacity-100 transition-all"
          aria-label={t('reader.ai.button')}
        >
             <BrainCircuit size={22} />
          </button>
      )}
    </div>
  );
};

export default Reader;
