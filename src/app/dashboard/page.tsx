"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
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

  const [weeklyFilter, setWeeklyFilter] = useState<string>("All");
  
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

  // Data for Stacked Bar Chart: Weekly Volume by Routine
  const weeklyData = useMemo(() => {
    const volumeByWeek: { [weekStart: string]: { [routine: string]: number, total: number } } = {};
    
    records.forEach(r => {
      const date = parseISO(r.date);
      const weekStartStr = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      if (!volumeByWeek[weekStartStr]) {
        volumeByWeek[weekStartStr] = { total: 0 };
        routines.forEach(rt => volumeByWeek[weekStartStr][rt] = 0);
      }
      
      const weightInKg = r.unit === 'lbs' ? r.weight * 0.453592 : r.weight;
      const volume = Math.round(weightInKg * r.reps * 10) / 10;
      volumeByWeek[weekStartStr][r.routine] = (volumeByWeek[weekStartStr][r.routine] || 0) + volume;
      volumeByWeek[weekStartStr].total += volume;
    });

    return Object.entries(volumeByWeek)
      .map(([week, data]) => ({ week: format(parseISO(week), 'MM/dd'), ...data, rawWeek: week }))
      .sort((a, b) => new Date(a.rawWeek).getTime() - new Date(b.rawWeek).getTime());
  }, [records, routines]);

  // Data for Progression Line Chart (Sets 1, 2, 3 Weight)
  const progressionData = useMemo(() => {
    if (!progressionExercise) return [];
    
    const exerciseRecords = records.filter(r => r.routine === progressionRoutine && r.exercise === progressionExercise);
    
    const groupedByDate: { [date: string]: any } = {};
    exerciseRecords.forEach(r => {
      if (!groupedByDate[r.date]) {
        groupedByDate[r.date] = { date: r.date, formattedDate: format(parseISO(r.date), 'MM/dd') };
      }
      if (r.set <= 3) {
        groupedByDate[r.date][`set${r.set}`] = r.weight; // Show raw weight (kg/lbs)
      }
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
              {routines.map(rt => <option key={rt} value={rt}>{rt}</option>)}
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
              <LineChart data={progressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="formattedDate" stroke="#737373" fontSize={12} tickMargin={10} />
                <YAxis stroke="#737373" fontSize={12} tickMargin={10} width={60} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '0.25rem' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  labelStyle={{ color: '#a0a0a0', marginBottom: '0.25rem' }}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="set1" name="Set 1" stroke="#cba258" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="set2" name="Set 2" stroke="#8b7355" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="set3" name="Set 3" stroke="#6b8e23" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.25rem', border: '1px solid var(--border)', color: '#737373', fontSize: '0.875rem' }}>
            No progression data available for this exercise.
          </div>
        )}
      </div>

      {/* WEEKLY VOLUME CHART (Kept as requested) */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem', color: '#a0a0a0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weekly Volume Total (kg)
            </h3>
            <p style={{ color: '#737373', fontSize: '0.75rem' }}>
              メニューごとのトータルボリューム推移（参考）
            </p>
          </div>
          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '0.5rem', fontSize: '0.875rem' }}
            value={weeklyFilter}
            onChange={(e) => setWeeklyFilter(e.target.value)}
          >
            <option value="All">すべてのメニュー</option>
            {routines.map(rt => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
        </div>

        <div style={{ height: 350, width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.25rem', padding: '1rem 1rem 1rem 0', border: '1px solid var(--border)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="week" stroke="#737373" fontSize={12} tickMargin={10} />
              <YAxis stroke="#737373" fontSize={12} tickMargin={10} width={60} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '0.25rem' }}
                itemStyle={{ color: 'var(--foreground)' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
              {weeklyFilter === "All" ? (
                routines.map((rt, index) => (
                  <Bar key={rt} dataKey={rt} name={rt} stackId="a" fill={COLORS[index % COLORS.length]} />
                ))
              ) : (
                <Bar 
                  dataKey={weeklyFilter} 
                  name={weeklyFilter} 
                  fill={COLORS[routines.indexOf(weeklyFilter) % COLORS.length] || COLORS[0]} 
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
