
import React, { useState } from 'react';
import { Upload, X, Loader2, Plus, Image as ImageIcon } from 'lucide-react';
import { saveComic } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import { useLanguage } from '../contexts/LanguageContext';

interface UploaderProps {
  onUploadComplete: (message: string) => void;
  onCancel: () => void;
}

const Uploader: React.FC<UploaderProps> = ({ onUploadComplete, onCancel }) => {
  const [title, setTitle] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { t } = useLanguage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      newFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || files.length === 0) return;

    setIsUploading(true);
    try {
      const comicId = uuidv4();
      const pages = files.map((file, index) => ({
        id: uuidv4(),
        comicId,
        blob: file,
        order: index,
      }));

      // Use provided cover or fallback to first page
      const coverBlob = coverFile || files[0];

      await saveComic({
        id: comicId,
        title,
        coverImageBlob: coverBlob,
        createdAt: Date.now(),
        totalPages: files.length,
        lastReadPage: 0,
      }, pages);

      onUploadComplete(t('uploader.toast.saved', { title }));
    } catch (error) {
      console.error("Upload failed", error);
      alert(t('uploader.toast.saveFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/60 backdrop-blur-2xl text-white p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300 drop-shadow-sm">
            {t('uploader.title')}
          </h2>
          <button onClick={onCancel} className="p-2 active:bg-white/10 rounded-full transition-colors">
            <X size={28} className="text-white/80" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-8 overflow-y-auto no-scrollbar pb-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-indigo-300 uppercase tracking-wide">{t('uploader.comicTitleLabel')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('uploader.comicTitlePlaceholder')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl text-white placeholder:text-white/20 focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 outline-none transition-all shadow-inner"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-indigo-300 uppercase tracking-wide">{t('uploader.coverLabel')}</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border-dashed">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <ImageIcon size={20} className="text-indigo-300" />
                    </div>
                    <span className="text-sm text-white/60 truncate max-w-[200px]">
                      {coverFile ? coverFile.name : t('uploader.coverPlaceholder')}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                  <div className="text-xs font-bold text-indigo-400">{coverFile ? t('library.menu.rename') : t('uploader.addMore')}</div>
                </label>
                {coverFile && (
                  <div className="w-16 h-20 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                    <img src={URL.createObjectURL(coverFile)} alt="Cover preview" className="w-full h-full object-cover" onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-indigo-300 uppercase tracking-wide">{t('uploader.pagesLabel', { count: files.length })}</label>
              <label className="flex items-center gap-2 px-4 py-2 bg-white/10 active:bg-white/20 border border-white/10 rounded-xl text-xs font-bold cursor-pointer transition-all">
                <Plus size={14} />
                {t('uploader.addMore')}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="flex-1 bg-black/20 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden relative transition-all min-h-[200px]">
              {files.length === 0 ? (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer active:bg-white/5 transition-colors">
                  <div className="p-6 bg-white/5 rounded-full mb-4 backdrop-blur-sm border border-white/5">
                    <Upload size={40} className="text-indigo-300" />
                  </div>
                  <p className="text-white/80 font-medium text-lg">{t('uploader.dropzone.title')}</p>
                  <p className="text-white/40 text-sm mt-2">{t('uploader.dropzone.subtitle')}</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="h-full overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 content-start no-scrollbar">
                  {files.map((file, idx) => (
                    <div key={idx} className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-lg">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 rounded-full text-white active:bg-red-600 transition-colors z-10"
                      >
                        <X size={14} />
                      </button>
                      <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md border border-white/10 text-[10px] px-2 py-0.5 rounded-md text-white font-mono">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isUploading || files.length === 0 || !title.trim()}
            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold text-lg text-white shadow-[0_0_25px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.99] transition-transform border border-white/10 shrink-0 mt-auto"
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" /> {t('uploader.button.uploading')}
              </>
            ) : (
              t('uploader.button.create')
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Uploader;
