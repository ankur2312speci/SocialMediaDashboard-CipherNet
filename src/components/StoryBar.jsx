import { useState, useEffect, useRef } from "react";
import { fetchStories, createStory } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import StoryViewer from "./StoryViewer";
import { Plus, Check, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function StoryBar() {
  const { user } = useAuthStore();
  const [groupedStories, setGroupedStories] = useState([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const data = await fetchStories();
      setGroupedStories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await createStory({
          media: reader.result,
          caption: "Secure highlight"
        });
        await loadStories();
        alert("Story uploaded successfully!");
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const activeGroup = activeGroupIndex !== null ? groupedStories[activeGroupIndex] : null;

  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 mb-6">
      
      {/* Story Creator Card (Self Profile) */}
      {user && (
        <div className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer">
          <div className="relative">
            <div 
              onClick={() => {
                // If user has stories in the list, view them, else click to upload
                const selfGroupIndex = groupedStories.findIndex(g => g.user._id === user._id);
                if (selfGroupIndex !== -1) {
                  setActiveGroupIndex(selfGroupIndex);
                } else {
                  handleStoryUploadClick();
                }
              }}
              className="w-16 h-16 rounded-full p-[2px] bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden hover:border-cyan-500/50 transition-all"
            >
              <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="your avatar" />
            </div>
            
            {/* Pulsing upload plus sign */}
            <button 
              onClick={handleStoryUploadClick}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-full border-2 border-slate-950 flex items-center justify-center transition-transform hover:scale-105"
            >
              {isUploading ? (
                <div className="w-2.5 h-2.5 border border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-2.5 h-2.5 stroke-[4px]" />
              )}
            </button>
          </div>
          <span className="text-[10px] font-bold text-slate-400 text-center truncate w-full mt-1">Your Story</span>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Story list Roster */}
      {loading ? (
        <div className="flex gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-16 h-16 rounded-full bg-slate-900/60 animate-pulse border border-slate-850" />
          ))}
        </div>
      ) : (
        groupedStories
          .filter(group => group.user._id !== user?._id) // Filter self profile as it's shown first
          .map((group, index) => {
            // Find global index in groupedStories
            const globalIndex = groupedStories.findIndex(g => g.user._id === group.user._id);

            return (
              <div 
                key={group.user._id} 
                onClick={() => setActiveGroupIndex(globalIndex)}
                className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-purple-550 to-pink-500 shadow-md group-hover:scale-102 transition-transform">
                  <div className="w-full h-full rounded-full border-2 border-slate-950 bg-slate-900 p-[1px] overflow-hidden">
                    <img src={group.user.avatar} className="w-full h-full rounded-full object-cover" alt="avatar" />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 text-center truncate w-full mt-1">
                  @{group.user.username}
                </span>
              </div>
            );
          })
      )}

      {/* Story Viewer Overlay Dialog */}
      <AnimatePresence>
        {activeGroup && (
          <StoryViewer
            activeGroup={activeGroup}
            onClose={() => setActiveGroupIndex(null)}
            onNextGroup={() => setActiveGroupIndex(activeGroupIndex + 1)}
            onPrevGroup={() => setActiveGroupIndex(activeGroupIndex - 1)}
            hasNextGroup={activeGroupIndex < groupedStories.length - 1}
            hasPrevGroup={activeGroupIndex > 0}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default StoryBar;
