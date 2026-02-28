'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Cpu, DownloadCloud, Database, RefreshCcw, TrendingUp, Trash2 } from "lucide-react";

const API_BASE_URL = 'http://localhost:8000';

export default function ModelSelectionModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void 
}) {
  const [models, setModels] = useState<string[]>([]);
  const [categorizedModels, setCategorizedModels] = useState<Record<string, string[]>>({});
  const [popularModels, setPopularModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customModel, setCustomModel] = useState('');
  const [pullProgress, setPullProgress] = useState<{status: string, completed?: number, total?: number} | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setError('Download cancelled.');
      setLoading(false);
      setPullProgress(null);
      setSelectedModel('');
    }
  };

  // Fetch available models on load
  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const [modelsRes, trendingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/models`),
        fetch(`${API_BASE_URL}/api/trending-models`)
      ]);
      const modelsData = await modelsRes.json();
      const trendingData = await trendingRes.json();
      
      setModels(modelsData.models || []);
      setCategorizedModels(modelsData.categorized_models || {});
      setCurrentModel(modelsData.current_model || '');
      setPopularModels(trendingData.popular || []);
    } catch {
      setError('Failed to fetch available models.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSpecificModel = async (modelToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent loading when clicking delete
    
    if (!confirm(`Are you sure you want to delete ${modelToDelete}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_BASE_URL}/api/models/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelToDelete }),
      });
      
      const data = await res.json();
      if (data.status === 'error') {
        throw new Error(data.message);
      }
      
      // Refresh models after deletion
      await fetchModels();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete model.';
      setError(errorMessage);
      setLoading(false); // only set loading to false here, fetchModels handles it on success
    }
  };

  const loadSpecificModel = async (modelToLoad: string) => {
    if (!modelToLoad) return;
    
    // If the model is already the active model, unload it
    if (currentModel === modelToLoad) {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/api/models/unload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.status === 'error') {
          throw new Error(data.message);
        }
        setCurrentModel('');
        await fetchModels();
        return;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to unload model.';
        setError(errorMessage);
        setLoading(false);
        return;
      }
    }
    
    setSelectedModel(modelToLoad);
    setPullProgress(null);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_BASE_URL}/api/models/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelToLoad }),
        signal: controller.signal,
      });
      
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/x-ndjson') || contentType.includes('text/event-stream')) {
        if (!res.body) throw new Error("No response body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = '';

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                if (data.status === 'error') {
                  throw new Error(data.message);
                } else if (data.status === 'success') {
                  setCurrentModel(modelToLoad);
                  setPullProgress(null);
                  onClose();
                  return;
                } else {
                  setPullProgress(data);
                }
              } catch (e) {
                // Ignore parse errors on incomplete lines
                if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                  throw e;
                }
              }
            }
          }
        }
      } else {
        const data = await res.json();
        
        if (data.status === 'error') {
          throw new Error(data.message);
        }
        
        setCurrentModel(modelToLoad);
        onClose(); // Close the modal on success
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Handle abort silently or just let the cancel function handle state
        console.log('Download cancelled by user');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load model.';
        setError(errorMessage);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setLoading(false);
        setSelectedModel('');
        setPullProgress(null);
        await fetchModels();
      }
    }
  };

  const getCategoryForModel = (modelName: string) => {
    if (!modelName) return null;
    for (const [category, modelsList] of Object.entries(categorizedModels)) {
      if (modelsList.includes(modelName)) return category;
    }
    return 'LLM'; // default fallback
  };

  const currentCategory = getCategoryForModel(currentModel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-panel/80 backdrop-blur-2xl border border-panel-border/60 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.4)] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col ring-1 ring-white/5 animate-in slide-in-from-bottom-8 duration-300 ease-out">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-panel-border/40">
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
              Manage Models
            </h2>
            <p className="text-sm font-medium text-muted/80 mt-1">Select or pull Ollama models for local inference.</p>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="p-2 text-muted hover:text-foreground hover:bg-accent/80 rounded-xl transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-8 no-scrollbar">
          
          {error && (
            <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20 flex items-center gap-3">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Progress Bar for Pulling */}
          {pullProgress && (
            <div className="rounded-xl bg-background/50 border border-panel-border p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground/90 capitalize">
                  {pullProgress.status}
                </span>
                <div className="flex items-center gap-3">
                  {pullProgress.total && pullProgress.completed ? (
                    <span className="text-xs font-medium text-muted">
                      {Math.round((pullProgress.completed / pullProgress.total) * 100)}%
                    </span>
                  ) : null}
                  <button 
                    onClick={cancelDownload}
                    className="text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {pullProgress.total && pullProgress.completed ? (
                <div className="w-full bg-accent rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${Math.round((pullProgress.completed / pullProgress.total) * 100)}%` }}
                  ></div>
                </div>
              ) : (
                <div className="w-full bg-accent rounded-full h-2.5 overflow-hidden relative">
                  <div className="absolute inset-0 bg-primary/50 w-1/3 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                  <div className="bg-primary h-2.5 rounded-full w-1/3 animate-pulse"></div>
                </div>
              )}
            </div>
          )}

          {/* Mounted Models */}
          <section className="flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Mounted Models</h3>
              <p className="text-sm font-medium text-muted/80">Models currently loaded in memory for different tasks.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              {[
                { type: "LLM", model: currentCategory === "LLM" ? currentModel : null, icon: <Cpu size={20} /> },
                { type: "OCR model", model: currentCategory === "OCR model" ? currentModel : null, icon: <Cpu size={20} /> },
                { type: "Audio", model: currentCategory === "Audio" ? currentModel : null, icon: <Cpu size={20} /> },
                { type: "Embedding model", model: currentCategory === "Embedding model" ? currentModel : null, icon: <Cpu size={20} /> },
                { type: "Other", model: currentCategory === "Other" ? currentModel : null, icon: <Cpu size={20} /> }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center p-3 gap-4 rounded-xl border border-panel-border/60 bg-background/30 shadow-sm">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">{item.type}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground/90">
                      {item.model || 'No model loaded'}
                    </h4>
                  </div>
                  {item.model && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase">
                      Active
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <hr className="border-panel-border/40" />

          {/* Pull New Model */}
          <section className="flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">Pull New Model</h3>
              <p className="text-xs font-medium text-muted/80 leading-relaxed">Download a model from the Ollama library.</p>
            </div>

            <div className="flex space-x-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DownloadCloud size={16} className="text-muted/60" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. llama3, mistral, qwen2.5:0.5b"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customModel.trim() && !loading) {
                      loadSpecificModel(customModel.trim());
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-background/30 border border-panel-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:border-muted focus:ring-4 focus:ring-accent/20 transition-all placeholder:text-muted/40 shadow-inner disabled:opacity-50"
                />
              </div>
              <button
                onClick={() => loadSpecificModel(customModel.trim())}
                disabled={loading || !customModel.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading && selectedModel === customModel.trim() ? (
                  <>
                    <RefreshCcw size={16} className="animate-spin" />
                    Pulling...
                  </>
                ) : (
                  <>
                    <DownloadCloud size={16} />
                    Pull & Load
                  </>
                )}
              </button>
            </div>

            {/* Popular Models */}
            {popularModels.length > 0 && (
              <div className="mt-2 flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-blue-500" />
                    <span className="text-xs font-semibold text-muted/80">Popular Models</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {popularModels.map((modelName) => {
                      const isDownloaded = models.includes(modelName) || models.includes(`${modelName}:latest`);
                      const isLoadingThis = loading && selectedModel === modelName;
                      
                      return (
                        <button
                          key={`pop-${modelName}`}
                          onClick={() => {
                            setCustomModel(modelName);
                            loadSpecificModel(modelName);
                          }}
                          disabled={loading}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isDownloaded 
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20" 
                              : "bg-background/50 text-foreground/80 border-panel-border hover:bg-accent hover:text-foreground"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isLoadingThis ? (
                            <RefreshCcw size={12} className="animate-spin" />
                          ) : isDownloaded ? (
                            <Database size={12} />
                          ) : (
                            <DownloadCloud size={12} />
                          )}
                          {modelName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Available Models */}
          <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">Available Local Models</h3>
                <p className="text-xs font-medium text-muted/80 leading-relaxed">Models currently downloaded on your system.</p>
              </div>
              <button 
                onClick={fetchModels} 
                disabled={loading}
                className="p-2 text-muted hover:text-foreground hover:bg-accent/80 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-semibold"
                title="Refresh models list"
              >
                <RefreshCcw size={14} className={loading && !models.length ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loading && !models.length ? (
                <div className="col-span-full flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-panel-border/60 rounded-2xl bg-background/20">
                  <RefreshCcw size={24} className="text-muted animate-spin" />
                  <span className="text-sm font-medium text-muted">Loading models...</span>
                </div>
              ) : models.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-panel-border/60 rounded-2xl bg-background/20">
                  <Database size={24} className="text-muted/50" />
                  <span className="text-sm font-medium text-muted">No local models found.</span>
                </div>
              ) : (
                models.map((model) => (
                  <div key={model} className="relative group/wrapper">
                    <div className={`flex items-center p-4 gap-3 rounded-xl border transition-all shadow-sm group/item ${
                      currentModel === model 
                        ? 'border-primary/80 bg-accent/60' 
                        : 'border-panel-border bg-background/50 hover:bg-accent/40'
                    } ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
                      <div className="flex-1 min-w-0" onClick={() => loadSpecificModel(model)}>
                        <span className="block text-sm font-semibold text-foreground/90 truncate cursor-pointer">
                          {model}
                        </span>
                      </div>
                      
                      {loading && selectedModel === model ? (
                        <RefreshCcw size={14} className="text-primary animate-spin shrink-0" />
                      ) : (
                        <div className="flex items-center gap-2">
                          {currentModel === model ? (
                            <div 
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wide cursor-pointer hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 group/active"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadSpecificModel(model);
                              }}
                              title="Click to unload"
                            >
                              <span className="group-hover/active:hidden">Active</span>
                              <span className="hidden group-hover/active:inline">Unload</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted/50 font-semibold opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap cursor-pointer" onClick={() => loadSpecificModel(model)}>
                              Click to load
                            </span>
                          )}
                          <button
                            onClick={(e) => deleteSpecificModel(model, e)}
                            className={`p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-all z-10 ${
                              currentModel === model ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'
                            }`}
                            title="Delete model"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
