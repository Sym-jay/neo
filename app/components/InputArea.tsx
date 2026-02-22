"use client";

import React, { useRef, useEffect } from "react";
import { Paperclip, FolderOpen, ArrowUp } from "lucide-react";

interface InputAreaProps {
  message: string;
  setMessage: (message: string) => void;
}

export default function InputArea({ message, setMessage }: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
    }
  }, [message]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim().length > 0) {
        // Handle message submission
        setMessage("");
      }
    }
  };

  return (
    <div className="w-full pb-6 pt-2 px-4 sm:px-0 z-10">
      <div className="max-w-3xl mx-auto relative">
        <div className="relative flex flex-col w-full border border-panel-border bg-panel/40 backdrop-blur-2xl shadow-xl rounded-3xl overflow-hidden focus-within:border-muted/50 focus-within:ring-4 focus-within:ring-accent/20 transition-all duration-300">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your prompt here"
            className="w-full max-h-48 min-h-[60px] bg-transparent border-none text-foreground text-sm p-4 pt-4 pb-12 resize-none focus:outline-none focus:ring-0"
            rows={1}
          />
          
          {/* Bottom Actions of Input Box */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <button 
              className="p-1.5 text-muted hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              title="Attach files"
            >
              <Paperclip size={18} />
            </button>
            <button 
              className="p-1.5 text-muted hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              title="Open folder"
            >
              <FolderOpen size={18} />
            </button>
          </div>
          
          <button 
            className={`absolute bottom-3 right-3 p-1.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
              message.trim().length > 0 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 scale-100" 
                : "bg-accent/80 text-muted cursor-not-allowed scale-95"
            }`}
            disabled={message.trim().length === 0}
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
