
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Plus, Trash2, BookOpen, Search, X, Loader2, MoreVertical, FilePenLine, Languages, LayoutGrid, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { Comic, ToastMessage } from '../types';
import { getAllComics, deleteComic, updateComicTitle } from '../utils/db';
import { searchComicCovers } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface LibraryProps {
  onOpenReader: (comic: Comic) => void;
  onOpenUploader: () => void;
  onOpenEditor: (comic: Comic) => void;
  onOpenCoverEditor: (comic: Comic) => void;
  showToast: (message: string, type: ToastMessage['type']) => void;
}

// A component to safely handle Blob URLs to prevent memory leaks
const ComicCoverImage: React.FC<{ blob: Blob | null, alt: string, className: string }> = ({ blob, alt, className }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (blob instanceof Blob) {
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setImageUrl(null);
  }, [blob]);

  if (!imageUrl) {
    return <div className="w-full h-full flex items-center justify-center text-white/30">No Cover</div>;
  }

  return <img src={imageUrl} alt={alt} className={className} loading="lazy" />;
};


const Library: React.FC<LibraryProps> = ({ onOpenReader, onOpenUploader, onOpenEditor, onOpenCoverEditor, showToast }) => {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  
  const [menuComicId, setMenuComicId] = useState<string | null>(null);
  const [editingComic, setEditingComic] = useState<Comic | null>(null);
  const [deletingComic, setDeletingComic] = useState<Comic | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { t, setLanguage, language } = useLanguage();

  const loadComics = async () => {
    setLoading(true);
    try {
      const data = await getAllComics();
      setComics(data);
    } catch (e) {
      console.error("Failed to load library", e);
      showToast("Failed to load library", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComics();
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuComicId && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuComicId(null);
      }
      if (showLangMenu && langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuComicId, showLangMenu]);
  
  const filteredComics = useMemo(() => {
    if (!searchQuery) return comics;
    // For AI search results, we don't need to filter again.
    // We assume the results are what the user wants to see.
    // The regular text search is implicitly handled by `handleAiSearch` which starts from the full list.
    return comics;
  }, [comics, searchQuery]);

  const handleDeleteClick = (e: React.MouseEvent, comic: Comic) => {
    e.stopPropagation();
    setMenuComicId(null); 
    setDeletingComic(comic);
  };

  const handleConfirmDelete = async () => {
    if (!deletingComic) return;
    try {
      await deleteComic(deletingComic.id);
      showToast(t('library.toast.deleted', { title: deletingComic.title }), 'success');
      setDeletingComic(null);
      loadComics();
    } catch (error) {
      console.error("Failed to delete comic:", error);
      showToast(t('library.toast.deleteFailed'), "error");
    }
  };
  
  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const fullLibrary = await getAllComics(); // Search on the full library
      const results = await searchComicCovers(fullLibrary, searchQuery);
       setComics(results); 
       if(results.length === 0) {
        showToast(t('library.toast.aiSearchNotFound'), "info");
       }
    } catch(e) {
      showToast(t('library.toast.aiSearchFailed'), "error");
    } finally {
      setIsSearching(false);
    }
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    loadComics();
    setIsSearchVisible(false);
  }

  const handleRenameClick = (comic: Comic) => {
    setEditingComic(comic);
    setNewTitle(comic.title);
    setMenuComicId(null);
  };

  const handleEditPagesClick = (comic: Comic) => {
    onOpenEditor(comic);
    setMenuComicId(null);
  };

  const handleEditCoverClick = (comic: Comic) => {
    onOpenCoverEditor(comic);
    setMenuComicId(null);
  };

  const handleSaveRename = async () => {
    if (!editingComic || !newTitle.trim()) return;
    try {
        await updateComicTitle(editingComic.id, newTitle.trim());
        showToast(t('library.toast.titleUpdated'), "success");
        setEditingComic(null);
        loadComics();
    } catch (error) {
        console.error("Failed to update title", error);
        showToast(t('library.toast.titleUpdateFailed'), "error");
    }
  };

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    if (!isSearchVisible) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Glass Header */}
      <header className="sticky top-0 z-10 bg-slate-900/10 backdrop-blur-xl border-b border-white/5 p-4">
        <div className="flex justify-end items-center max-w-6xl mx-auto gap-3">
          
          {/* Search Cluster */}
          <div className={`flex items-center bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 transition-all duration-300 overflow-hidden ${isSearchVisible ? 'w-full sm:w-80 px-4 py-1' : 'w-10 h-10 justify-center'}`}>
             <button 
                onClick={toggleSearch}
                className={`flex items-center justify-center transition-colors ${isSearchVisible ? 'text-white/50' : 'text-white/70 active:text-indigo-300'}`}
             >
                <Search size={18} />
             </button>
             
             {isSearchVisible && (
               <div className="flex-1 flex items-center gap-2 ml-2 animate-in fade-in slide-in-from-right-2 duration-300">
                  <input 
                    ref={searchInputRef}
                    type="text"
                    placeholder={t('library.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                    className="bg-transparent w-full py-1.5 text-sm outline-none placeholder:text-white/30 text-white"
                  />
                  {searchQuery && (
                    <button onClick={clearSearch} className="p-1">
                      <X size={14} className="text-white/50 hover:text-white" />
                    </button>
                  )}
                  <button 
                    onClick={handleAiSearch} 
                    disabled={isSearching} 
                    className="text-xs font-bold text-indigo-300 active:text-indigo-200 disabled:opacity-50 p-1"
                  >
                    {isSearching ? <Loader2 size={16} className="animate-spin" /> : t('library.aiSearch')}
                  </button>
               </div>
             )}
          </div>

          {/* Language Switcher */}
          <div className="relative" ref={langMenuRef}>
            <button onClick={() => setShowLangMenu(prev => !prev)} className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-md rounded-2xl active:bg-white/10 border border-white/10 transition-colors">
              <Languages size={18} className="text-white/70"/>
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 animate-in fade-in zoom-in-95 duration-200">
                <ul className="p-2 text-sm text-slate-200">
                  <li onClick={() => { setLanguage('en'); setShowLangMenu(false); }} className={`px-3 py-2.5 rounded-lg active:bg-white/10 cursor-pointer ${language === 'en' ? 'font-bold text-indigo-300' : ''}`}>English</li>
                  <li onClick={() => { setLanguage('ru'); setShowLangMenu(false); }} className={`px-3 py-2.5 rounded-lg active:bg-white/10 cursor-pointer ${language === 'ru' ? 'font-bold text-indigo-300' : ''}`}>Русский</li>
                </ul>
              </div>
            )}
          </div>

        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="flex justify-center pt-32 text-white/50 animate-pulse">{t('library.loading')}</div>
        ) : comics.length === 0 && searchQuery === '' ? (
          <div className="flex flex-col items-center justify-center pt-32 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-white/10">
                <BookOpen size={48} className="text-white/40" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 drop-shadow-md">{t('library.empty.title')}</h2>
            <p className="text-white/50 max-w-xs mb-10 leading-relaxed">{t('library.empty.description')}</p>
            <button onClick={onOpenUploader} className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 active:from-indigo-400 active:to-purple-500 text-white rounded-2xl font-bold flex items-center gap-3 shadow-lg active:shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all">
                <Plus size={20} />
                {t('library.empty.button')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredComics.map((comic) => {
              const progress = comic.lastReadPage && comic.totalPages > 1 ? ((comic.lastReadPage + 1) / comic.totalPages) * 100 : 0;
              return (
              <div key={comic.id} className="group relative flex flex-col bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all shadow-xl duration-300">
                <div onClick={() => onOpenReader(comic)} className="cursor-pointer">
                  <div className="aspect-[2/3] w-full bg-black/20 relative overflow-hidden">
                    <ComicCoverImage 
                      blob={comic.coverImageBlob} 
                      alt={comic.title} 
                      className="w-full h-full object-cover transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
                    {progress > 0 && progress < 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 backdrop-blur-sm"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{width: `${progress}%`}} /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight mb-1 transition-colors">{comic.title}</h3>
                    <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{t('library.comic.pages', { count: comic.totalPages })}</p>
                  </div>
                </div>
                 {/* Kebab Menu */}
                <div className="absolute top-2 right-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setMenuComicId(menuComicId === comic.id ? null : comic.id); }} 
                    className="p-2 bg-black/40 backdrop-blur-md text-white/70 rounded-full active:bg-indigo-500/80 active:text-white border border-white/10 transition-colors"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {menuComicId === comic.id && (
                    <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 animate-in fade-in zoom-in-95 duration-200">
                      <ul className="p-2 text-sm text-slate-200">
                        <li onClick={() => handleEditPagesClick(comic)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg active:bg-white/10 cursor-pointer">
                          <LayoutGrid size={16} /> {t('library.menu.edit')}
                        </li>
                        <li onClick={() => handleEditCoverClick(comic)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg active:bg-white/10 cursor-pointer">
                          <ImageIcon size={16} /> {t('library.menu.editCover')}
                        </li>
                        <li onClick={() => handleRenameClick(comic)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg active:bg-white/10 cursor-pointer">
                          <FilePenLine size={16} /> {t('library.menu.rename')}
                        </li>
                        <li onClick={(e) => handleDeleteClick(e, comic)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg active:bg-red-500/20 text-red-400 active:text-red-300 cursor-pointer">
                          <Trash2 size={16} /> {t('library.menu.delete')}
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </main>

      {/* Glass Floating Action Button */}
      {comics.length > 0 && searchQuery === '' && (
        <button onClick={onOpenUploader} className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-[0_8px_32px_rgba(79,70,229,0.4)] border border-white/20 flex items-center justify-center active:scale-90 transition-transform z-40">
            <Plus size={32} />
        </button>
      )}

      {/* Rename Title Modal */}
      {editingComic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md m-4 animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold mb-4 text-white">{t('library.editModal.title')}</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
            />
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setEditingComic(null)} className="px-5 py-2.5 text-sm font-semibold rounded-xl active:bg-white/10 transition-colors text-slate-300">{t('library.editModal.cancel')}</button>
              <button onClick={handleSaveRename} disabled={!newTitle.trim() || newTitle === editingComic.title} className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 active:bg-indigo-500 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white">{t('library.editModal.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingComic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm m-4 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white">{t('library.deleteModal.title')}</h2>
            <p className="text-white/60 mb-8 leading-relaxed">
              {t('library.deleteConfirm', { title: deletingComic.title })}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleConfirmDelete} 
                className="w-full py-4 bg-red-600 active:bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-900/20 transition-all active:scale-95"
              >
                {t('library.deleteModal.confirm')}
              </button>
              <button 
                onClick={() => setDeletingComic(null)} 
                className="w-full py-4 bg-white/5 active:bg-white/10 text-slate-300 rounded-2xl font-bold transition-all"
              >
                {t('library.deleteModal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;