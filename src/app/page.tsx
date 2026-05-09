"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Loader2, Plus, Minus, Info } from "lucide-react";

type CustomExercise = {
  muscleGroup: string;
  exercise: string;
};

type SetData = {
  weight: string;
  reps: string;
};

export default function Home() {
  const [exercisesData, setExercisesData] = useState<CustomExercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [muscleGroup, setMuscleGroup] = useState("");
  const [exercise, setExercise] = useState("");
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  
  // Batch set input state
  const [numSets, setNumSets] = useState(3);
  const [setsData, setSetsData] = useState<SetData[]>([
    { weight: "", reps: "" },
    { weight: "", reps: "" },
    { weight: "", reps: "" },
  ]);
  const [memo, setMemo] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMuscleGroup, setNewMuscleGroup] = useState("胸");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  useEffect(() => {
    async function fetchExercises() {
      try {
        const res = await fetch('/api/exercises');
        const data = await res.json();
        if (data.exercises && data.exercises.length > 0) {
          setExercisesData(data.exercises);
          setMuscleGroup(data.exercises[0].muscleGroup);
        }
      } catch (err) {
        console.error("Failed to load exercises", err);
      } finally {
        setIsLoadingExercises(false);
      }
    }
    fetchExercises();
  }, []);

  const muscleGroups = useMemo(() => {
    return Array.from(new Set(exercisesData.map(e => e.muscleGroup)));
  }, [exercisesData]);

  const availableExercises = useMemo(() => {
    return exercisesData.filter(e => e.muscleGroup === muscleGroup).map(e => e.exercise);
  }, [exercisesData, muscleGroup]);

  useEffect(() => {
    if (availableExercises.length > 0 && !availableExercises.includes(exercise)) {
      setExercise(availableExercises[0]);
    }
  }, [muscleGroup, availableExercises, exercise]);

  // Handle numSets change
  useEffect(() => {
    setSetsData(prev => {
      const newSets = [...prev];
      if (numSets > prev.length) {
        for (let i = prev.length; i < numSets; i++) {
          // Default to previous set's weight/reps if available
          const lastSet = prev[prev.length - 1] || { weight: "", reps: "" };
          newSets.push({ ...lastSet });
        }
      } else {
        return newSets.slice(0, numSets);
      }
      return newSets;
    });
  }, [numSets]);

  const handleSetChange = (index: number, field: keyof SetData, value: string) => {
    const newSets = [...setsData];
    newSets[index][field] = value;
    setSetsData(newSets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const payload = setsData.map((s, idx) => {
      let weightInKg = parseFloat(s.weight);
      if (unit === "lbs") {
        weightInKg = Math.round(weightInKg * 0.453592 * 10) / 10;
      }
      return {
        date,
        muscleGroup,
        exercise,
        set: idx + 1,
        weight: weightInKg,
        reps: parseInt(s.reps),
        memo: idx === 0 ? memo : "" // Save memo only for the first set of the batch to avoid redundancy in sheets, or save for all? User said "memo also per menu", so saving in first row of the menu entry is common.
      };
    });

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save records");

      setMessage({ type: 'success', text: `${exercise} (${numSets} sets) recorded successfully!` });
      
      // Reset after success
      setMemo("");
      // Keep other fields for next exercise
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingExercise(true);
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muscleGroup: newMuscleGroup, exercise: newExerciseName }),
      });
      if (!res.ok) throw new Error("Failed to add exercise");
      
      setExercisesData([...exercisesData, { muscleGroup: newMuscleGroup, exercise: newExerciseName }]);
      setMuscleGroup(newMuscleGroup);
      setExercise(newExerciseName);
      
      setIsModalOpen(false);
      setNewExerciseName("");
    } catch (err) {
      console.error(err);
      alert("Failed to add new exercise.");
    } finally {
      setIsAddingExercise(false);
    }
  };

  if (isLoadingExercises) {
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
        <div className="form-group">
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

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label" htmlFor="muscleGroup">Muscle</label>
            <select
              id="muscleGroup"
              className="form-select"
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              required
            >
              {muscleGroups.map((mg) => (
                <option key={mg} value={mg}>{mg}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label className="form-label" htmlFor="exercise">Exercise</label>
            <select
              id="exercise"
              className="form-select"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              required
            >
              {availableExercises.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <button type="button" onClick={() => setIsModalOpen(true)} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
            + Add Custom Exercise
          </button>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Sets & Weights</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setUnit("kg")} style={{ fontSize: '0.75rem', color: unit === 'kg' ? 'var(--primary)' : '#737373', fontWeight: unit === 'kg' ? 600 : 400 }}>KG</button>
              <span style={{ color: '#333' }}>|</span>
              <button type="button" onClick={() => setUnit("lbs")} style={{ fontSize: '0.75rem', color: unit === 'lbs' ? 'var(--primary)' : '#737373', fontWeight: unit === 'lbs' ? 600 : 400 }}>LBS</button>
            </div>
          </div>
          
          <div className="counter-wrapper" style={{ marginBottom: '1rem', width: 'fit-content' }}>
            <button type="button" className="counter-btn" onClick={() => setNumSets(Math.max(1, numSets - 1))}><Minus size={16} /></button>
            <div style={{ width: '80px', textAlign: 'center', fontSize: '0.875rem' }}>{numSets} Sets</div>
            <button type="button" className="counter-btn" onClick={() => setNumSets(numSets + 1)}><Plus size={16} /></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {setsData.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ width: '40px', fontSize: '0.75rem', color: '#737373' }}>#{idx + 1}</span>
                <input
                  type="number"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Weight"
                  step="0.5"
                  value={s.weight}
                  onChange={(e) => handleSetChange(idx, 'weight', e.target.value)}
                  required
                />
                <input
                  type="number"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Reps"
                  value={s.reps}
                  onChange={(e) => handleSetChange(idx, 'reps', e.target.value)}
                  required
                />
              </div>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label className="form-label" htmlFor="memo">Memo (Notes for this exercise)</label>
          <textarea
            id="memo"
            className="form-input"
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="フォームの意識、今日の重さの感じ方など..."
            style={{ resize: 'vertical' }}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '1rem' }}>
          {isLoading ? <Loader2 className="animate-spin" /> : <PlusCircle size={20} />}
          {isLoading ? "Saving..." : `Save ${numSets} Sets`}
        </button>
      </form>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', fontWeight: 300, textTransform: 'uppercase' }}>Add Exercise</h3>
            <form onSubmit={handleAddExercise}>
              <div className="form-group">
                <label className="form-label">Muscle Group</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newMuscleGroup} 
                  onChange={e => setNewMuscleGroup(e.target.value)}
                  placeholder="e.g. 胸, 背中, 脚, 腹筋"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Exercise Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newExerciseName} 
                  onChange={e => setNewExerciseName(e.target.value)}
                  placeholder="e.g. インクラインプレス"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isAddingExercise}>
                  {isAddingExercise ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
