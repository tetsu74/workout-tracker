"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { startOfWeek, format, parseISO, subDays, isAfter } from 'date-fns';
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

  // Data for Pie Chart: Volume by Routine (Last 30 days)
  const pieData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentRecords = records.filter(r => isAfter(parseISO(r.date), thirtyDaysAgo));
    
    const volumeByRoutine: { [key: string]: number } = {};
    recentRecords.forEach(r => {
      if (!volumeByRoutine[r.routine]) volumeByRoutine[r.routine] = 0;
      const weightInKg = r.unit === 'lbs' ? r.weight * 0.453592 : r.weight;
      volumeByRoutine[r.routine] += weightInKg * r.reps;
    });

    return Object.entries(volumeByRoutine)
      .map(([name, value]) => ({ name, MathRound: Math.round(value) }))
      .map(({ name, MathRound }) => ({ name, value: MathRound }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [records]);

  // Data for Stacked Bar Chart: Weekly Volume by Routine
  const weeklyData = useMemo(() => {
    const volumeByWeek: { [weekStart: string]: { [routine: string]: number, total: number } } = {};
    
    records.forEach(r => {
      const date = parseISO(r.date);
      const weekStartStr = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Monday start
      
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '0.05em' }}>SUMMARY DASHBOARD</h2>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem', color: '#a0a0a0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weekly Volume Trend (kg)
            </h3>
            <p style={{ color: '#737373', fontSize: '0.75rem' }}>
              メニューごとのトータルボリューム推移
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

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '0.5rem', color: '#a0a0a0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Volume Balance (Last 30 Days)
        </h3>
        <p style={{ marginBottom: '1rem', color: '#737373', fontSize: '0.75rem' }}>
          直近30日間のメニュー別トレーニング割合
        </p>
        <div style={{ height: 300, width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.25rem', padding: '1rem', border: '1px solid var(--border)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => {
                  const colorIndex = routines.indexOf(entry.name);
                  return <Cell key={`cell-${index}`} fill={COLORS[colorIndex >= 0 ? colorIndex % COLORS.length : index % COLORS.length]} />;
                })}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '0.25rem' }}
                itemStyle={{ color: 'var(--primary)' }}
                formatter={(value: any) => [`${value} kg`, 'Volume']}
              />
              <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '0.875rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
