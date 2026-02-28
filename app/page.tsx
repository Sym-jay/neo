"use client";

import React, { useState, useRef, useEffect } from "react";
import { Menu, ChevronDown, Check, Settings } from "lucide-react";

import Sidebar from "./components/Sidebar";
import InputArea from "./components/InputArea";
import SettingsModal from "./components/SettingsModal";
import ChatArea from "./components/ChatArea";
import ModelSelectionModal from "@/backend/ModelSelectionModal";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelSelectionOpen, setIsModelSelectionOpen] = useState(false);
  const [message, setMessage] = useState("");

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Loading...");
  const [models, setModels] = useState<string[]>([]);
  const [categorizedModels, setCategorizedModels] = useState<Record<string, string[]>>({});
  const [dropdownPane, setDropdownPane] = useState<"LLM" | "OCR model" | "Audio" | "Embedding model" | "Other">("LLM");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [activeTabStyle, setActiveTabStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (isModelDropdownOpen) {
      setTimeout(() => {
        const activeIndex = ["LLM", "OCR model", "Audio", "Embedding model", "Other"].indexOf(dropdownPane);
        const activeElement = tabsRef.current[activeIndex];
        if (activeElement) {
          setActiveTabStyle({
            left: activeElement.offsetLeft,
            width: activeElement.offsetWidth
          });
        }
      }, 0);
    }
  }, [dropdownPane, isModelDropdownOpen]);

  const fetchModels = React.useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/models');
      const data = await res.json();
      setModels(data.models || []);
      setCategorizedModels(data.categorized_models || {});
      if (data.current_model) {
        setSelectedModel(data.current_model);
      } else {
        setSelectedModel("No models loaded");
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
      setSelectedModel("Error loading models");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchModels();
  }, [fetchModels]);

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
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[500px] bg-panel border border-panel-border rounded-xl shadow-2xl py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="relative flex p-1.5 mx-2 mb-2 rounded-xl overflow-x-auto no-scrollbar">
                  <div
                    className="absolute top-1.5 bottom-1.5 bg-panel border border-panel-border/80 rounded-lg shadow-sm transition-all duration-300 ease-out"
                    style={{ left: activeTabStyle.left, width: activeTabStyle.width }}
                  />
                  {["LLM", "OCR model", "Audio", "Embedding model", "Other"].map((pane, idx) => (
                    <button
                      key={pane}
                      ref={(el) => {
                        tabsRef.current[idx] = el;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownPane(pane as any);
                      }}
                      className={`relative z-10 px-4 py-2 text-[11px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors rounded-lg flex-1 ${
                        dropdownPane === pane 
                          ? "text-foreground" 
                          : "text-muted hover:text-foreground/80"
                      }`}
                    >
                      {pane}
                    </button>
                  ))}
                </div>
                
                <div className="max-h-60 overflow-y-auto mt-1">
                  {(categorizedModels[dropdownPane] || []).map((model) => (
                    <button
                      key={model}
                      onClick={async () => {
                        setSelectedModel("Loading...");
                        setIsModelDropdownOpen(false);
                        try {
                          const res = await fetch("http://localhost:8000/api/models/load", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ model_name: model }),
                          });
                          const data = await res.json();
                          if (data.status === "success") {
                            setSelectedModel(model);
                          } else {
                            setSelectedModel("Error");
                          }
                        } catch (err) {
                          console.error(err);
                          setSelectedModel("Error");
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 flex items-center justify-between group transition-colors"
                    >
                      <span className={selectedModel === model ? "text-foreground font-medium" : "text-muted group-hover:text-foreground"}>
                        {model}
                      </span>
                      {selectedModel === model && <Check size={14} className="text-foreground" />}
                    </button>
                  ))}
                  {(categorizedModels[dropdownPane] || []).length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted text-center">
                      No models available for {dropdownPane}
                    </div>
                  )}
                </div>

                <div className="h-px bg-panel-border my-2" />
                <button 
                  onClick={() => {
                    setIsModelDropdownOpen(false);
                    setIsModelSelectionOpen(true);
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

      <ModelSelectionModal 
        isOpen={isModelSelectionOpen} 
        onClose={() => {
          setIsModelSelectionOpen(false);
          fetchModels(); // Refresh models after closing
        }} 
      />

    </div>
  );
}
