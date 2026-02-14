import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from './Logo';

interface LanguageSelectionScreenProps {
  onLanguageSelected: () => void;
}

const LanguageSelectionScreen: React.FC<LanguageSelectionScreenProps> = ({ onLanguageSelected }) => {
  const { setLanguage } = useLanguage();

  const handleSelect = (lang: 'en' | 'ru') => {
    setLanguage(lang);
    onLanguageSelected();
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900 animate-in fade-in duration-500">
        <div className="flex flex-col items-center text-center p-8">
            <Logo />
            <h1 className="text-2xl font-bold text-white mt-12 mb-6 drop-shadow-md">
                Choose your language / Выберите ваш язык
            </h1>
            <div className="flex flex-col sm:flex-row gap-6 mt-4">
                <button 
                    onClick={() => handleSelect('ru')}
                    className="px-12 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 active:from-indigo-400 active:to-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg active:shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all"
                >
                    Русский
                </button>
                <button 
                    onClick={() => handleSelect('en')}
                    className="px-12 py-4 bg-white/10 backdrop-blur-md border border-white/20 active:bg-white/20 text-white rounded-2xl font-bold text-lg shadow-lg active:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
                >
                    English
                </button>
            </div>
        </div>
    </div>
  );
};

export default LanguageSelectionScreen;
