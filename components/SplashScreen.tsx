
import React, { useEffect, useState } from 'react';
import Logo from './Logo';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // Wait for fade out animation
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center bg-[#0f172a] transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="scale-150 animate-pulse">
        <Logo />
      </div>
    </div>
  );
};

export default SplashScreen;
