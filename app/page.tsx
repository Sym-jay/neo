"use client";

import React, { useState } from "react";
import { Menu } from "lucide-react";

import Sidebar from "./components/Sidebar";
import InputArea from "./components/InputArea";
import SettingsModal from "./components/SettingsModal";
import ChatArea from "./components/ChatArea";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen w-full bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/30 via-background to-background text-foreground overflow-hidden font-sans">
      {/* Sidebar - Now a floating, backdrop-blurred component */}
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
          <div className="pointer-events-auto">
            <div className="text-sm font-semibold text-foreground/80 px-4 py-1.5 bg-panel/40 rounded-full border border-panel-border backdrop-blur-2xl shadow-sm tracking-wide">
              Neo
            </div>
          </div>
          <div className="w-9" /> {/* Spacer for flex balance */}
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
