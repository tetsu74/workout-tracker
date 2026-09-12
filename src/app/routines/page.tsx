"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Trash2, Plus } from "lucide-react";

type RoutineMaster = {
  routine: string;
  exercise: string;
  targetSets: number;
  targetReps: string;
  order: number;
};

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutineMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/routines');
      const data = await res.json();
      if (data.routines) {
        setRoutines(data.routines);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoutineChange = (index: number, field: keyof RoutineMaster, value: string | number) => {
    const newRoutines = [...routines];
    newRoutines[index] = { ...newRoutines[index], [field]: value };
    setRoutines(newRoutines);
  };

  const handleAddExercise = (routineName: string) => {
    const maxOrder = Math.max(0, ...routines.filter(r => r.routine === routineName).map(r => r.order));
    const newExercise: RoutineMaster = {
      routine: routineName,
      exercise: "New Exercise",
      targetSets: 3,
      targetReps: "8-10",
      order: maxOrder + 1
    };
    setRoutines([...routines, newExercise]);
  };

  const handleDeleteExercise = (index: number) => {
    const newRoutines = routines.filter((_, i) => i !== index);
    setRoutines(newRoutines);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routines }),
      });
      if (!res.ok) throw new Error("Failed to save routines");
      setMessage({ type: 'success', text: "Menu Master saved successfully!" });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const groupedRoutines = routines.reduce((acc, curr) => {
    if (!acc[curr.routine]) acc[curr.routine] = [];
    acc[curr.routine].push(curr);
    return acc;
  }, {} as Record<string, RoutineMaster[]>);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" /></div>;
  }

  const routineGroups = ['Push 1', 'Pull 1', 'Push 2', 'Pull 2'];

  return (
    <div>
      <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Menu Master</h2>
        <button onClick={handleSave} className="btn-primary" disabled={isSaving} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          <span>Save Changes</span>
        </button>
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

      {routineGroups.map(group => (
        <div key={group} style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 600 }}>{group}</h3>
            <button type="button" onClick={() => handleAddExercise(group)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#a3a3a3', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Add Exercise
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {routines.map((r, i) => {
              if (r.routine !== group) return null;
              return (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ flex: 2 }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={r.exercise} 
                      onChange={e => handleRoutineChange(i, 'exercise', e.target.value)}
                      placeholder="Exercise Name"
                      style={{ fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={r.targetSets} 
                      onChange={e => handleRoutineChange(i, 'targetSets', parseInt(e.target.value) || 0)}
                      title="Sets"
                      style={{ fontSize: '0.9rem', textAlign: 'center' }}
                    />
                    <span style={{ color: '#737373', fontSize: '0.8rem' }}>Sets</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={r.targetReps} 
                      onChange={e => handleRoutineChange(i, 'targetReps', e.target.value)}
                      placeholder="e.g. 8-10"
                      title="Reps"
                      style={{ fontSize: '0.9rem', textAlign: 'center' }}
                    />
                    <span style={{ color: '#737373', fontSize: '0.8rem' }}>Reps</span>
                  </div>
                  <button type="button" onClick={() => handleDeleteExercise(i)} style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
