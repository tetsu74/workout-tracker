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

  const routines = useMemo(() => {
    return Array.from(new Set(records.map(r => r.routine))).filter(Boolean);
  }, [records]);

  // Set default progression filters when routines load
  useEffect(() => {
    if (routines.length > 0 && !progressionRoutine) {
      setProgressionRoutine(routines[0]);
    }
  }, [routines, progressionRoutine]);

  const exercisesForRoutine = useMemo(() => {
    if (!progressionRoutine) return [];
    return Array.from(new Set(records.filter(r => r.routine === progressionRoutine).map(r => r.exercise)));
  }, [records, progressionRoutine]);

  useEffect(() => {
    if (exercisesForRoutine.length > 0 && (!progressionExercise || !exercisesForRoutine.includes(progressionExercise))) {
      setProgressionExercise(exercisesForRoutine[0]);
    }
  }, [exercisesForRoutine, progressionExercise]);

  // Data for Stacked Bar Chart: Cycle Volume by Routine
  const cycleData = useMemo(() => {
    const recordsByDate: { [date: string]: any[] } = {};
    records.forEach(r => {
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
  }, [records, routines]);

  // Data for Progression Line Chart (Sets 1, 2, 3 Weight)
  const progressionData = useMemo(() => {
    if (!progressionExercise) return [];
    
    const exerciseRecords = records.filter(r => r.routine === progressionRoutine && r.exercise === progressionExercise);
    
    const groupedByDate: { [date: string]: any } = {};
    exerciseRecords.forEach(r => {
      if (!groupedByDate[r.date]) {
        groupedByDate[r.date] = { date: r.date, formattedDate: format(parseISO(r.date), 'MM/dd'), totalVolume: 0 };
      }
      if (r.set <= 3) {
        groupedByDate[r.date][`set${r.set}`] = r.weight; // Show raw weight (kg/lbs)
      }
      
      const weightInKg = r.unit === 'lbs' ? r.weight * 0.453592 : r.weight;
      groupedByDate[r.date].totalVolume += Math.round(weightInKg * r.reps);
    });

    return Object.values(groupedByDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records, progressionRoutine, progressionExercise]);

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
      <div className="header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em', margin: 0 }}>SUMMARY DASHBOARD</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={async () => {
              if (!confirm('Are you sure? This will delete ALL records in the database.')) return;
              setIsLoading(true);
              try {
                const res = await fetch('/api/seed', { method: 'DELETE' });
                if (res.ok) window.location.reload();
                else alert('Failed to clear');
              } catch (e) {
                alert('Error clearing');
              }
            }}
            className="btn-secondary" 
            style={{ padding: '0.5rem', fontSize: '0.75rem', borderColor: '#737373', color: '#737373' }}
          >
            Clear All Data
          </button>
          <button 
            onClick={async () => {
              if (!confirm('Are you sure? This will delete all current records and insert 8 weeks of dummy data.')) return;
              setIsLoading(true);
              try {
                const res = await fetch('/api/seed', { method: 'POST' });
                if (res.ok) window.location.reload();
                else alert('Failed to seed');
              } catch (e) {
                alert('Error seeding');
              }
            }}
            className="btn-secondary" 
            style={{ padding: '0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            Inject Dummy Data
          </button>
        </div>
      </div>

      {/* PROGRESSION CHART */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem', color: '#a0a0a0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weight Progression by Set
            </h3>
            <p style={{ color: '#737373', fontSize: '0.75rem' }}>
              種目ごとのセット別（1〜3セット目）重量推移
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
