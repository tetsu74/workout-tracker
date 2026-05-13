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
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/records');
        if (!res.ok) throw new Error("Failed to fetch records");
        const data = await res.json();
        
        const allRecords: Record[] = data.records || [];
        
        const grouped: { [key: string]: Record[] } = {};
        allRecords.forEach(r => {
          if (!grouped[r.date]) grouped[r.date] = [];
          grouped[r.date].push(r);
        });

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
          直近のトレーニング実績（詳細を表示するには各項目をタップ）
        </p>
      </div>

      {historyRecords.length === 0 ? (
        <p style={{ color: '#737373', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>実績データがありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {historyRecords.map((dayData) => {
            const dateStr = format(parseISO(dayData.date), 'yyyy年MM月dd日');
            return (
              <div key={dayData.date} style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, margin: 0 }}>
                    {dateStr}
                  </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {groupRecordsByExercise(dayData.records).map((exerciseRecords, exIdx) => {
                    const exName = exerciseRecords[0].exercise;
                    const muscleGroup = exerciseRecords[0].muscleGroup;
                    const exerciseMemo = exerciseRecords.find(r => r.memo)?.memo;
                    const itemId = `${dayData.date}-${exName}`;
                    const isExpanded = expandedItems.includes(itemId);

                    // Summary of sets (e.g. 60kg x 10, 60kg x 10...)
                    const summary = exerciseRecords.map(r => `${r.weight}kg`).slice(0, 3).join(', ') + (exerciseRecords.length > 3 ? '...' : '');

                    return (
                      <div key={itemId} style={{ borderBottom: exIdx < groupRecordsByExercise(dayData.records).length - 1 ? '1px solid #222' : 'none' }}>
                        <div 
                          onClick={() => toggleExpand(itemId)}
                          style={{ 
                            padding: '1rem', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            transition: 'background-color 0.2s'
                          }}
                          className="history-item-header"
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#e5e5e5', fontSize: '0.9rem' }}>{exName}</div>
                            {!isExpanded && (
                              <div style={{ fontSize: '0.75rem', color: '#737373', marginTop: '0.2rem' }}>
                                {exerciseRecords.length} sets • {summary}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.65rem', backgroundColor: '#333', padding: '0.1rem 0.4rem', borderRadius: '1rem', color: '#a0a0a0' }}>{muscleGroup}</span>
                            <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: '#737373' }}>
                              ▼
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: '0 1rem 1rem 1rem', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                            <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse', marginBottom: exerciseMemo ? '0.75rem' : 0 }}>
                              <thead>
                                <tr style={{ color: '#555', borderBottom: '1px solid #2a2a2a', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                  <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>Set</th>
                                  <th style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>Weight</th>
                                  <th style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>Reps</th>
                                </tr>
                              </thead>
                              <tbody>
                                {exerciseRecords.sort((a,b) => a.set - b.set).map((r, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                    <td style={{ padding: '0.4rem 0.5rem', color: '#888' }}>{r.set}</td>
                                    <td style={{ textAlign: 'right', padding: '0.4rem 0.5rem', color: 'var(--primary)', fontWeight: 500 }}>{r.weight} kg</td>
                                    <td style={{ textAlign: 'right', padding: '0.4rem 0.5rem', color: '#d4d4d4' }}>{r.reps}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {exerciseMemo && (
                              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(203, 162, 88, 0.05)', borderRadius: '0.25rem', borderLeft: '2px solid var(--primary)', display: 'flex', gap: '0.5rem' }}>
                                <MessageSquare size={12} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--primary)' }} />
                                <p style={{ fontSize: '0.75rem', color: '#b0b0b0', fontStyle: 'italic', margin: 0 }}>{exerciseMemo}</p>
                              </div>
                            )}
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
