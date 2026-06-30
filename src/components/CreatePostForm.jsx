import { useState, useRef } from "react";
import { createPost } from "../services/api";
import { Image, Video, BarChart2, Calendar, FileText, X, Plus } from "lucide-react";
import Button from "./common/Button";

function CreatePostForm({ onAddPost }) {
  const [content, setContent] = useState("");
  
  // Media attachments
  const [mediaUrls, setMediaUrls] = useState([]);
  const [mediaType, setMediaType] = useState("image");
  const fileInputRef = useRef(null);

  // Poll fields
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Scheduling & Drafts
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [isDraft, setIsDraft] = useState(false);

  const handleFileAttach = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Simulate file upload by setting data URI
      setMediaUrls((prev) => [...prev, reader.result]);
      setMediaType(file.type.startsWith("video") ? "video" : "image");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = (index) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const handlePollOptionChange = (index, value) => {
    const next = [...pollOptions];
    next[index] = value;
    setPollOptions(next);
  };

  const handleRemovePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && mediaUrls.length === 0 && !pollQuestion.trim()) return;

    const postPayload = {
      content,
      media: mediaUrls,
      isDraft,
      scheduledFor: isScheduled && scheduleDate ? scheduleDate : null,
      poll: showPoll && pollQuestion.trim() ? {
        question: pollQuestion,
        options: pollOptions.filter(opt => opt.trim() !== "")
      } : null
    };

    try {
      const newPost = await createPost(postPayload);
      onAddPost(newPost);
      
      // Reset form
      setContent("");
      setMediaUrls([]);
      setShowPoll(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setIsScheduled(false);
      setScheduleDate("");
      setIsDraft(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-slate-100">
      
      {/* Caption Area */}
      <div>
        <textarea
          placeholder="Share something secure..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows="4"
          className="w-full resize-none bg-slate-950/60 border border-slate-850 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Media Carousel Preview */}
      {mediaUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-3 bg-slate-950/30 border border-slate-900 rounded-2xl p-3">
          {mediaUrls.map((url, index) => (
            <div key={index} className="relative aspect-square border border-slate-800 rounded-xl overflow-hidden group">
              {mediaType === "video" ? (
                <video src={url} className="w-full h-full object-cover" />
              ) : (
                <img src={url} className="w-full h-full object-cover" alt="preview" />
              )}
              <button
                type="button"
                onClick={() => handleRemoveMedia(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Poll Creation Widget */}
      {showPoll && (
        <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Create Poll</span>
            <button type="button" onClick={() => setShowPoll(false)} className="text-xs text-red-400 hover:underline">
              Cancel Poll
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Ask a question..."
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-650"
          />

          <div className="space-y-2">
            {pollOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handlePollOptionChange(index, e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-900 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder-slate-650"
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePollOption(index)}
                    className="text-xs text-slate-500 hover:text-white"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {pollOptions.length < 5 && (
            <button
              type="button"
              onClick={handleAddPollOption}
              className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold hover:text-cyan-300"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Option
            </button>
          )}
        </div>
      )}

      {/* Scheduling Widget */}
      {isScheduled && (
        <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Schedule Post</span>
            <button type="button" onClick={() => setIsScheduled(false)} className="text-xs text-red-400 hover:underline">
              Cancel Schedule
            </button>
          </div>
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2 px-3 text-xs text-slate-200"
          />
        </div>
      )}

      {/* Toolbar Controls */}
      <div className="flex justify-between items-center border-t border-slate-850 pt-4">
        <div className="flex items-center gap-2">
          {/* Add media */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-450 hover:text-cyan-400 rounded-xl transition-all"
          >
            <Image className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileAttach}
          />

          {/* Add poll */}
          <button
            type="button"
            onClick={() => setShowPoll(true)}
            className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-450 hover:text-cyan-400 rounded-xl transition-all"
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          {/* Add scheduled post */}
          <button
            type="button"
            onClick={() => setIsScheduled(true)}
            className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-450 hover:text-cyan-400 rounded-xl transition-all"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {/* Toggle Draft mode */}
          <button
            type="button"
            onClick={() => setIsDraft(!isDraft)}
            className={`p-2.5 border rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
              isDraft 
                ? "bg-purple-950/20 border-purple-550/40 text-purple-400" 
                : "bg-slate-900 border-slate-850 text-slate-450 hover:bg-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isDraft ? "Draft active" : "Save Draft"}</span>
          </button>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={!content.trim() && mediaUrls.length === 0 && !pollQuestion.trim()}
          variant="primary"
        >
          Publish
        </Button>
      </div>

    </form>
  );
}

export default CreatePostForm;
