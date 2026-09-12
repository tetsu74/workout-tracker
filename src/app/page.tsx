"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Loader2, Info, Copy, Dumbbell, Timer, X, Play, Square } from "lucide-react";

type RoutineMaster = {
  routine: string;
  exercise: string;
  targetSets: number;
  targetReps: string;
  order: number;
};

type SetRecord = {
  weight: string;
  reps: string;
};

type ExerciseFormState = {
  id: string;
  originalExercise: string;
  currentExercise: string;
  targetSets: number;
  targetReps: string;
  sets: SetRecord[];
  memo: string;
  unit: "kg" | "lbs";
};

export default function Home() {
  const [routinesMaster, setRoutinesMaster] = useState<RoutineMaster[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  
  const [date, setDate] = useState(() => {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(now.getTime() + jstOffset);
    return jstDate.toISOString().split('T')[0];
  });
  
  const [selectedRoutineName, setSelectedRoutineName] = useState<string>("");
  const [routineExercises, setRoutineExercises] = useState<ExerciseFormState[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [pastRecords, setPastRecords] = useState<any[]>([]);

  const [timerDuration, setTimerDuration] = useState(90);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      // Optional: Play a sound or vibrate here
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const startTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
    setShowTimer(true);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Fetch routines and past records on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [routinesRes, recordsRes] = await Promise.all([
          fetch('/api/routines'),
          fetch('/api/records')
        ]);
        
        const routinesData = await routinesRes.json();
        const recordsData = await recordsRes.json();
        
        if (routinesData.routines) {
          setRoutinesMaster(routinesData.routines);
        }
        if (recordsData.records) {
          setPastRecords(recordsData.records);
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setIsLoadingRoutines(false);
      }
    }
    fetchData();
  }, []);

  const uniqueRoutineNames = useMemo(() => {
    // Force specific order if they exist, otherwise just use what's there
    const order = ['Push 1', 'Pull 1', 'Push 2', 'Pull 2'];
    const names = Array.from(new Set(routinesMaster.map(r => r.routine)));
    return names.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return 0;
    });
  }, [routinesMaster]);

  // When a routine is selected, populate the form state
  useEffect(() => {
    if (!selectedRoutineName) {
      setRoutineExercises([]);
      return;
    }
    
    if (selectedRoutineName === 'Extra') {
      setRoutineExercises([{
        id: `ex-${Date.now()}`,
        originalExercise: 'Custom Exercise',
        currentExercise: 'Custom Exercise',
        targetSets: 3,
        targetReps: '-',
        sets: Array(3).fill({ weight: "", reps: "" }),
        memo: "",
        unit: "kg"
      }]);
      return;
    }
    
    const exercisesForRoutine = routinesMaster
      .filter(r => r.routine === selectedRoutineName)
      .sort((a, b) => a.order - b.order);
      
    const initialFormState: ExerciseFormState[] = exercisesForRoutine.map((ex, idx) => ({
      id: `ex-${idx}`,
      originalExercise: ex.exercise,
      currentExercise: ex.exercise,
      targetSets: ex.targetSets || 3,
      targetReps: ex.targetReps,
      sets: Array(ex.targetSets || 3).fill({ weight: "", reps: "" }),
      memo: "",
      unit: "kg"
    }));
    
    setRoutineExercises(initialFormState);
  }, [selectedRoutineName, routinesMaster]);

  const handleExerciseNameChange = (id: string, newName: string) => {
    setRoutineExercises(prev => 
      prev.map(ex => ex.id === id ? { ...ex, currentExercise: newName } : ex)
    );
  };

  const handleUnitChange = (id: string, newUnit: "kg" | "lbs") => {
    setRoutineExercises(prev => 
      prev.map(ex => ex.id === id ? { ...ex, unit: newUnit } : ex)
    );
  };

  const handleSetChange = (exId: string, setIndex: number, field: keyof SetRecord, value: string) => {
    setRoutineExercises(prev => 
      prev.map(ex => {
        if (ex.id !== exId) return ex;
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        return { ...ex, sets: newSets };
      })
    );
  };

  const handleMemoChange = (id: string, memo: string) => {
    setRoutineExercises(prev => 
      prev.map(ex => ex.id === id ? { ...ex, memo } : ex)
    );
  };

  // Helper to find past performance for an exercise
  const getPastPerformance = (exerciseName: string) => {
    const exerciseRecords = pastRecords.filter(r => r.exercise === exerciseName);
    if (exerciseRecords.length === 0) return null;
    
    const sortedDates = Array.from(new Set(exerciseRecords.map(r => r.date))).sort().reverse();
    const lastDate = sortedDates[0];
    return exerciseRecords.filter(r => r.date === lastDate).sort((a, b) => a.set - b.set);
  };

  // Copy Previous Records into current sets
  const handleCopyPrevious = (exId: string, pastPerf: any[]) => {
    setRoutineExercises(prev => 
      prev.map(ex => {
        if (ex.id !== exId) return ex;
        const newSets = [...ex.sets];
        pastPerf.forEach((p, idx) => {
          if (idx < newSets.length) {
            newSets[idx] = { weight: p.weight.toString(), reps: p.reps.toString() };
          }
        });
        return { ...ex, sets: newSets, memo: pastPerf[0]?.memo || "" };
      })
    );
  };

  const isFormValid = useMemo(() => {
    if (!selectedRoutineName || routineExercises.length === 0) return false;
    const hasAnySet = routineExercises.some(ex => 
      ex.sets.some(s => s.weight !== "" && s.reps !== "")
    );
    return hasAnySet;
  }, [selectedRoutineName, routineExercises]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setMessage(null);

    const payload: any[] = [];
    
    routineExercises.forEach(ex => {
      ex.sets.forEach((set, idx) => {
        if (set.weight !== "" && set.reps !== "") {
          payload.push({
            date,
            routine: selectedRoutineName,
            exercise: ex.currentExercise,
            set: idx + 1,
            weight: parseFloat(set.weight),
            reps: parseInt(set.reps),
            memo: idx === 0 ? ex.memo : "",
            unit: ex.unit
          });
        }
      });
    });

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save records");

      setMessage({ type: 'success', text: `${selectedRoutineName} recorded successfully!` });
      
      // Refresh records
      const newRecordsRes = await fetch('/api/records');
      const newRecordsData = await newRecordsRes.json();
      if (newRecordsData.records) {
        setPastRecords(newRecordsData.records);
      }
      
      setSelectedRoutineName("");
      setTimeout(() => setSelectedRoutineName(selectedRoutineName), 100);
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoadingRoutines) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div>
      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em' }}>WORKOUT SESSION</h2>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          backgroundColor: message.type === 'success' ? 'rgba(107, 142, 35, 0.1)' : 'rgba(178, 34, 34, 0.1)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          fontSize: '0.875rem'
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label" htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{ fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textAlign: 'center' }}
          />
        </div>

        <div className="routine-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {uniqueRoutineNames.map(name => (
            <div 
              key={name}
              className={`routine-card ${selectedRoutineName === name ? 'active' : ''}`}
              onClick={() => setSelectedRoutineName(name)}
            >
              <Dumbbell size={20} className="rt-icon" />
              <span className="rt-name">{name}</span>
            </div>
          ))}
          <div 
            className={`routine-card ${selectedRoutineName === 'Extra' ? 'active' : ''}`}
            onClick={() => setSelectedRoutineName('Extra')}
            style={{ borderColor: selectedRoutineName === 'Extra' ? '#4a5568' : 'var(--border)' }}
          >
            <Dumbbell size={20} className="rt-icon" />
            <span className="rt-name" style={{ color: selectedRoutineName === 'Extra' ? '#e2e8f0' : '#718096' }}>Extra</span>
          </div>
        </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#a0a0a0', fontWeight: 600 }}>TIMER</span>
              <select className="form-select" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} value={timerDuration} onChange={(e) => setTimerDuration(Number(e.target.value))}>
                <option value={60}>60s</option>
                <option value={90}>90s</option>
                <option value={120}>120s</option>
                <option value={150}>150s</option>
                <option value={180}>180s</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
          {routineExercises.map((ex, index) => {
            const pastPerf = getPastPerformance(ex.originalExercise);
            
            return (
              <div key={ex.id} className="glass-card">
                {/* Exercise Header */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--primary)', margin: 0 }}>
                          {index + 1}. EXERCISE
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" onClick={() => handleUnitChange(ex.id, "kg")} style={{ fontSize: '0.65rem', color: ex.unit === 'kg' ? 'var(--primary)' : '#737373', fontWeight: ex.unit === 'kg' ? 600 : 400 }}>KG</button>
                          <span style={{ color: '#333', fontSize: '0.65rem' }}>|</span>
                          <button type="button" onClick={() => handleUnitChange(ex.id, "lbs")} style={{ fontSize: '0.65rem', color: ex.unit === 'lbs' ? 'var(--primary)' : '#737373', fontWeight: ex.unit === 'lbs' ? 600 : 400 }}>LBS</button>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={ex.currentExercise}
                        onChange={(e) => handleExerciseNameChange(ex.id, e.target.value)}
                        style={{ fontSize: '1.1rem', fontWeight: 600, padding: '0.5rem', backgroundColor: 'transparent', border: '1px dashed rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#d4d4d4', marginTop: '1.5rem' }}>
                        {ex.targetSets} Sets × {ex.targetReps}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Past Performance */}
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8125rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a0a0a0' }}>
                      <Info size={14} />
                      <span style={{ fontWeight: 600, letterSpacing: '0.05em' }}>PREVIOUS</span>
                    </div>
                    {pastPerf && (
                      <button 
                        type="button" 
                        onClick={() => handleCopyPrevious(ex.id, pastPerf)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        <Copy size={12} /> COPY
                      </button>
                    )}
                  </div>
                  
                  {pastPerf ? (
                    <div>
                      <div style={{ marginBottom: '0.25rem', color: '#737373', fontSize: '0.7rem' }}>{pastPerf[0].date}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {pastPerf.map((r: any, i: number) => (
                          <span key={i} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>
                            {r.weight}{r.unit || "kg"} × {r.reps}
                          </span>
                        ))}
                      </div>
                      {pastPerf[0].memo && (
                        <div style={{ marginTop: '0.5rem', color: '#888', fontSize: '0.75rem' }}>
                          Memo: {pastPerf[0].memo}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#555' }}>No previous records found.</div>
                  )}
                </div>

                {/* Sets Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  {ex.sets.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ width: '40px', fontSize: '0.75rem', color: '#737373', fontWeight: 600 }}>Set {idx + 1}</span>
                      <div style={{ display: 'flex', flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <input
                          type="number"
                          style={{ flex: 1, backgroundColor: 'transparent', border: 'none', padding: '0.75rem', color: 'var(--foreground)', fontSize: '1rem', textAlign: 'center', outline: 'none' }}
                          placeholder="Weight"
                          step="0.5"
                          value={s.weight}
                          onChange={(e) => handleSetChange(ex.id, idx, 'weight', e.target.value)}
                        />
                        <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        <input
                          type="number"
                          style={{ flex: 1, backgroundColor: 'transparent', border: 'none', padding: '0.75rem', color: 'var(--foreground)', fontSize: '1rem', textAlign: 'center', outline: 'none' }}
                          placeholder="Reps"
                          value={s.reps}
                          onChange={(e) => handleSetChange(ex.id, idx, 'reps', e.target.value)}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => startTimer(timerDuration)} 
                        style={{ padding: '0.5rem', color: '#737373', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '0.25rem' }}
                        title="Start 90s Rest"
                      >
                        <Timer size={16} />
                      </button>
                    </div>
                  ))}
                  {selectedRoutineName === 'Extra' && (
                     <button type="button" onClick={() => {
                        const newSets = [...ex.sets, {weight: "", reps: ""}];
                        setRoutineExercises(prev => prev.map(p => p.id === ex.id ? {...p, sets: newSets} : p));
                     }} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'fit-content', marginTop: '0.5rem' }}>+ Add Set</button>
                  )}
                </div>

                {/* Memo */}
                <div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Notes (optional)..."
                    value={ex.memo}
                    onChange={(e) => handleMemoChange(ex.id, e.target.value)}
                    style={{ fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.75rem' }}
                  />
                </div>
              </div>
            );
          })}
          
          {selectedRoutineName === 'Extra' && (
            <button type="button" onClick={() => {
              setRoutineExercises(prev => [...prev, {
                id: `ex-${Date.now()}`,
                originalExercise: 'Custom Exercise',
                currentExercise: 'Custom Exercise',
                targetSets: 3,
                targetReps: '-',
                sets: Array(3).fill({ weight: "", reps: "" }),
                memo: "",
                unit: "kg"
              }]);
            }} className="btn-secondary" style={{ width: '100%' }}>
              + ADD EXERCISE
            </button>
          )}
        </div>

        {selectedRoutineName && routineExercises.length > 0 && (
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!isFormValid || isLoading} 
            style={{ 
              width: '100%',
              padding: '1.25rem',
              fontSize: '1.1rem',
              marginTop: '1rem'
            }}
          >
            {isLoading ? <Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Play size={20} fill="currentColor" />
                COMPLETE SESSION
              </span>
            )}
          </button>
        )}
      </form>

      {/* Floating Rest Timer */}
      {showTimer && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(18, 18, 18, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid var(--primary)',
          borderRadius: '2rem',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.8), 0 0 15px var(--primary-glow)',
          zIndex: 100,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <Timer size={18} color="var(--primary)" />
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: timerSeconds === 0 ? 'var(--success)' : 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
            {formatTimer(timerSeconds)}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
            {isTimerRunning ? (
              <button onClick={() => setIsTimerRunning(false)} style={{ color: '#e5e5e5', padding: '0.25rem' }}>
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button onClick={() => setIsTimerRunning(true)} style={{ color: '#e5e5e5', padding: '0.25rem' }} disabled={timerSeconds === 0}>
                <Play size={16} fill="currentColor" />
              </button>
            )}
            <button onClick={() => setShowTimer(false)} style={{ color: '#737373', padding: '0.25rem' }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
