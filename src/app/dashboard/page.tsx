"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { startOfWeek, format, parseISO } from 'date-fns';
import { Loader2 } from "lucide-react";

type Record = {
  date: string;
  routine: string;
  exercise: string;
  set: number;
  weight: number;
  reps: number;
  unit?: string;
  substitute?: boolean;
  originalExercise?: string;
  carried?: boolean; // true = value carried over from previous session (substituted day)
};

const COLORS = ['#cba258', '#8b7355', '#6b8e23', '#b22222', '#4682b4', '#9370db', '#20b2aa'];

export default function Dashboard() {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cycleFilter, setCycleFilter] = useState<string>("All");
  
  // States for Progression Chart
  const [progressionRoutine, setProgressionRoutine] = useState<string>("");
  const [progressionExercise, setProgressionExercise] = useState<string>("");

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

  // Normalize records for reporting:
  // - Substitute (irregular) records are NOT counted as-is.
  // - Instead, the original exercise inherits its previous session's values on that date.
  const effectiveRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const dates = Array.from(new Set(sorted.map(r => r.date)));
    const lastByKey: { [key: string]: Record[] } = {};
    const result: Record[] = [];

    dates.forEach(date => {
      const dayRecords = sorted.filter(r => r.date === date);

      // Regular records first (update "last" values)
      const regular = dayRecords.filter(r => !r.substitute);
      const regularGroups: { [key: string]: Record[] } = {};
      regular.forEach(r => {
        const key = `${r.routine}||${r.exercise}`;
        (regularGroups[key] ||= []).push(r);
        result.push(r);
      });
      Object.entries(regularGroups).forEach(([key, recs]) => { lastByKey[key] = recs; });

      // Substituted exercises: carry over previous values of the original exercise
      const subKeys = new Set(
        dayRecords
          .filter(r => r.substitute && r.originalExercise)
          .map(r => `${r.routine}||${r.originalExercise}`)
      );
      subKeys.forEach(key => {
        if (regularGroups[key]) return; // original also done that day; nothing to carry
        const prev = lastByKey[key];
        if (!prev) return; // no previous record -> nothing to inherit
        prev.forEach(p => result.push({ ...p, date, substitute: false, carried: true }));
      });
    });

    return result;
  }, [records]);

  const routines = useMemo(() => {
    return Array.from(new Set(effectiveRecords.map(r => r.routine))).filter(Boolean);
  }, [effectiveRecords]);

  // Set default progression filters when routines load
  useEffect(() => {
    if (routines.length > 0 && !progressionRoutine) {
      setProgressionRoutine(routines.find(r => r !== 'Extra') || routines[0]);
    }
  }, [routines, progressionRoutine]);

  const exercisesForRoutine = useMemo(() => {
    if (!progressionRoutine) return [];
    return Array.from(new Set(effectiveRecords.filter(r => r.routine === progressionRoutine).map(r => r.exercise)));
  }, [effectiveRecords, progressionRoutine]);

  useEffect(() => {
    if (exercisesForRoutine.length > 0 && (!progressionExercise || !exercisesForRoutine.includes(progressionExercise))) {
      setProgressionExercise(exercisesForRoutine[0]);
    }
  }, [exercisesForRoutine, progressionExercise]);

  // Data for Stacked Bar Chart: Cycle Volume by Routine
  const cycleData = useMemo(() => {
    const recordsByDate: { [date: string]: any[] } = {};
    effectiveRecords.forEach(r => {
      if (!recordsByDate[r.date]) recordsByDate[r.date] = [];
      recordsByDate[r.date].push(r);
    });

    const dates = Object.keys(recordsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    const routineCounts: { [routine: string]: number } = {};
    const cycleMap: { [cycleNum: number]: { [routine: string]: number, total: number } } = {};
    
    dates.forEach(date => {
      const dayRecords = recordsByDate[date].filter(r => r.routine !== 'Extra');
      if (dayRecords.length === 0) return;
      
      const dominantRoutine = dayRecords[0].routine;
      
      routineCounts[dominantRoutine] = (routineCounts[dominantRoutine] || 0) + 1;
      const cycleNum = routineCounts[dominantRoutine];
      
      if (!cycleMap[cycleNum]) {
        cycleMap[cycleNum] = { total: 0 };
        routines.forEach(rt => {
          if (rt !== 'Extra') cycleMap[cycleNum][rt] = 0;
        });
      }
      
      dayRecords.forEach(r => {
        if (r.routine === dominantRoutine) {
          const weightInKg = r.unit === 'lbs' ? r.weight * 0.453592 : r.weight;
          const volume = Math.round(weightInKg * r.reps * 10) / 10;
          cycleMap[cycleNum][dominantRoutine] = (cycleMap[cycleNum][dominantRoutine] || 0) + volume;
          cycleMap[cycleNum].total += volume;
        }
      });
    });

    return Object.entries(cycleMap)
      .map(([cycleNum, data]) => ({ cycle: `Cycle ${cycleNum}`, cycleNum: parseInt(cycleNum), ...data }))
      .sort((a, b) => a.cycleNum - b.cycleNum);
  }, [effectiveRecords, routines]);

  // Data for Progression Line Chart (Sets 1, 2, 3 Weight)
  const progressionData = useMemo(() => {
    if (!progressionExercise) return [];
    
    const exerciseRecords = effectiveRecords.filter(r => r.routine === progressionRoutine && r.exercise === progressionExercise);
    
    const groupedByDate: { [date: string]: any } = {};
    exerciseRecords.forEach(r => {
      if (!groupedByDate[r.date]) {
        groupedByDate[r.date] = {
          date: r.date,
          // "*" marks a substituted day (values inherited from the previous session)
          formattedDate: format(parseISO(r.date), 'MM/dd') + (r.carried ? '*' : ''),
          totalVolume: 0
        };
      }
      if (r.set <= 3) {
        groupedByDate[r.date][`set${r.set}`] = r.weight; // Show raw weight (kg/lbs)
      }
      
      const weightInKg = r.unit === 'lbs' ? r.weight * 0.453592 : r.weight;
      groupedByDate[r.date].totalVolume += Math.round(weightInKg * r.reps);
    });

    return Object.values(groupedByDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [effectiveRecords, progressionRoutine, progressionExercise]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>Error: {error}</div>;
  }

  if (records.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#737373' }}>No records found. Start training!</div>;
  }

  return (
    <div>
      <div className="header" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em', margin: 0 }}>SUMMARY DASHBOARD</h2>
      </div>

      {/* PROGRESSION CHART */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem', color: '#a0a0a0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weight Progression by Set
            </h3>
            <p style={{ color: '#737373', fontSize: '0.75rem' }}>
              種目ごとのセット別（1〜3セット目）重量推移（* = 代替実施日：前回値を引継ぎ）
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '0.5rem', fontSize: '0.875rem' }}
              value={progressionRoutine}
              onChange={(e) => setProgressionRoutine(e.target.value)}
            >
              {routines.filter(r => r !== 'Extra').map(rt => <option key={rt} value={rt}>{rt}</option>)}
            </select>
            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '0.5rem', fontSize: '0.875rem' }}
              value={progressionExercise}
              onChange={(e) => setProgressionExercise(e.target.value)}
              disabled={exercisesForRoutine.length === 0}
            >
              {exercisesForRoutine.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
        </div>

        {progressionData.length > 0 ? (
          <div style={{ height: 350, width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.25rem', padding: '1rem 1rem 1rem 0', border: '1px solid var(--border)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={progressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="formattedDate" stroke="#737373" fontSize={12} tickMargin={10} />
                <YAxis yAxisId="left" stroke="#737373" fontSize={12} tickMargin={10} width={40} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" stroke="#555" fontSize={12} tickMargin={10} width={50} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '0.25rem' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  labelStyle={{ color: '#a0a0a0', marginBottom: '0.25rem' }}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
                
                <Bar yAxisId="right" dataKey="totalVolume" name="3s Total Volume" fill="rgba(255, 255, 255, 0.08)" radius={[4,4,0,0]} />
                
                <Line yAxisId="left" type="monotone" dataKey="set1" name="Set 1 Weight" stroke="#cba258" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="set2" name="Set 2 Weight" stroke="#8b7355" strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="left" type="monotone" dataKey="set3" name="Set 3 Weight" stroke="#6b8e23" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.25rem', border: '1px solid var(--border)', color: '#737373', fontSize: '0.875rem' }}>
            No progression data available for this exercise.
          </div>
        )}
      </div>

      {/* CYCLE VOLUME CHART */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem', color: '#a0a0a0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cycle Volume Total (kg)
            </h3>
            <p style={{ color: '#737373', fontSize: '0.75rem' }}>
              4メニューを1周とするサイクルごとのボリューム比較
            </p>
          </div>
          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '0.5rem', fontSize: '0.875rem' }}
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
          >
            <option value="All">すべてのメニュー</option>
            {routines.filter(r => r !== 'Extra').map(rt => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
        </div>

        <div style={{ height: 350, width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.25rem', padding: '1rem 1rem 1rem 0', border: '1px solid var(--border)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cycleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="cycle" stroke="#737373" fontSize={12} tickMargin={10} />
              <YAxis stroke="#737373" fontSize={12} tickMargin={10} width={60} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '0.25rem' }}
                itemStyle={{ color: 'var(--foreground)' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
              {cycleFilter === "All" ? (
                routines.filter(r => r !== 'Extra').map((rt, index) => (
                  <Bar key={rt} dataKey={rt} name={rt} stackId="a" fill={COLORS[index % COLORS.length]} />
                ))
              ) : (
                <Bar 
                  dataKey={cycleFilter} 
                  name={cycleFilter} 
                  fill={COLORS[routines.indexOf(cycleFilter) % COLORS.length] || COLORS[0]} 
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
