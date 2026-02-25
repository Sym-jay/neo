"use client";


import { Plus, Settings, User } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onOpenSettings: () => void;
}


export default function Sidebar({ isOpen, onOpenSettings }: SidebarProps) {

  return (
    <>
    <div 
      className={`flex flex-col bg-panel/40 backdrop-blur-2xl border border-panel-border rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] my-3 ml-3 relative z-20 ${
        isOpen ? "w-[260px] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-10 !ml-0 !border-transparent"
      } overflow-hidden shrink-0 shadow-2xl`}
    >
      <div className="flex flex-col h-full p-3 gap-2 w-[260px]">
        {/* New Chat Button */}
        <button className="flex items-center gap-2 w-full p-2.5 rounded-xl hover:bg-accent/80 transition-all text-sm font-medium border border-transparent hover:border-panel-border text-foreground hover:shadow-sm">
          <Plus size={16} />
          <span>New Chat</span>
        </button>

        {/* Chat History Placeholder */}
        {/*<div className="flex-1 overflow-y-auto mt-4 px-2 no-scrollbar">
          <div className="text-xs font-semibold text-muted mb-3 px-1">Today</div>
          <button className="flex items-center w-full p-2 rounded-lg hover:bg-accent/60 transition-colors text-sm text-foreground/80 truncate mb-1">
            Building a RAG System
          </button>
          <button className="flex items-center w-full p-2 rounded-lg hover:bg-accent/60 transition-colors text-sm text-foreground/80 truncate mb-1">
            AWS EC2 Instance Setup
          </button>
          
          <div className="text-xs font-semibold text-muted mb-3 px-1 mt-6">Previous 7 Days</div>
          <button className="flex items-center w-full p-2 rounded-lg hover:bg-accent/60 transition-colors text-sm text-foreground/80 truncate mb-1">
            Dockerizing LLMs
          </button>
          <button className="flex items-center w-full p-2 rounded-lg hover:bg-accent/60 transition-colors text-sm text-foreground/80 truncate mb-1">
            Anthropic API Integration
          </button>
        </div>*/}

        {/* Bottom Actions */}
        <div className="mt-auto pt-2 border-t border-panel-border/50 flex flex-col gap-1">
          <button 
            onClick={onOpenSettings}
            className="flex items-center gap-2 w-full p-2.5 rounded-xl hover:bg-accent/80 transition-all text-sm text-foreground border border-transparent hover:border-panel-border hover:shadow-sm"
          >
            <Settings size={16} />
            <span>Configure</span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
