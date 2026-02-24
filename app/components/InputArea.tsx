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
    <div className="w-full pb-8 pt-2 px-4 sm:px-0 z-10">
      <div className="max-w-3xl mx-auto relative">
        {/* Liquid Glass Apple-inspired Inline Navbar/Island */}
        <div className="relative flex items-end w-full border border-panel-border/80 bg-panel/50 backdrop-blur-2xl shadow-2xl rounded-[32px] p-1.5 focus-within:border-muted/60 focus-within:ring-4 focus-within:ring-accent/20 transition-all duration-300">
          
          <div className="flex items-center gap-1 mb-0.5 ml-1">
            <button 
              className="p-2.5 text-muted hover:text-foreground hover:bg-foreground/5 rounded-full transition-all duration-200"
              title="Attach files"
            >
              <Paperclip size={20} />
            </button>
            <button 
              className="p-2.5 text-muted hover:text-foreground hover:bg-foreground/5 rounded-full transition-all duration-200"
              title="Open folder"
            >
              <FolderOpen size={20} />
            </button>
          </div>
          
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your prompt here..."
            className="flex-1 max-h-48 min-h-[44px] bg-transparent border-none text-foreground text-[15px] px-3 py-3 mx-1 resize-none focus:outline-none focus:ring-0 leading-relaxed"
            rows={1}
          />
          
          <div className="mb-0.5 mr-1">
            <button 
              className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                message.trim().length > 0 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 scale-100" 
                  : "bg-foreground/5 text-muted/50 cursor-not-allowed scale-95"
              }`}
              disabled={message.trim().length === 0}
            >
              <ArrowUp size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
