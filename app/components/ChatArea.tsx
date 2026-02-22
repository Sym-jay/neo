"use client";

import React from "react";
import { Server } from "lucide-react";

export default function ChatArea() {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col pt-20 pb-4 px-4 sm:px-0 no-scrollbar relative z-10">
      <div className="flex-1 max-w-3xl w-full mx-auto flex flex-col gap-8 pb-10">
        {/* Empty State / Welcome */}
        <div className="h-full flex flex-col items-center justify-center text-center px-4 mt-16 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="w-16 h-16 bg-panel/60 backdrop-blur-2xl border border-panel-border rounded-[20px] flex items-center justify-center mb-6 shadow-2xl ring-1 ring-white/5">
            <Server size={32} className="text-foreground/80" />
          </div>
          <h1 className="text-3xl font-semibold mb-3 tracking-tight">Connect Your Data</h1>
          <p className="text-muted/80 max-w-md text-sm mb-10 leading-relaxed font-medium">
            Chat with your private documents using self-hosted LLMs or cloud providers. Connect an EC2 or GCP instance to get started.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
            <button className="flex flex-col text-left p-4 rounded-2xl border border-panel-border bg-panel/30 hover:bg-panel/70 backdrop-blur-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group">
              <span className="font-semibold text-sm mb-1 text-foreground/90 group-hover:text-foreground">Configure Provider</span>
              <span className="text-xs text-muted font-medium">Set up AWS, GCP, or Local models</span>
            </button>
            <button className="flex flex-col text-left p-4 rounded-2xl border border-panel-border bg-panel/30 hover:bg-panel/70 backdrop-blur-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group">
              <span className="font-semibold text-sm mb-1 text-foreground/90 group-hover:text-foreground">Upload Documents</span>
              <span className="text-xs text-muted font-medium">Add files to your RAG pipeline</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
