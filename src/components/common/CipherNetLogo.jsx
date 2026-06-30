import React from "react";

export default function CipherNetLogo({ className = "w-8 h-8", textClassName = "text-white" }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield Boundary with Linear Gradient */}
      <path 
        d="M12 2L4 5V11C4 16.52 7.42 21.74 12 23C16.58 21.74 20 16.52 20 11V5L12 2Z" 
        fill="url(#cipherGrad)" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinejoin="round" 
        className="text-cyan-500"
      />
      
      {/* Lock Shackle */}
      <path 
        d="M9 13V10.2C9 8.5 10.3 7.2 12 7.2C13.7 7.2 15 8.5 15 10.2V13" 
        stroke="white" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
      />
      
      {/* Chat Bubble / Padlock Base Hybrid */}
      <path 
        d="M7.5 13C7.5 12.45 7.95 12 8.5 12H15.5C16.05 12 16.5 12.45 16.5 13V16.5C16.5 17.05 16.05 17.5 15.5 17.5H10.5L7.5 19.5V13Z" 
        fill="currentColor" 
        className={textClassName}
      />
      
      {/* Keyhole */}
      <circle cx="12" cy="14.8" r="1" fill="#7C3AED" />
      
      {/* Brand Gradient Definition */}
      <defs>
        <linearGradient id="cipherGrad" x1="4" y1="2" x2="20" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" /> {/* Brand Purple */}
          <stop offset="1" stopColor="#06B6D4" /> {/* Brand Cyan */}
        </linearGradient>
      </defs>
    </svg>
  );
}
