"use client";

import ScrambledText from "./ScrambledText";
import { Mic, Image as ImageIcon, Video, FileText, FolderOpen } from "lucide-react";

const options = [
  { name: 'Audio', icon: Mic },
  { name: 'Image', icon: ImageIcon },
  { name: 'Video', icon: Video },
  { name: 'Docs', icon: FileText },
  { name: 'Open folder', icon: FolderOpen },
];

export default function ChatArea() {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col pt-20 pb-4 sm:px-12 no-scrollbar relative z-10">
      <div className="flex flex-col md:flex-row justify-center items-center h-full w-full max-w-5xl mx-auto gap-12 md:gap-20">
        
        {/* Left section: Logo */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left flex-shrink-0">
          <ScrambledText
            className="!m-0 text-7xl sm:text-7xl tracking-[0.2em] uppercase leading-[1.1]"  
            radius={60}
            duration={1.2}
            speed={0.3}
            scrambleChars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%"
          >
            NEO
            <br />
            Chat
          </ScrambledText>
        </div>

        {/* Separators */}
        <div className="hidden md:block w-[1px] h-50 bg-panel-border/60"></div>
        <div className="md:hidden h-[1px] w-48 bg-panel-border/60"></div>

        {/* Right section: Options */}
        <div className="flex flex-wrap justify-center md:justify-start gap-3 w-full max-w-md">
          {options.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className="group bg-panel border border-panel-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/10 rounded-full px-6 py-3 flex 
                flex-row items-center justify-center gap-2 transition-all duration-300 ease-out cursor-pointer shadow-sm hover:shadow-emerald-500/10"
              >
                <Icon className="w-5 h-5 text-muted group-hover:text-emerald-400 transition-colors" />
                <span className="text-sm font-medium text-foreground group-hover:text-emerald-300 transition-colors">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
        
      </div>
    </div>
  );
}
