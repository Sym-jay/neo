"use client";

import React, { useRef, useEffect, useState } from "react";
import { Paperclip, FolderOpen, ArrowUp, File, X, Folder } from "lucide-react";

interface InputAreaProps {
  message: string;
  setMessage: (message: string) => void;
}

interface AttachedItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  file?: File;
}

export default function InputArea({ message, setMessage }: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [attachedItems, setAttachedItems] = useState<AttachedItem[]>([]);

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
      if (message.trim().length > 0 || attachedItems.length > 0) {
        // Handle message submission
        setMessage("");
        setAttachedItems([]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newItems: AttachedItem[] = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: 'file',
        file: file
      }));
      setAttachedItems(prev => [...prev, ...newItems]);
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Get the root folder name from the first file's webkitRelativePath
      const firstPath = e.target.files[0].webkitRelativePath;
      const folderName = firstPath.split('/')[0];
      
      if (folderName) {
        setAttachedItems(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          name: folderName,
          type: 'folder'
        }]);
      }
    }
    // Reset input
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const removeAttachedItem = (idToRemove: string) => {
    setAttachedItems(prev => prev.filter(item => item.id !== idToRemove));
  };

  return (
    <div className="w-full pb-8 pt-2 px-4 sm:px-0 z-10">
      <div className="max-w-3xl mx-auto relative flex flex-col gap-3">
        
        {/* Attached Files/Folders Display Area */}
        {attachedItems.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2">
            {attachedItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-2 bg-panel/60 backdrop-blur-md border border-panel-border/60 rounded-xl px-3 py-1.5 text-sm shadow-sm animate-in zoom-in-95 duration-200"
              >
                {item.type === 'folder' ? (
                  <Folder size={16} className="text-primary/80" />
                ) : (
                  <File size={16} className="text-primary/80" />
                )}
                <span className="text-foreground/90 max-w-[150px] truncate font-medium">
                  {item.name}
                </span>
                <button 
                  onClick={() => removeAttachedItem(item.id)}
                  className="ml-1 p-0.5 text-muted hover:text-foreground hover:bg-foreground/10 rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden File Inputs */}
        <input 
          type="file" 
          multiple 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        <input 
          type="file" 
          // @ts-expect-error - webkitdirectory is a non-standard but widely supported attribute for folder selection
          webkitdirectory="true" 
          directory="true"
          className="hidden" 
          ref={folderInputRef}
          onChange={handleFolderSelect}
        />

        {/* Liquid Glass Apple-inspired Inline Navbar/Island */}
        <div className="relative flex items-end w-full border border-panel-border/80 bg-panel/50 backdrop-blur-2xl shadow-2xl rounded-[32px] p-1.5 focus-within:border-muted/60 focus-within:ring-4 focus-within:ring-accent/20 transition-all duration-300">
          
          <div className="flex items-center gap-1 mb-0.5 ml-1">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-muted hover:text-foreground hover:bg-foreground/5 rounded-full transition-all duration-200"
              title="Attach files"
            >
              <Paperclip size={20} />
            </button>
            <button 
              onClick={() => folderInputRef.current?.click()}
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
                message.trim().length > 0 || attachedItems.length > 0
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 scale-100" 
                  : "bg-foreground/5 text-muted/50 cursor-not-allowed scale-95"
              }`}
              disabled={message.trim().length === 0 && attachedItems.length === 0}
            >
              <ArrowUp size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
