import React, { useState } from 'react';
import { BookHeart, Smartphone, BrainCircuit, Rocket, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from './Logo';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const { t } = useLanguage();

  const onboardingSteps = [
    {
      icon: <BookHeart size={64} className="text-pink-400" />,
      title: t('onboarding.step1.title'),
      description: t('onboarding.step1.description'),
    },
    {
      icon: <Smartphone size={64} className="text-indigo-400" />,
      title: t('onboarding.step2.title'),
      description: t('onboarding.step2.description'),
    },
    {
      icon: <BrainCircuit size={64} className="text-purple-400" />,
      title: t('onboarding.step3.title'),
      description: t('onboarding.step3.description'),
    },
    {
      icon: <Rocket size={64} className="text-green-400" />,
      title: t('onboarding.step4.title'),
      description: t('onboarding.step4.description'),
    },
  ];

  const handleNext = () => {
    if (step < onboardingSteps.length - 1) {
      setStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const currentStep = onboardingSteps[step];
  const isLastStep = step === onboardingSteps.length - 1;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-between p-8 bg-slate-900 animate-in fade-in duration-500">
      <header className="w-full flex justify-between items-center">
        <Logo />
        <button onClick={onComplete} className="flex items-center gap-2 text-sm text-white/60 active:text-white transition-colors">
          {t('onboarding.skip')} <X size={16} />
        </button>
      </header>

      <main className="flex flex-col items-center text-center -mt-16 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="mb-8 w-32 h-32 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-white/10">
          {currentStep.icon}
        </div>
        <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-md max-w-sm">
          {currentStep.title}
        </h1>
        <p className="text-white/70 max-w-sm leading-relaxed">
          {currentStep.description}
        </p>
      </main>

      <footer className="w-full flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === step ? 'bg-indigo-400 scale-125' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
        <button
          onClick={handleNext}
          className="w-full max-w-sm py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold text-lg text-white shadow-[0_0_25px_rgba(79,70,229,0.4)] flex items-center justify-center gap-3 active:scale-[0.99] transition-transform border border-white/10"
        >
          {isLastStep ? t('onboarding.getStarted') : t('onboarding.next')}
          {!isLastStep && <ArrowRight size={20} />}
        </button>
      </footer>
    </div>
  );
};

export default Onboarding;
