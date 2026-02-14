
import React, { useState, useEffect } from 'react';
import Library from './components/Library';
import Reader from './components/Reader';
import Uploader from './components/Uploader';
import Editor from './components/Editor';
import CoverEditor from './components/CoverEditor';
import SplashScreen from './components/SplashScreen';
import { ToastContainer } from './components/Toast';
import { Comic, ViewState, ToastMessage } from './types';
import { v4 as uuidv4 } from 'uuid';
import { LanguageProvider } from './contexts/LanguageContext';
import LanguageSelectionScreen from './components/LanguageSelectionScreen';
import Onboarding from './components/Onboarding';

const AppContent: React.FC = () => {
  const [view, setView] = useState<ViewState>('LIBRARY');
  const [activeComic, setActiveComic] = useState<Comic | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showLangSelection, setShowLangSelection] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  useEffect(() => {
    const langIsSet = localStorage.getItem('noveily-lang');
    if (!langIsSet) {
      setShowLangSelection(true);
      return; 
    }

    const onboardingComplete = localStorage.getItem('noveily-onboarding-complete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  }, []);

  const showToast = (message: string, type: ToastMessage['type'] = 'success') => {
      const id = uuidv4();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
      }, 3000);
  };

  const handleOpenReader = (comic: Comic) => {
    setActiveComic(comic);
    setView('READER');
  };

  const handleOpenUploader = () => {
    setView('UPLOAD');
  };

  const handleOpenEditor = (comic: Comic) => {
    setActiveComic(comic);
    setView('EDIT');
  };

  const handleOpenCoverEditor = (comic: Comic) => {
    setActiveComic(comic);
    setView('COVER_EDITOR');
  };

  const handleCloseView = () => {
    setActiveComic(null);
    setView('LIBRARY');
  };

  const handleUploadComplete = (message: string) => {
    showToast(message, 'success');
    setView('LIBRARY');
  };

  const handleLanguageSelected = () => {
    setShowLangSelection(false);
    const onboardingComplete = localStorage.getItem('noveily-onboarding-complete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  };
  
  const handleOnboardingComplete = () => {
    localStorage.setItem('noveily-onboarding-complete', 'true');
    setShowOnboarding(false);
  };

  if (isInitialLoading) {
    return <SplashScreen onFinish={() => setIsInitialLoading(false)} />;
  }

  if (showLangSelection) {
    return <LanguageSelectionScreen onLanguageSelected={handleLanguageSelected} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-pink-500/30 selection:text-pink-200">
      {view === 'LIBRARY' && (
        <Library 
          onOpenReader={handleOpenReader} 
          onOpenUploader={handleOpenUploader} 
          onOpenEditor={handleOpenEditor}
          onOpenCoverEditor={handleOpenCoverEditor}
          showToast={showToast}
        />
      )}

      {view === 'READER' && activeComic && (
        <Reader 
          comic={activeComic} 
          onClose={handleCloseView} 
        />
      )}

      {view === 'EDIT' && activeComic && (
        <Editor 
          comic={activeComic}
          onClose={handleCloseView}
          showToast={showToast}
        />
      )}

      {view === 'COVER_EDITOR' && activeComic && (
        <CoverEditor 
          comic={activeComic}
          onClose={handleCloseView}
          showToast={showToast}
        />
      )}

      {view === 'UPLOAD' && (
        <div className="fixed inset-0 z-50">
          <Uploader 
            onUploadComplete={handleUploadComplete} 
            onCancel={handleCloseView} 
          />
        </div>
      )}
      
      <ToastContainer toasts={toasts} />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;