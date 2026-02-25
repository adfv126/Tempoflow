import { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Square, 
  Plus, 
  Save, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  ListMusic, 
  Music, 
  Settings2,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { useMetronome } from './hooks/useMetronome';
import { Preset, Setlist } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { bpm, setBpm, isPlaying, toggleMetronome, beat } = useMetronome();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [view, setView] = useState<'metronome' | 'presets' | 'setlists' | 'setlist-detail'>('metronome');
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newSetlistName, setNewSetlistName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [editingPresetBpm, setEditingPresetBpm] = useState(120);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [presetToAddToSetlist, setPresetToAddToSetlist] = useState<Preset | null>(null);
  const [confirmDeletePresetId, setConfirmDeletePresetId] = useState<string | null>(null);
  const [confirmDeleteSetlistId, setConfirmDeleteSetlistId] = useState<string | null>(null);

  // Load data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [presetsRes, setlistsRes] = await Promise.all([
          fetch('/api/presets'),
          fetch('/api/setlists')
        ]);
        if (presetsRes.ok) setPresets(await presetsRes.json());
        if (setlistsRes.ok) setSetlists(await setlistsRes.json());
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const addPreset = async () => {
    if (!newPresetName.trim()) return;
    const newPreset: Preset = {
      id: crypto.randomUUID(),
      name: newPresetName,
      bpm: bpm
    };
    
    try {
      await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreset)
      });
      setPresets([...presets, newPreset]);
      setNewPresetName('');
    } catch (error) {
      console.error('Failed to add preset:', error);
    }
  };

  const deletePreset = async (id: string) => {
    try {
      await fetch(`/api/presets/${id}`, { method: 'DELETE' });
      setPresets(presets.filter(p => p.id !== id));
      // Also remove from setlists locally
      setSetlists(setlists.map(s => ({
        ...s,
        presets: s.presets.filter(p => p.id !== id)
      })));
    } catch (error) {
      console.error('Failed to delete preset:', error);
    }
  };

  const startEditingPreset = (preset: Preset) => {
    setEditingPresetId(preset.id);
    setEditingPresetName(preset.name);
    setEditingPresetBpm(preset.bpm);
  };

  const saveEditedPreset = async () => {
    if (!editingPresetId || !editingPresetName.trim()) return;
    
    const updatedPreset = { id: editingPresetId, name: editingPresetName, bpm: editingPresetBpm };
    
    try {
      await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPreset)
      });

      setPresets(presets.map(p => 
        p.id === editingPresetId ? updatedPreset : p
      ));

      // Also update in setlists
      setSetlists(setlists.map(s => ({
        ...s,
        presets: s.presets.map(p => 
          p.id === editingPresetId ? updatedPreset : p
        )
      })));

      setEditingPresetId(null);
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  };

  const createSetlist = async () => {
    if (!newSetlistName.trim()) return;
    const newSetlist: Setlist = {
      id: crypto.randomUUID(),
      name: newSetlistName,
      presets: []
    };
    
    try {
      await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetlist)
      });
      setSetlists([...setlists, newSetlist]);
      setNewSetlistName('');
    } catch (error) {
      console.error('Failed to create setlist:', error);
    }
  };

  const deleteSetlist = async (id: string) => {
    try {
      await fetch(`/api/setlists/${id}`, { method: 'DELETE' });
      setSetlists(setlists.filter(s => s.id !== id));
      if (activeSetlistId === id) {
        setActiveSetlistId(null);
        setActivePresetIndex(0);
      }
    } catch (error) {
      console.error('Failed to delete setlist:', error);
    }
  };

  const addPresetToSetlist = async (setlistId: string, preset: Preset) => {
    const setlist = setlists.find(s => s.id === setlistId);
    if (!setlist) return;

    const updatedSetlist = { 
      ...setlist, 
      presets: [...setlist.presets, { ...preset, id: crypto.randomUUID() }] 
    };

    try {
      await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSetlist)
      });
      setSetlists(setlists.map(s => s.id === setlistId ? updatedSetlist : s));
    } catch (error) {
      console.error('Failed to add preset to setlist:', error);
    }
  };

  const reorderPresets = async (setlistId: string, newPresets: Preset[]) => {
    const setlist = setlists.find(s => s.id === setlistId);
    if (!setlist) return;

    const updatedSetlist = { ...setlist, presets: newPresets };

    try {
      await fetch('/api/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSetlist)
      });
      setSetlists(setlists.map(s => s.id === setlistId ? updatedSetlist : s));
    } catch (error) {
      console.error('Failed to reorder presets:', error);
    }
  };

  const handleSaveCurrentAsPreset = async () => {
    if (!savePresetName.trim()) return;
    const newPreset: Preset = {
      id: crypto.randomUUID(),
      name: savePresetName,
      bpm: bpm
    };
    
    try {
      await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreset)
      });
      setPresets([...presets, newPreset]);
      setSavePresetName('');
      setIsSavingPreset(false);
    } catch (error) {
      console.error('Failed to save current as preset:', error);
    }
  };

  const activeSetlist = setlists.find(s => s.id === activeSetlistId);
  const selectedSetlist = setlists.find(s => s.id === selectedSetlistId);

  const playPresetFromSetlist = (setlistId: string, index: number) => {
    const setlist = setlists.find(s => s.id === setlistId);
    if (!setlist || !setlist.presets[index]) return;
    
    if (activeSetlistId === setlistId && activePresetIndex === index && isPlaying) {
      toggleMetronome();
      return;
    }

    setActiveSetlistId(setlistId);
    setActivePresetIndex(index);
    setBpm(setlist.presets[index].bpm);
    
    if (!isPlaying) {
      toggleMetronome();
    }
  };

  const nextPreset = useCallback(() => {
    if (!activeSetlist) return;
    const nextIndex = (activePresetIndex + 1) % activeSetlist.presets.length;
    setActivePresetIndex(nextIndex);
    setBpm(activeSetlist.presets[nextIndex].bpm);
  }, [activeSetlist, activePresetIndex, setBpm]);

  const prevPreset = useCallback(() => {
    if (!activeSetlist) return;
    const prevIndex = (activePresetIndex - 1 + activeSetlist.presets.length) % activeSetlist.presets.length;
    setActivePresetIndex(prevIndex);
    setBpm(activeSetlist.presets[prevIndex].bpm);
  }, [activeSetlist, activePresetIndex, setBpm]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md hardware-card overflow-hidden flex flex-col h-[700px]">
        
        {/* Header / Navigation */}
        <div className="flex border-bottom border-[#2a2a2a] p-2 bg-[#1a1b1e]">
          <button 
            onClick={() => setView('metronome')}
            className={cn(
              "flex-1 py-3 flex flex-col items-center gap-1 transition-colors",
              view === 'metronome' ? "text-[#f27d26]" : "text-[#8e9299] hover:text-white"
            )}
          >
            <Settings2 size={18} />
            <span className="mono-label">Tempo</span>
          </button>
          <button 
            onClick={() => setView('presets')}
            className={cn(
              "flex-1 py-3 flex flex-col items-center gap-1 transition-colors",
              view === 'presets' ? "text-[#f27d26]" : "text-[#8e9299] hover:text-white"
            )}
          >
            <Music size={18} />
            <span className="mono-label">Presets</span>
          </button>
          <button 
            onClick={() => setView('setlists')}
            className={cn(
              "flex-1 py-3 flex flex-col items-center gap-1 transition-colors",
              view === 'setlists' ? "text-[#f27d26]" : "text-[#8e9299] hover:text-white"
            )}
          >
            <ListMusic size={18} />
            <span className="mono-label">Setlists</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            {view === 'metronome' && (
              <motion.div 
                key="metronome"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col p-8"
              >
                {/* Visualizer */}
                <div className="flex justify-center gap-4 mb-12">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: isPlaying && (beat - 1 + 4) % 4 === i ? 1.2 : 1,
                        backgroundColor: isPlaying && (beat - 1 + 4) % 4 === i 
                          ? (i === 0 ? '#f27d26' : '#ffffff') 
                          : '#2a2a2a'
                      }}
                      className="w-4 h-4 rounded-full"
                    />
                  ))}
                </div>

                {/* BPM Display */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="text-8xl font-mono font-bold tracking-tighter mb-2">
                    {bpm}
                  </div>
                  <div className="mono-label">Beats Per Minute</div>
                  
                  {/* BPM Controls */}
                  <div className="flex gap-8 mt-12">
                    <button 
                      onClick={() => setBpm(prev => Math.max(20, prev - 1))}
                      className="w-12 h-12 rounded-full border border-[#2a2a2a] flex items-center justify-center hover:bg-[#2a2a2a] transition-colors"
                    >
                      <ChevronDown size={24} />
                    </button>
                    <button 
                      onClick={() => setBpm(prev => Math.min(300, prev + 1))}
                      className="w-12 h-12 rounded-full border border-[#2a2a2a] flex items-center justify-center hover:bg-[#2a2a2a] transition-colors"
                    >
                      <ChevronUp size={24} />
                    </button>
                  </div>

                  <input 
                    type="range" 
                    min="20" 
                    max="300" 
                    value={bpm} 
                    onChange={(e) => setBpm(parseInt(e.target.value))}
                    className="w-full mt-12 accent-[#f27d26] bg-[#2a2a2a] rounded-lg appearance-none h-1 cursor-pointer"
                  />
                </div>

                {/* Main Action */}
                <div className="mt-auto pt-8 flex flex-col items-center gap-6">
                  {isSavingPreset ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full bg-[#1a1b1e] border border-[#f27d26] rounded-xl p-4 flex flex-col gap-3"
                    >
                      <div className="mono-label text-[8px]">Save current BPM as preset</div>
                      <input 
                        type="text" 
                        placeholder="Preset name..."
                        value={savePresetName}
                        onChange={(e) => setSavePresetName(e.target.value)}
                        className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f27d26]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={handleSaveCurrentAsPreset}
                          className="flex-1 bg-[#f27d26] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#d96c1d]"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setIsSavingPreset(false)}
                          className="flex-1 bg-[#2a2a2a] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#3a3a3a]"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <button 
                      onClick={() => setIsSavingPreset(true)}
                      className="flex items-center gap-2 text-[#8e9299] hover:text-[#f27d26] transition-colors"
                    >
                      <Save size={16} />
                      <span className="mono-label">Save as preset</span>
                    </button>
                  )}

                  <button 
                    onClick={toggleMetronome}
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                      isPlaying 
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                        : "bg-[#f27d26] text-white accent-glow"
                    )}
                  >
                    {isPlaying ? <Square fill="currentColor" size={32} /> : <Play fill="currentColor" size={32} className="ml-1" />}
                  </button>
                </div>

                {/* Setlist Navigation (if active) */}
                {activeSetlist && (
                  <div className="mt-8 p-4 bg-[#1a1b1e] rounded-xl border border-[#2a2a2a]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="mono-label text-[8px]">Setlist: {activeSetlist.name}</span>
                      <span className="mono-label text-[8px]">{activePresetIndex + 1} / {activeSetlist.presets.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <button onClick={prevPreset} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors">
                        <ChevronLeft size={20} />
                      </button>
                      <div className="text-center">
                        <div className="font-medium truncate max-w-[150px]">{activeSetlist.presets[activePresetIndex].name}</div>
                      </div>
                      <button onClick={nextPreset} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'presets' && (
              <motion.div 
                key="presets"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 h-full flex flex-col"
              >
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Music className="text-[#f27d26]" size={20} />
                  Presets
                </h2>

                <div className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    placeholder="Preset name..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 bg-[#1a1b1e] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#f27d26]"
                  />
                  <button 
                    onClick={addPreset}
                    className="bg-[#f27d26] text-white p-2 rounded-lg hover:bg-[#d96c1d] transition-colors"
                  >
                    <Save size={20} />
                  </button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto pr-2 relative">
                  {presetToAddToSetlist && (
                    <div className="absolute inset-0 bg-[#0a0a0a]/90 z-20 flex flex-col p-4 rounded-xl border border-[#2a2a2a]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-sm">Add to Setlist</h3>
                        <button onClick={() => setPresetToAddToSetlist(null)} className="text-[#8e9299] hover:text-white">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="mono-label text-[8px] mb-4">Select a setlist for "{presetToAddToSetlist.name}"</div>
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {setlists.length === 0 ? (
                          <div className="text-center py-8 text-[#8e9299] text-xs italic">
                            No setlists found. Create one first.
                          </div>
                        ) : (
                          setlists.map(s => (
                            <button 
                              key={s.id}
                              onClick={() => {
                                addPresetToSetlist(s.id, presetToAddToSetlist);
                                setPresetToAddToSetlist(null);
                              }}
                              className="w-full text-left p-3 bg-[#1a1b1e] border border-[#2a2a2a] rounded-lg hover:border-[#f27d26] transition-colors flex items-center justify-between"
                            >
                              <span className="text-sm">{s.name}</span>
                              <ChevronRight size={14} className="text-[#2a2a2a]" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {presets.length === 0 ? (
                    <div className="text-center py-12 text-[#8e9299] text-sm italic">
                      No presets saved yet.
                    </div>
                  ) : (
                    presets.map(preset => (
                      <div 
                        key={preset.id}
                        className={cn(
                          "group flex flex-col p-4 bg-[#1a1b1e] border border-[#2a2a2a] rounded-xl transition-all",
                          editingPresetId === preset.id ? "border-[#f27d26]" : "hover:border-[#f27d26] cursor-pointer"
                        )}
                        onClick={() => {
                          if (editingPresetId !== preset.id) {
                            setBpm(preset.bpm);
                            setView('metronome');
                          }
                        }}
                      >
                        {editingPresetId === preset.id ? (
                          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="text" 
                              value={editingPresetName}
                              onChange={(e) => setEditingPresetName(e.target.value)}
                              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#f27d26]"
                              autoFocus
                            />
                            <div className="flex items-center gap-4">
                              <div className="flex-1 flex items-center gap-2">
                                <span className="mono-label text-[8px]">BPM:</span>
                                <input 
                                  type="number" 
                                  value={editingPresetBpm}
                                  onChange={(e) => setEditingPresetBpm(parseInt(e.target.value) || 0)}
                                  className="w-16 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#f27d26]"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={saveEditedPreset}
                                  className="p-1.5 bg-[#f27d26] text-white rounded-lg hover:bg-[#d96c1d]"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  onClick={() => setEditingPresetId(null)}
                                  className="p-1.5 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a]"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{preset.name}</div>
                              <div className="mono-label text-[8px]">{preset.bpm} BPM</div>
                            </div>
                            <div className="flex gap-1">
                              {confirmDeletePresetId === preset.id ? (
                                <div className="flex items-center gap-1 bg-red-500/10 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => {
                                      deletePreset(preset.id);
                                      setConfirmDeletePresetId(null);
                                    }}
                                    className="px-2 py-1 text-[10px] bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-bold"
                                  >
                                    Delete?
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDeletePresetId(null)}
                                    className="px-2 py-1 text-[10px] text-[#8e9299] hover:text-white transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingPreset(preset);
                                    }}
                                    className="p-2 text-[#8e9299] hover:text-white transition-colors"
                                    title="Edit preset"
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPresetToAddToSetlist(preset);
                                    }}
                                    className="p-2 text-[#8e9299] hover:text-[#f27d26] transition-colors"
                                    title="Add to setlist"
                                  >
                                    <Plus size={18} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeletePresetId(preset.id);
                                    }}
                                    className="p-2 text-[#8e9299] hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {(view === 'setlists' || view === 'setlist-detail') && (
              <motion.div 
                key={view}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 h-full flex flex-col"
              >
                {view === 'setlists' ? (
                  <>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <ListMusic className="text-[#f27d26]" size={20} />
                      Setlists
                    </h2>

                    <div className="flex gap-2 mb-6">
                      <input 
                        type="text" 
                        placeholder="Setlist name..."
                        value={newSetlistName}
                        onChange={(e) => setNewSetlistName(e.target.value)}
                        className="flex-1 bg-[#1a1b1e] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#f27d26]"
                      />
                      <button 
                        onClick={createSetlist}
                        className="bg-[#f27d26] text-white p-2 rounded-lg hover:bg-[#d96c1d] transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                      {setlists.length === 0 ? (
                        <div className="text-center py-12 text-[#8e9299] text-sm italic">
                          No setlists created yet.
                        </div>
                      ) : (
                        setlists.map(setlist => (
                          <div 
                            key={setlist.id} 
                            className={cn(
                              "flex items-center justify-between p-4 bg-[#1a1b1e] border rounded-xl transition-all cursor-pointer group",
                              activeSetlistId === setlist.id ? "border-[#f27d26]" : "border-[#2a2a2a] hover:border-[#8e9299]"
                            )}
                            onClick={() => {
                              setSelectedSetlistId(setlist.id);
                              setView('setlist-detail');
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                activeSetlistId === setlist.id ? "bg-[#f27d26]" : "bg-[#2a2a2a]"
                              )} />
                              <div>
                                <div className="font-medium">{setlist.name}</div>
                                <div className="mono-label text-[8px]">{setlist.presets.length} Tracks</div>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {confirmDeleteSetlistId === setlist.id ? (
                                <div className="flex items-center gap-1 bg-red-500/10 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => {
                                      deleteSetlist(setlist.id);
                                      setConfirmDeleteSetlistId(null);
                                    }}
                                    className="px-2 py-1 text-[10px] bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-bold"
                                  >
                                    Delete?
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDeleteSetlistId(null)}
                                    className="px-2 py-1 text-[10px] text-[#8e9299] hover:text-white transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteSetlistId(setlist.id);
                                  }}
                                  className="p-2 text-[#8e9299] hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6">
                      <button 
                        onClick={() => setView('setlists')}
                        className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-[#8e9299]"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <h2 className="text-xl font-bold truncate flex-1">
                        {selectedSetlist?.name}
                      </h2>
                      <button 
                        onClick={() => setView('presets')}
                        className="p-2 text-[#f27d26] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                        title="Add track from presets"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                      {selectedSetlist && (
                        <Reorder.Group 
                          axis="y" 
                          values={selectedSetlist.presets} 
                          onReorder={(newOrder) => reorderPresets(selectedSetlist.id, newOrder)}
                          className="space-y-2"
                        >
                          {selectedSetlist.presets.map((p, idx) => (
                            <Reorder.Item 
                              key={p.id} 
                              value={p}
                              className={cn(
                                "flex items-center gap-3 p-4 bg-[#1a1b1e] border rounded-xl group transition-all",
                                activeSetlistId === selectedSetlist.id && activePresetIndex === idx && isPlaying
                                  ? "border-[#f27d26] bg-[#1f1a16]"
                                  : "border-[#2a2a2a]"
                              )}
                            >
                              <GripVertical size={16} className="text-[#2a2a2a] group-hover:text-[#8e9299] cursor-grab shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{p.name}</div>
                                <div className="mono-label text-[8px]">{p.bpm} BPM</div>
                              </div>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => playPresetFromSetlist(selectedSetlist.id, idx)}
                                  className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    activeSetlistId === selectedSetlist.id && activePresetIndex === idx && isPlaying
                                      ? "text-[#f27d26] bg-[#2a2a2a]"
                                      : "text-[#8e9299] hover:text-[#f27d26] hover:bg-[#2a2a2a]"
                                  )}
                                >
                                  {activeSetlistId === selectedSetlist.id && activePresetIndex === idx && isPlaying 
                                    ? <Square size={18} fill="currentColor" /> 
                                    : <Play size={18} fill="currentColor" />}
                                </button>
                                <button 
                                  onClick={() => {
                                    const newPresets = [...selectedSetlist.presets];
                                    newPresets.splice(idx, 1);
                                    reorderPresets(selectedSetlist.id, newPresets);
                                  }}
                                  className="p-2 text-[#8e9299] hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </Reorder.Item>
                          ))}
                          {selectedSetlist.presets.length === 0 && (
                            <div className="text-center py-12 text-[#8e9299] text-sm italic">
                              This setlist is empty. Add presets from the Presets tab.
                            </div>
                          )}
                        </Reorder.Group>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-[#1a1b1e] border-t border-[#2a2a2a] flex justify-between items-center">
          <div className="mono-label text-[8px]">TempoFlow v1.0</div>
          <div className="flex gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", isPlaying ? "bg-green-500 animate-pulse" : "bg-[#2a2a2a]")} />
          </div>
        </div>
      </div>
    </div>
  );
}
