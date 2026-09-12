"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Loader2, Info } from "lucide-react";

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
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [pastRecords, setPastRecords] = useState<any[]>([]);

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
    const names = routinesMaster.map(r => r.routine);
    return Array.from(new Set(names));
  }, [routinesMaster]);

  // When a routine is selected, populate the form state
  useEffect(() => {
    if (!selectedRoutineName) {
      setRoutineExercises([]);
      return;
    }
    
    const exercisesForRoutine = routinesMaster
      .filter(r => r.routine === selectedRoutineName)
      .sort((a, b) => a.order - b.order);
      
    const initialFormState: ExerciseFormState[] = exercisesForRoutine.map((ex, idx) => ({
      id: `ex-${idx}`,
      originalExercise: ex.exercise,
      currentExercise: ex.exercise, // Editable
      targetSets: ex.targetSets || 3,
      targetReps: ex.targetReps,
      sets: Array(ex.targetSets || 3).fill({ weight: "", reps: "" }),
      memo: "",
    }));
    
    setRoutineExercises(initialFormState);
  }, [selectedRoutineName, routinesMaster]);

  const handleExerciseNameChange = (id: string, newName: string) => {
    setRoutineExercises(prev => 
      prev.map(ex => ex.id === id ? { ...ex, currentExercise: newName } : ex)
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

  const isFormValid = useMemo(() => {
    if (!selectedRoutineName || routineExercises.length === 0) return false;
    // Check if at least one exercise has valid sets (weight & reps) to be saved
    // Or maybe require all shown fields? Let's just say at least one set must be filled.
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
            unit: unit
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
      
      // Clear form smoothly by re-selecting the routine
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em' }}>NEW RECORD</h2>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: '0.25rem',
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
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" htmlFor="routine">Routine</label>
          <select
            id="routine"
            className="form-select"
            value={selectedRoutineName}
            onChange={(e) => setSelectedRoutineName(e.target.value)}
          >
            <option value="">Select Routine...</option>
            {uniqueRoutineNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {selectedRoutineName && routineExercises.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setUnit("kg")} style={{ fontSize: '0.75rem', color: unit === 'kg' ? 'var(--primary)' : '#737373', fontWeight: unit === 'kg' ? 600 : 400 }}>KG</button>
              <span style={{ color: '#333' }}>|</span>
              <button type="button" onClick={() => setUnit("lbs")} style={{ fontSize: '0.75rem', color: unit === 'lbs' ? 'var(--primary)' : '#737373', fontWeight: unit === 'lbs' ? 600 : 400 }}>LBS</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
          {routineExercises.map((ex, index) => {
            const pastPerf = getPastPerformance(ex.originalExercise);
            
            return (
              <div key={ex.id} style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '0.5rem',
                padding: '1.25rem',
              }}>
                {/* Exercise Header */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', color: '#a3a3a3', marginBottom: '0.25rem' }}>Exercise {index + 1}</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={ex.currentExercise}
                        onChange={(e) => handleExerciseNameChange(ex.id, e.target.value)}
                        style={{ fontSize: '1.1rem', fontWeight: 600, padding: '0.5rem', backgroundColor: 'transparent', border: '1px dashed rgba(255,255,255,0.2)' }}
                      />
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                      <span style={{ display: 'inline-block', backgroundColor: 'var(--primary)', color: '#000', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>
                        TARGET
                      </span>
                      <div style={{ fontSize: '0.85rem', color: '#d4d4d4', marginTop: '0.25rem' }}>
                        {ex.targetSets} Sets × {ex.targetReps}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Past Performance */}
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '0.25rem',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.8125rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#737373' }}>
                    <Info size={14} />
                    <span style={{ fontWeight: 500, letterSpacing: '0.02em' }}>PREVIOUS PERFORMANCE</span>
                  </div>
                  {pastPerf ? (
                    <div>
                      <div style={{ marginBottom: '0.25rem', color: '#a3a3a3' }}>{pastPerf[0].date}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {pastPerf.map((r: any, i: number) => (
                          <span key={i} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>
                            {r.weight}{r.unit || "kg"} × {r.reps}
                          </span>
                        ))}
                      </div>
                      {pastPerf[0].memo && (
                        <div style={{ marginTop: '0.4rem', color: '#888', fontSize: '0.75rem' }}>
                          Memo: {pastPerf[0].memo}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#555' }}>No previous records found.</div>
                  )}
                </div>

                {/* Sets Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {ex.sets.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ width: '30px', fontSize: '0.75rem', color: '#737373' }}>#{idx + 1}</span>
                      <input
                        type="number"
                        className="form-input"
                        style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)' }}
                        placeholder="Weight"
                        step="0.5"
                        value={s.weight}
                        onChange={(e) => handleSetChange(ex.id, idx, 'weight', e.target.value)}
                      />
                      <input
                        type="number"
                        className="form-input"
                        style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)' }}
                        placeholder="Reps"
                        value={s.reps}
                        onChange={(e) => handleSetChange(ex.id, idx, 'reps', e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {/* Memo */}
                <div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Memo (optional)"
                    value={ex.memo}
                    onChange={(e) => handleMemoChange(ex.id, e.target.value)}
                    style={{ fontSize: '0.85rem', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 0' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {selectedRoutineName && routineExercises.length > 0 && (
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!isFormValid || isLoading} 
            style={{ 
              opacity: (!isFormValid || isLoading) ? 0.5 : 1,
              cursor: (!isFormValid || isLoading) ? 'not-allowed' : 'pointer',
              width: '100%',
              padding: '1rem',
              fontSize: '1rem'
            }}
          >
            {isLoading ? <Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <PlusCircle size={20} />
                Save {selectedRoutineName} Routine
              </span>
            )}
          </button>
        )}
      </form>
    </div>
  );
}
