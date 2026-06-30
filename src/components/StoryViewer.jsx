import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function StoryViewer({ activeGroup, onClose, onNextGroup, onPrevGroup, hasNextGroup, hasPrevGroup }) {
  const { user, stories } = activeGroup;
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const activeStory = stories[activeIndex];

  // Story Auto-Advance Timer
  useEffect(() => {
    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const intervalTime = 50;
    const increment = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeIndex, activeGroup]);

  const handleNext = () => {
    if (activeIndex < stories.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      // Last story of this group, trigger next group
      if (hasNextGroup) {
        setActiveIndex(0);
        onNextGroup();
      } else {
        onClose();
      }
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    } else {
      // First story of this group, trigger prev group
      if (hasPrevGroup) {
        onPrevGroup();
      } else {
        setActiveIndex(0); // Restart current
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950 flex items-center justify-center p-4 select-none">
      
      {/* Tap targets for mobile */}
      <div className="absolute inset-0 flex">
        <div className="w-[30%] h-full cursor-w-resize" onClick={handlePrev} />
        <div className="w-[70%] h-full cursor-e-resize" onClick={handleNext} />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-black border border-slate-900 aspect-[9/16] rounded-3xl overflow-hidden relative flex flex-col justify-between shadow-2xl z-10"
      >
        
        {/* Top Indicators & User info header */}
        <div className="p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20 space-y-3">
          
          {/* Progress Bars */}
          <div className="flex gap-1.5 w-full">
            {stories.map((_, i) => (
              <div key={i} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-400 transition-all duration-75"
                  style={{ 
                    width: i < activeIndex ? "100%" : i === activeIndex ? `${progress}%` : "0%" 
                  }}
                />
              </div>
            ))}
          </div>

          {/* User Details */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={user?.avatar} 
                alt={user?.username} 
                className="w-8 h-8 rounded-full border border-slate-800 object-cover" 
              />
              <span className="text-xs font-bold text-slate-100">@{user?.username}</span>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Buttons (Desktop side clicks) */}
        {hasPrevGroup || activeIndex > 0 ? (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/50 hover:bg-black/80 text-white rounded-full border border-white/5 transition-all hidden md:block"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : null}

        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/50 hover:bg-black/80 text-white rounded-full border border-white/5 transition-all hidden md:block"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Media Story Content */}
        <div className="w-full h-full bg-slate-950 flex items-center justify-center relative">
          {activeStory?.media.endsWith(".mp4") ? (
            <video src={activeStory.media} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={activeStory?.media} alt="story media" className="w-full h-full object-cover" />
          )}

          {/* Inline Caption bottom overlay */}
          {activeStory?.caption && (
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/60 border border-white/5 backdrop-blur-md text-center text-xs text-slate-200">
              {activeStory.caption}
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}

export default StoryViewer;
