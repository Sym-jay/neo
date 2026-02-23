"use client";

import React, { useState, useRef, useEffect } from "react";
import { Menu, ChevronDown, Check, Settings, LogIn } from "lucide-react";

import Sidebar from "./components/Sidebar";
import InputArea from "./components/InputArea";
import SettingsModal from "./components/SettingsModal";
import ChatArea from "./components/ChatArea";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("GPT-4o");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const models = ["GPT-4o", "Claude 3.5 Sonnet", "Gemini 1.5 Pro", "Llama 3 70B"];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen w-full bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/30 via-background to-background text-foreground overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Top Navigation Header */}
        <header className="absolute top-0 w-full flex items-center justify-between px-4 py-4 z-20 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <button 
              onClick={toggleSidebar}
              className="p-2 rounded-xl hover:bg-panel/80 backdrop-blur-xl border border-transparent hover:border-panel-border text-muted hover:text-foreground transition-all shadow-sm group"
            >
              <Menu size={20} className="group-hover:scale-105 transition-transform" />
            </button>
          </div>
          <div className="pointer-events-auto relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-2 text-sm text-foreground/80 px-4 py-1.5 bg-panel/40 rounded-full border border-panel-border hover:bg-panel/80 hover:border-panel-border/80 backdrop-blur-2xl shadow-sm tracking-wide transition-all"
            >
              <span className="font-bold">Neo</span>
              <span className="text-panel-border">|</span>
              <span className="font-medium">{selectedModel}</span>
              <ChevronDown size={14} className={`text-muted transition-transform duration-200 ${isModelDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-panel border border-panel-border rounded-xl shadow-2xl py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">
                  Models
                </div>
                {models.map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      setSelectedModel(model);
                      setIsModelDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 flex items-center justify-between group transition-colors"
                  >
                    <span className={selectedModel === model ? "text-foreground font-medium" : "text-muted group-hover:text-foreground"}>
                      {model}
                    </span>
                    {selectedModel === model && <Check size={14} className="text-foreground" />}
                  </button>
                ))}
                <div className="h-px bg-panel-border my-2" />
                <button 
                  onClick={() => {
                    setIsModelDropdownOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-accent/10 flex items-center gap-2 transition-colors"
                >
                  <Settings size={14} />
                  <span>Manage Models</span>
                </button>
              </div>
            )}
          </div>
          <div className="w-9"></div>
        </header>

        {/* Chat Interface Layer */}
        <ChatArea />

        {/* Input Interface Layer */}
        <InputArea message={message} setMessage={setMessage} />
      </div>

      {/* Configuration Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
}
