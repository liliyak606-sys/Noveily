import React from 'react';

const Logo: React.FC = () => (
  <svg
    width="120"
    height="40"
    viewBox="0 0 120 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Noveily Logo"
    className="drop-shadow-lg"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="20" x2="120" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F472B6" /> 
        <stop offset="0.5" stopColor="#A78BFA" /> 
        <stop offset="1" stopColor="#6366F1" /> 
      </linearGradient>
    </defs>
    <text
      x="0"
      y="30"
      fontFamily="'Inter', sans-serif"
      fontSize="34"
      fontWeight="800"
      fontStyle="italic"
      fill="url(#logoGradient)"
      letterSpacing="-2"
    >
      Noveily
    </text>
  </svg>
);

export default Logo;
