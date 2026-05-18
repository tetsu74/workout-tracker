"use client";

import { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, parseISO, isSameDay } from "date-fns";
import { Loader2 } from "lucide-react";

type Record = {
  date: string;
  muscleGroup: string;
  exercise: string;
  set: number;
  weight: number;
  reps: number;
  unit?: string;
};

export default function CalendarPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    async function fetchRecords() {
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
    }
    fetchRecords();
  }, []);

  const workoutDates = useMemo(() => {
    const dates = new Set<string>();
    records.forEach(r => dates.add(r.date));
    return dates;
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
      <div className="header" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em' }}>CALENDAR</h2>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Calendar 
          onChange={(val) => setSelectedDate(val as Date)} 
          value={selectedDate}
          tileContent={({ date, view }) => {
            if (view === 'month') {
              const dateStr = format(date, 'yyyy-MM-dd');
              if (workoutDates.has(dateStr)) {
                return (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                  </div>
                );
              }
            }
            return null;
          }}
        />
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          {format(selectedDate, 'yyyy-MM-dd')}
        </h3>
        
        {selectedDayRecords.length === 0 ? (
          <p style={{ color: '#737373', fontSize: '0.875rem' }}>No workout recorded on this day.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Group by Exercise */}
            {Array.from(new Set(selectedDayRecords.map(r => r.exercise))).map(exercise => {
              const sets = selectedDayRecords.filter(r => r.exercise === exercise).sort((a, b) => a.set - b.set);
              const muscleGroup = sets[0].muscleGroup;
              
              return (
                <div key={exercise} style={{ backgroundColor: 'var(--input-bg)', padding: '1rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontWeight: 600 }}>{exercise}</h4>
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--border)', padding: '0.1rem 0.5rem', borderRadius: '1rem', color: '#a0a0a0' }}>{muscleGroup}</span>
                  </div>
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
