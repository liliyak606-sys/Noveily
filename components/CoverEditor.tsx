
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Upload, ZoomIn, ZoomOut, RotateCw, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Comic } from '../types';
import { updateComicCover } from '../utils/db';
import { useLanguage } from '../contexts/LanguageContext';

interface CoverEditorProps {
  comic: Comic;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CoverEditor: React.FC<CoverEditorProps> = ({ comic, onClose, showToast }) => {
  const [image, setImage] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<Blob | File | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (comic.coverImageBlob) {
      setImageSource(comic.coverImageBlob);
    }
  }, [comic.coverImageBlob]);
  
  useEffect(() => {
    let url: string | null = null;
    if (imageSource) {
      url = URL.createObjectURL(imageSource);
      setImage(url);
    } else {
      setImage(null);
    }
    
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [imageSource]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageSource(e.target.files[0]);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleSave = async () => {
    if (!imageRef.current || !containerRef.current) return;
    setLoading(true);

    try {
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) {
        throw new Error('Could not get canvas context');
      }

      const targetWidth = 600;
      const targetHeight = 900;
      finalCanvas.width = targetWidth;
      finalCanvas.height = targetHeight;
      
      const container = containerRef.current;
      const img = imageRef.current;

      // The render scale is the ratio of our target canvas size to the displayed container size
      const renderScale = targetWidth / container.offsetWidth;

      // We apply transformations to the context to mimic the CSS transformations on the image
      // 1. Move canvas origin to its center
      finalCtx.translate(targetWidth / 2, targetHeight / 2);
      
      // 2. Apply user's panning (position)
      finalCtx.translate(position.x * renderScale, position.y * renderScale);
      
      // 3. Apply user's rotation
      finalCtx.rotate(rotation * Math.PI / 180);
      
      // 4. Apply user's zoom
      finalCtx.scale(zoom, zoom);
      
      // Now, we need to draw the image. Its base size (before zoom) should cover the container.
      const imgAspectRatio = img.naturalWidth / img.naturalHeight;
      const containerAspectRatio = container.offsetWidth / container.offsetHeight;
      
      let scaledDrawWidth, scaledDrawHeight;
      
      // This logic determines if the image should fit by width or height to cover the container
      if (imgAspectRatio > containerAspectRatio) {
          scaledDrawHeight = container.offsetHeight * renderScale;
          scaledDrawWidth = scaledDrawHeight * imgAspectRatio;
      } else {
          scaledDrawWidth = container.offsetWidth * renderScale;
          scaledDrawHeight = scaledDrawWidth / imgAspectRatio;
      }

      // Draw the image centered on the transformed context
      finalCtx.drawImage(img, -scaledDrawWidth / 2, -scaledDrawHeight / 2, scaledDrawWidth, scaledDrawHeight);

      finalCanvas.toBlob(async (blob) => {
        if (blob) {
          await updateComicCover(comic.id, blob);
          showToast(t('library.toast.titleUpdated'), 'success');
          onClose();
        } else {
            throw new Error('Canvas toBlob returned null');
        }
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error("Save cover error:", error);
      showToast(t('library.toast.titleUpdateFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-2xl animate-in fade-in duration-300">
      <header className="p-4 border-b border-white/5 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">{t('library.menu.editCover')}</h2>
        <div className="flex gap-2">
          <button onClick={onClose} className="p-2 text-white/60 active:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* The Crop Area (Fixed 2:3 Aspect Ratio) */}
        <div 
          ref={containerRef}
          className="relative w-full max-w-[340px] aspect-[2/3] border-4 border-indigo-500/50 rounded-2xl overflow-hidden shadow-2xl bg-black/40 cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {image ? (
            <img 
              ref={imageRef}
              src={image} 
              alt="Cover edit" 
              draggable={false}
              className="absolute pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                // Ensure image covers the container initially
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
              <ImageIcon size={64} className="mb-4" />
              <p>{t('uploader.coverPlaceholder')}</p>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="mt-8 flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 w-full justify-center">
            <button onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))} className="p-2 text-white/60 active:text-white"><ZoomOut size={20} /></button>
            <input 
              type="range" 
              min="0.1" 
              max="3" 
              step="0.01" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))} 
              className="w-full accent-indigo-500"
            />
            <button onClick={() => setZoom(prev => Math.min(3, prev + 0.1))} className="p-2 text-white/60 active:text-white"><ZoomIn size={20} /></button>
            <button onClick={() => setRotation(prev => (prev + 90) % 360)} className="p-2 text-white/60 active:text-white ml-2"><RotateCw size={20} /></button>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold active:bg-white/10 transition-all"
            >
              <Upload size={18} /> {t('uploader.addMore')}
            </button>
            <button 
              onClick={handleSave}
              disabled={loading || !image}
              className="flex items-center justify-center gap-2 py-4 bg-indigo-600 rounded-2xl font-bold active:bg-indigo-500 shadow-lg shadow-indigo-900/40 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> {t('library.editModal.save')}</>}
            </button>
          </div>
        </div>
      </main>

      <input 
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default CoverEditor;
