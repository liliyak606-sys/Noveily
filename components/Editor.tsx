
import React, { useState, useEffect } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import { Comic, ComicPage } from '../types';
import { getComicPages, deleteComicPage } from '../utils/db';
import { useLanguage } from '../contexts/LanguageContext';

interface EditorProps {
  comic: Comic;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Component to safely manage blob URLs for page previews in the editor
const EditorPagePreview: React.FC<{ page: ComicPage; onDelete: () => void }> = ({ page, onDelete }) => {
    const [imageUrl, setImageUrl] = useState('');
    useEffect(() => {
        const url = URL.createObjectURL(page.blob);
        setImageUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [page.blob]);

    return (
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-lg group">
            <img src={imageUrl} alt={`Page ${page.order + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                    type="button"
                    onClick={onDelete}
                    className="p-3 bg-red-500/80 rounded-full text-white active:bg-red-600 transition-colors z-10"
                    aria-label="Delete page"
                >
                    <Trash2 size={20} />
                </button>
            </div>
            <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md border border-white/10 text-[10px] px-2 py-0.5 rounded-md text-white font-mono">
                {page.order + 1}
            </span>
        </div>
    );
};

const Editor: React.FC<EditorProps> = ({ comic, onClose, showToast }) => {
  const [pages, setPages] = useState<ComicPage[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const loadPages = async () => {
    try {
      const loadedPages = await getComicPages(comic.id);
      setPages(loadedPages);
    } catch (err) {
      console.error("Failed to load pages for editing", err);
      showToast(t('uploader.toast.saveFailed'), "error"); // A generic error message
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadPages();
  }, [comic.id]);

  const handleDeletePage = async (pageId: string) => {
    if (confirm(t('reader.deletePageConfirm'))) {
      try {
        await deleteComicPage(pageId, comic.id);
        showToast(t('reader.deletePageSuccess'), 'success');
        
        const remainingPages = await getComicPages(comic.id);
        if (remainingPages.length === 0) {
            showToast(t('reader.deletePageEmptyComic'), 'info');
            onClose(); // Comic was deleted, so close editor and go back to library
        } else {
            setPages(remainingPages);
        }
      } catch (error) {
        console.error("Failed to delete page", error);
        showToast(t('reader.deletePageFailed'), 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-full w-full bg-slate-900/60 backdrop-blur-2xl text-white p-6 animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300 drop-shadow-sm">
              {t('editor.title')}
            </h2>
            <p className="text-white/50">{comic.title}</p>
          </div>
          <button onClick={onClose} className="px-6 py-3 bg-indigo-600 active:bg-indigo-500 rounded-xl font-bold transition-colors">
            {t('editor.done')}
          </button>
        </div>

        <div className="flex-1 bg-black/20 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden relative">
          {loading ? (
             <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="animate-spin" size={32} />
             </div>
          ) : pages.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-white/80 font-medium text-lg">This comic has no pages.</p>
                <p className="text-white/40 text-sm mt-2">The comic has been removed from your library.</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 content-start no-scrollbar">
              {pages.map((page) => (
                <EditorPagePreview key={page.id} page={page} onDelete={() => handleDeletePage(page.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
