"use client";

import { useState, useEffect } from "react";
import { History, Loader2, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";

type Record = {
  date: string;
  muscleGroup: string;
  exercise: string;
  set: number;
  weight: number;
  reps: number;
  memo?: string;
};

export default function HistoryPage() {
  const [historyRecords, setHistoryRecords] = useState<{ date: string; records: Record[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/records');
        if (!res.ok) throw new Error("Failed to fetch records");
        const data = await res.json();
        
        const allRecords: Record[] = data.records || [];
        
        // Group by date
        const grouped: { [key: string]: Record[] } = {};
        allRecords.forEach(r => {
          if (!grouped[r.date]) grouped[r.date] = [];
          grouped[r.date].push(r);
        });

        // Sort dates descending and take top 10 sessions
        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const recentDates = sortedDates.slice(0, 10);
        
        const history = recentDates.map(date => ({
          date,
          records: grouped[date]
        }));
        
        setHistoryRecords(history);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const groupRecordsByExercise = (records: Record[]) => {
    const grouped: { [key: string]: Record[] } = {};
    records.forEach(r => {
      if (!grouped[r.exercise]) grouped[r.exercise] = [];
      grouped[r.exercise].push(r);
    });
    return Object.values(grouped);
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin" size={32} color="var(--primary)" /></div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div className="header" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <History size={24} />
          RECENT HISTORY
        </h2>
        <p style={{ color: '#737373', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          直近のトレーニング実績（詳細）
        </p>
      </div>

      {historyRecords.length === 0 ? (
        <p style={{ color: '#737373', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>実績データがありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {historyRecords.map((dayData, idx) => {
            const dateStr = format(parseISO(dayData.date), 'yyyy年MM月dd日');
            return (
              <div key={dayData.date} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                  {dateStr}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {groupRecordsByExercise(dayData.records).map((exerciseRecords, exIdx) => {
                    const exName = exerciseRecords[0].exercise;
                    const muscleGroup = exerciseRecords[0].muscleGroup;
                    const exerciseMemo = exerciseRecords.find(r => r.memo)?.memo;

                    return (
                      <div key={`${exName}-${exIdx}`} style={{ backgroundColor: '#121212', padding: '1rem', borderRadius: '0.25rem', border: '1px solid #222' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h4 style={{ fontWeight: 600, color: '#e5e5e5', fontSize: '0.95rem' }}>{exName}</h4>
                          <span style={{ fontSize: '0.7rem', backgroundColor: '#333', padding: '0.1rem 0.5rem', borderRadius: '1rem', color: '#a0a0a0' }}>{muscleGroup}</span>
                        </div>
                        
                        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse', marginBottom: exerciseMemo ? '0.75rem' : 0 }}>
                          <thead>
                            <tr style={{ color: '#737373', borderBottom: '1px solid #2a2a2a', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>Set</th>
                              <th style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>Weight</th>
                              <th style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>Reps</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exerciseRecords.sort((a,b) => a.set - b.set).map((r, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                                <td style={{ padding: '0.5rem', color: '#a0a0a0' }}>{r.set}</td>
                                <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--primary)', fontWeight: 500 }}>{r.weight} kg</td>
                                <td style={{ textAlign: 'right', padding: '0.5rem', color: '#e5e5e5' }}>{r.reps}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {exerciseMemo && (
                          <div style={{ padding: '0.5rem', backgroundColor: 'rgba(203, 162, 88, 0.05)', borderRadius: '0.25rem', borderLeft: '2px solid var(--primary)', display: 'flex', gap: '0.5rem' }}>
                            <MessageSquare size={14} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--primary)' }} />
                            <p style={{ fontSize: '0.8125rem', color: '#d1d1d1', fontStyle: 'italic', margin: 0 }}>{exerciseMemo}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
