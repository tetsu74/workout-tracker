"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, History, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO } from "date-fns";

type Record = {
  date: string;
  muscleGroup: string;
  exercise: string;
  set: number;
  weight: number;
  reps: number;
};

type ExercisePlan = {
  muscleGroup: string;
  exerciseName: string;
  sets: number;
  targetWeight: number;
  targetReps: number;
};

type DayPlan = {
  day: number;
  title: string;
  exercises: ExercisePlan[];
};

export default function TrainerPage() {
  const [prompt, setPrompt] = useState("次の4回は Push, Leg, Pull, Leg の構成でお願いします。前回より少し重量を上げてください。");
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History State
  const [historyRecords, setHistoryRecords] = useState<{ date: string; records: Record[] }[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

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

        // Sort dates descending and take top 4
        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const last4Dates = sortedDates.slice(0, 4);

        // Format them
        const history = last4Dates.map(date => ({
          date,
          records: grouped[date]
        }));

        setHistoryRecords(history);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    fetchHistory();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch('/api/trainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate plan");

      setPlan(data.cyclePlan);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to group records by exercise for history display
  const groupRecordsByExercise = (records: Record[]) => {
    const grouped: { [key: string]: Record[] } = {};
    records.forEach(r => {
      if (!grouped[r.exercise]) grouped[r.exercise] = [];
      grouped[r.exercise].push(r);
    });
    return Object.values(grouped);
  };

  return (
    <div>
      <div className="header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <Sparkles size={28} color="var(--primary)" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em' }}>AI TRAINER</h2>
        <p style={{ color: '#737373', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          これまでの実績をもとに、次の4回分のメニューを提案します
        </p>
      </div>

      {/* History Section */}
      <div style={{ marginBottom: '2rem', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <button
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent', border: 'none', color: '#e5e5e5', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.05em' }}>PREVIOUS CYCLE (前回の4回分)</span>
          </div>
          {isHistoryExpanded ? <ChevronUp size={18} color="#737373" /> : <ChevronDown size={18} color="#737373" />}
        </button>

        {isHistoryExpanded && (
          <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {isLoadingHistory ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={24} color="#737373" /></div>
            ) : historyRecords.length === 0 ? (
              <p style={{ color: '#737373', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>実績データがありません。</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {historyRecords.map((dayData, idx) => (
                  <div key={dayData.date} style={{ backgroundColor: '#121212', padding: '1rem', borderRadius: '0.25rem', border: '1px solid #333' }}>
                    <div style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Session {historyRecords.length - idx} <span style={{ color: '#737373', fontWeight: 400, marginLeft: '0.5rem' }}>{format(parseISO(dayData.date), 'yyyy-MM-dd')}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {groupRecordsByExercise(dayData.records).map(exerciseRecords => {
                        const exName = exerciseRecords[0].exercise;
                        const sets = exerciseRecords.length;
                        const maxWeight = Math.max(...exerciseRecords.map(r => r.weight));
                        return (
                          <div key={exName} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <span style={{ color: '#e5e5e5' }}>{exName}</span>
                            <span style={{ color: '#a0a0a0' }}>{sets} sets / Max {maxWeight}kg</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generation Form */}
      <form onSubmit={handleGenerate} style={{ marginBottom: '3rem' }}>
        <div className="form-group">
          <label className="form-label">Requests / Prompt</label>
          <textarea
            className="form-input"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例: 全身法で組んでほしい、今回は脚をハードにしたい、など"
            style={{ resize: 'vertical' }}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isGenerating} style={{ background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
          {isGenerating ? "Generating Plan..." : "Generate Next Cycle"}
        </button>
      </form>

      {error && (
        <div style={{ padding: '1rem', color: 'var(--danger)', backgroundColor: 'rgba(178, 34, 34, 0.1)', border: '1px solid var(--danger)', borderRadius: '0.25rem', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {/* AI Plan Result */}
      {plan && (
        <div>
          <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1.5rem', textAlign: 'center', letterSpacing: '0.05em' }}>
            PROPOSED CYCLE
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {plan.map((dayPlan) => (
              <div key={dayPlan.day} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e5e5e5' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Day {dayPlan.day}:</span> {dayPlan.title}
                </h4>

                <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#a0a0a0', borderBottom: '1px solid #333', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Exercise</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Sets</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayPlan.exercises.map((ex, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: 500 }}>{ex.exerciseName}</div>
                          <div style={{ fontSize: '0.7rem', color: '#737373' }}>{ex.muscleGroup}</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                          {ex.sets}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: 'var(--primary)' }}>
                          {ex.targetWeight}kg × {ex.targetReps}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
