"use client";

import { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, parseISO, isSameDay } from "date-fns";
import { Loader2 } from "lucide-react";

type Record = {
  date: string;
  routine: string;
  exercise: string;
  set: number;
  weight: number;
  reps: number;
  unit?: string;
};

const ROUTINE_STYLES: { [key: string]: { bg: string; border: string; color: string; dot: string } } = {
  'Push 1': { bg: 'rgba(203, 162, 88, 0.2)', border: '#cba258', color: '#e6c57a', dot: '#cba258' },
  'Pull 1': { bg: 'rgba(70, 130, 180, 0.25)', border: '#4682b4', color: '#7cb5e8', dot: '#4682b4' },
  'Push 2': { bg: 'rgba(217, 119, 6, 0.2)', border: '#d97706', color: '#fbbf24', dot: '#d97706' },
  'Pull 2': { bg: 'rgba(107, 142, 35, 0.25)', border: '#6b8e23', color: '#a3c956', dot: '#6b8e23' },
  'Extra':  { bg: 'rgba(148, 163, 184, 0.15)', border: '#64748b', color: '#cbd5e1', dot: '#94a3b8' },
};

const getRoutineStyle = (routine: string) => {
  return ROUTINE_STYLES[routine] || { bg: 'rgba(255, 255, 255, 0.1)', border: '#555', color: '#a0a0a0', dot: '#a0a0a0' };
};

const shortenRoutine = (routine: string) => routine.replace(/\s+/g, '');

export default function CalendarPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editExercise, setEditExercise] = useState("");
  const [editSubstitute, setEditSubstitute] = useState(false);
  const [editOriginal, setEditOriginal] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/records');
      if (!res.ok) throw new Error("Failed to fetch records");
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const startEdit = (date: string, routine: string, exercise: string, substitute?: boolean, originalExercise?: string) => {
    setEditingKey(`${date}||${routine}||${exercise}`);
    setEditExercise(exercise);
    setEditSubstitute(Boolean(substitute));
    setEditOriginal(originalExercise || exercise);
  };

  const handleSaveEdit = async (date: string, routine: string, currentExercise: string) => {
    if (!editExercise.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          routine,
          currentExercise,
          newExercise: editExercise.trim(),
          substitute: editSubstitute,
          originalExercise: editSubstitute ? (editOriginal.trim() || currentExercise) : ''
        })
      });
      if (!res.ok) throw new Error("Failed to update record");
      setEditingKey(null);
      await fetchRecords();
    } catch (e: any) {
      alert(e.message || 'Failed to update');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const routinesByDate = useMemo(() => {
    const map: { [date: string]: string[] } = {};
    records.forEach(r => {
      if (!r.date || !r.routine) return;
      if (!map[r.date]) map[r.date] = [];
      if (!map[r.date].includes(r.routine)) {
        map[r.date].push(r.routine);
      }
    });
    return map;
  }, [records]);

  const selectedDayRecords = useMemo(() => {
    return records.filter(r => isSameDay(parseISO(r.date), selectedDate));
  }, [records, selectedDate]);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" size={32} color="var(--primary)" /></div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em' }}>CALENDAR</h2>
      </div>

      {/* Routine Color Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        {Object.entries(ROUTINE_STYLES).map(([rt, st]) => (
          <div key={rt} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            backgroundColor: st.bg,
            border: `1px solid ${st.border}`,
            color: st.color,
            fontSize: '0.7rem',
            fontWeight: 600
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: st.dot }} />
            {rt}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Calendar 
          onChange={(val) => setSelectedDate(val as Date)} 
          value={selectedDate}
          tileContent={({ date, view }) => {
            if (view === 'month') {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayRoutines = routinesByDate[dateStr];
              if (dayRoutines && dayRoutines.length > 0) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginTop: '3px', width: '100%' }}>
                    {dayRoutines.map(rt => {
                      const st = getRoutineStyle(rt);
                      return (
                        <span
                          key={rt}
                          className="calendar-routine-badge"
                          style={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            padding: '2px 4px',
                            borderRadius: '3px',
                            backgroundColor: st.bg,
                            border: `1px solid ${st.border}`,
                            color: st.color,
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {shortenRoutine(rt)}
                        </span>
                      );
                    })}
                  </div>
                );
              }
            }
            return null;
          }}
        />
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>
            {format(selectedDate, 'yyyy-MM-dd')}
          </h3>
          {selectedDayRecords.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {Array.from(new Set(selectedDayRecords.map(r => r.routine))).map(rt => {
                const st = getRoutineStyle(rt);
                return (
                  <span key={rt} style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: st.bg,
                    border: `1px solid ${st.border}`,
                    color: st.color,
                    padding: '0.15rem 0.6rem',
                    borderRadius: '1rem'
                  }}>
                    {rt}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        
        {selectedDayRecords.length === 0 ? (
          <p style={{ color: '#737373', fontSize: '0.875rem' }}>No workout recorded on this day.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Group by Exercise */}
            {Array.from(new Set(selectedDayRecords.map(r => r.exercise))).map(exercise => {
              const sets = selectedDayRecords.filter(r => r.exercise === exercise).sort((a, b) => a.set - b.set);
              const routine = sets[0].routine;
              const st = getRoutineStyle(routine);
              const first = sets[0] as any;
              const key = `${first.date}||${routine}||${exercise}`;
              const isEditing = editingKey === key;
              
              return (
                <div key={exercise} style={{ backgroundColor: 'var(--input-bg)', padding: '1rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                    <h4 style={{ fontWeight: 600 }}>
                      {exercise}
                      {first.substitute && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: '#f59e0b', border: '1px solid #d97706', padding: '0 0.35rem', borderRadius: '1rem', fontWeight: 400 }}>
                          代替（元: {first.originalExercise}）
                        </span>
                      )}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEdit(first.date, routine, exercise, first.substitute, first.originalExercise)}
                          style={{ fontSize: '0.65rem', color: '#a0a0a0', border: '1px solid #444', padding: '0.1rem 0.45rem', borderRadius: '0.25rem' }}
                        >
                          編集
                        </button>
                      )}
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: st.bg, border: `1px solid ${st.border}`, padding: '0.1rem 0.5rem', borderRadius: '1rem', color: st.color, whiteSpace: 'nowrap' }}>{routine}</span>
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.35)', padding: '0.75rem', borderRadius: '0.35rem', marginBottom: '0.75rem', border: '1px solid #444', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: editSubstitute ? '#f59e0b' : '#d4d4d4', fontWeight: 600, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editSubstitute}
                          onChange={(e) => setEditSubstitute(e.target.checked)}
                          style={{ accentColor: '#d97706' }}
                        />
                        代替メニューとして記録（Summaryでは元メニューの前回値を引継ぎ）
                      </label>
                      {editSubstitute && (
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#a0a0a0', display: 'block', marginBottom: '0.2rem' }}>元メニュー名</label>
                          <input
                            type="text"
                            className="form-input"
                            value={editOriginal}
                            onChange={(e) => setEditOriginal(e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                          />
                        </div>
                      )}
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a0a0a0', display: 'block', marginBottom: '0.2rem' }}>実施メニュー名</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editExercise}
                          onChange={(e) => setEditExercise(e.target.value)}
                          style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                        <button type="button" onClick={() => setEditingKey(null)} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                          キャンセル
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => handleSaveEdit(first.date, routine, exercise)}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', backgroundColor: 'var(--primary)', color: '#121212', fontWeight: 600, borderRadius: '0.35rem' }}
                        >
                          {isSavingEdit ? '保存中...' : '保存'}
                        </button>
                      </div>
                    </div>
                  )}

                  <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#737373', borderBottom: '1px solid #333' }}>
                        <th style={{ textAlign: 'left', padding: '0.25rem' }}>Set</th>
                        <th style={{ textAlign: 'right', padding: '0.25rem' }}>Weight</th>
                        <th style={{ textAlign: 'right', padding: '0.25rem' }}>Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map(s => (
                        <tr key={`${s.exercise}-${s.set}`}>
                          <td style={{ padding: '0.25rem' }}>{s.set}</td>
                          <td style={{ textAlign: 'right', padding: '0.25rem', color: 'var(--primary)' }}>{s.weight} {s.unit || "kg"}</td>
                          <td style={{ textAlign: 'right', padding: '0.25rem' }}>{s.reps}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
