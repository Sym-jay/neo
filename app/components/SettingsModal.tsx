"use client";

import { X, Server } from "lucide-react";
import Image from "next/image";
import OpenAILogo from "../../public/OpenAI-white-monoblossom.png"
import AnthropicClaudeLogo from "../../public/icons8-claude-ai-96.png"
import GoogleCloudLogo from "../../public/icons8-google-cloud-96.png"
import SupabaseLogo from "../../public/supabase-logo-icon.png"

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-panel/80 backdrop-blur-2xl border border-panel-border/60 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.4)] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col ring-1 ring-white/5 animate-in slide-in-from-bottom-8 duration-300 ease-out"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-panel-border/40">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Configure</h2>
          <button 
            onClick={onClose}
            className="p-2 text-muted hover:text-foreground hover:bg-accent/80 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-10 no-scrollbar">
          {/* General Settings */}
          <section className="flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">LLM Inference Provider</h3>
              <p className="text-sm font-medium text-muted/80">Select where your LLM inference are hosted.</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="cursor-pointer group">
                <input type="radio" name="llmProvider" className="peer sr-only" defaultChecked />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Server className="w-9 h-9 text-foreground/80 peer-checked:text-foreground" />
                  <span className="text-sm font-semibold text-foreground/90">Self-Hosted</span>
                </div>
              </label>
              <label className="cursor-pointer group">
                <input type="radio" name="llmProvider" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Image src={GoogleCloudLogo} className="w-10 h-10 object-contain" alt="GCP Logo"/>
                  <span className="text-sm font-semibold text-foreground/90">GCP</span>
                </div>
              </label>
              <label className="cursor-pointer group">
                <input type="radio" name="llmProvider" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Image src={OpenAILogo} className="w-9 h-9 object-contain" alt="OpenAI Logo"/>
                  <span className="text-sm font-semibold text-foreground/90">OpenAI</span>
                </div>
              </label>
              <label className="cursor-pointer group">
                <input type="radio" name="llmProvider" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Image src={AnthropicClaudeLogo} className="w-10 h-10 object-contain" alt="Anthropic Logo"/>
                  <span className="text-sm font-semibold text-foreground/90">Anthropic</span>
                </div>
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">Storage Bucket</h3>
              <p className="text-sm font-medium text-muted/80">Select where your storage bucket is hosted.</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="cursor-pointer group">
                <input type="radio" name="storageProvider" className="peer sr-only" defaultChecked />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Server className="w-9 h-9 text-foreground/80 peer-checked:text-foreground" />
                  <span className="text-sm font-semibold text-foreground/90">Self-Hosted</span>
                </div>
              </label>
              <label className="cursor-pointer group">
                <input type="radio" name="storageProvider" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Image src={SupabaseLogo} className="w-9 h-9 object-contain" alt="Supabase Logo"/>
                  <span className="text-sm font-semibold text-foreground/90">Supabase</span>
                </div>
              </label>
              <label className="cursor-pointer group">
                <input type="radio" name="storageProvider" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Image src={GoogleCloudLogo} className="w-10 h-10 object-contain" alt="GCP Logo"/>
                  <span className="text-sm font-semibold text-foreground/90">GCP</span>
                </div>
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">Vector DB</h3>
              <p className="text-sm font-medium text-muted/80">Select where your vector database is hosted.</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="cursor-pointer group">
                <input type="radio" name="vectorDbProvider" className="peer sr-only" defaultChecked />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Server className="w-9 h-9 text-foreground/80 peer-checked:text-foreground" />
                  <span className="text-sm font-semibold text-foreground/90">Self-Hosted</span>
                </div>
              </label>
              <label className="cursor-pointer group">
                <input type="radio" name="vectorDbProvider" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Image src={SupabaseLogo} className="w-9 h-9 object-contain" alt="Supabase Logo"/>
                  <span className="text-sm font-semibold text-foreground/90">Supabase</span>
                </div>
              </label>
              <label className="cursor-pointer group">
                <input type="radio" name="vectorDbProvider" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Image src={GoogleCloudLogo} className="w-10 h-10 object-contain" alt="GCP Logo"/>
                  <span className="text-sm font-semibold text-foreground/90">GCP</span>
                </div>
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">RAG Infra Provider</h3>
              <p className="text-sm font-medium text-muted/80">Select where your RAG infrastructure is hosted.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer group">
                <input type="radio" name="ragInfraProvider" className="peer sr-only" defaultChecked />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Server className="w-9 h-9 text-foreground/80 peer-checked:text-foreground" />
                  <span className="text-sm font-semibold text-foreground/90">Self-Hosted</span>
                </div>
              </label>
              <label className="cursor-pointer group">
                <input type="radio" name="ragInfraProvider" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-4 h-[110px] gap-3 rounded-2xl border border-panel-border bg-background/30 peer-checked:border-primary/80 peer-checked:bg-accent/60 group-hover:bg-accent/40 transition-all shadow-sm">
                  <Image src={GoogleCloudLogo} className="w-10 h-10 object-contain" alt="GCP Logo"/>
                  <span className="text-sm font-semibold text-foreground/90">GCP</span>
                </div>
              </label>
            </div>
          </section>

          <hr className="border-panel-border/40" />

          {/* Infrastructure Configuration */}
          <section className="flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">Instance Configuration</h3>
              <p className="text-sm font-medium text-muted/80">Configure your exposed instance URL for RAG and LLM backend.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground/70 tracking-wide uppercase">API Endpoint URL</label>
                <input 
                  type="url" 
                  placeholder="https://your-ec2-instance-ip.compute.amazonaws.com"
                  className="w-full bg-background/30 border border-panel-border rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-muted focus:ring-4 focus:ring-accent/20 transition-all placeholder:text-muted/40 shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground/70 tracking-wide uppercase">API Auth Token (Optional)</label>
                <input 
                  type="password" 
                  placeholder="sk-..."
                  className="w-full bg-background/30 border border-panel-border rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-muted focus:ring-4 focus:ring-accent/20 transition-all placeholder:text-muted/40 shadow-inner"
                />
              </div>
            </div>
          </section>

          <hr className="border-panel-border/40" />

          {/* External Provider Keys */}
          <section className="flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">External Provider API Keys</h3>
              <p className="text-sm font-medium text-muted/80">Keys are stored locally in your browser.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground/70 tracking-wide uppercase">OpenAI API Key</label>
                <input 
                  type="password" 
                  placeholder="sk-proj-..."
                  className="w-full bg-background/30 border border-panel-border rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-muted focus:ring-4 focus:ring-accent/20 transition-all placeholder:text-muted/40 shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground/70 tracking-wide uppercase">Anthropic API Key</label>
                <input 
                  type="password" 
                  placeholder="sk-ant-..."
                  className="w-full bg-background/30 border border-panel-border rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-muted focus:ring-4 focus:ring-accent/20 transition-all placeholder:text-muted/40 shadow-inner"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-5 border-t border-panel-border/40 bg-background/10 flex justify-end gap-3 backdrop-blur-md">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-accent/80 rounded-xl transition-all border border-transparent hover:border-panel-border hover:shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
