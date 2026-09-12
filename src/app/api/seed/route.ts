import { NextResponse } from 'next/server';
import { getGoogleSheet } from '@/lib/googleSheets';
import { subDays, format } from 'date-fns';

const DEFAULT_ROUTINES = [
  // Push 1
  { Routine: 'Push 1', Exercise: 'フラットバーベルベンチプレス', TargetSets: 3 },
  { Routine: 'Push 1', Exercise: 'レッグプレス', TargetSets: 3 },
  { Routine: 'Push 1', Exercise: 'ダンベルショルダープレス', TargetSets: 3 },
  { Routine: 'Push 1', Exercise: 'ケーブルトライセプスプッシュダウン', TargetSets: 3 },
  { Routine: 'Push 1', Exercise: 'マシンカーフレイズ', TargetSets: 3 },
  // Pull 1
  { Routine: 'Pull 1', Exercise: 'トラップバーデッドリフト', TargetSets: 3 },
  { Routine: 'Pull 1', Exercise: 'ラットプルダウン', TargetSets: 3 },
  { Routine: 'Pull 1', Exercise: 'ケーブルシーテッドロー', TargetSets: 3 },
  { Routine: 'Pull 1', Exercise: 'ダンベルリアレイズ', TargetSets: 3 },
  { Routine: 'Pull 1', Exercise: 'インクラインダンベルカール', TargetSets: 3 },
  // Push 2
  { Routine: 'Push 2', Exercise: 'バーベルスクワット', TargetSets: 3 },
  { Routine: 'Push 2', Exercise: 'インクラインダンベルプレス', TargetSets: 3 },
  { Routine: 'Push 2', Exercise: 'ディップス', TargetSets: 3 },
  { Routine: 'Push 2', Exercise: 'ケーブルサイドレイズ', TargetSets: 3 },
  { Routine: 'Push 2', Exercise: 'ペックデック', TargetSets: 3 },
  // Pull 2
  { Routine: 'Pull 2', Exercise: 'ペンドレイロー', TargetSets: 3 },
  { Routine: 'Pull 2', Exercise: 'チンニング', TargetSets: 3 },
  { Routine: 'Pull 2', Exercise: 'レッグカール', TargetSets: 3 },
  { Routine: 'Pull 2', Exercise: 'リバース・ペックデック', TargetSets: 3 },
  { Routine: 'Pull 2', Exercise: 'ハンマーカール', TargetSets: 3 },
];

export async function POST() {
  try {
    const doc = await getGoogleSheet();
    let sheet = doc.sheetsByTitle['Records_v2'];
    
    if (!sheet) {
      return NextResponse.json({ error: 'Records_v2 sheet not found' }, { status: 500 });
    }

    // Fast clear of all data rows
    await sheet.clearRows();

    const dummyData = [];
    const today = new Date();
    
    // Generate past 8 weeks of data (56 days)
    // Routine cycle: Push 1, Pull 1, Rest, Push 2, Pull 2, Rest, Rest
    const cycle = ['Push 1', 'Pull 1', 'Rest', 'Push 2', 'Pull 2', 'Rest', 'Rest'];
    
    for (let i = 56; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      
      const dayOfCycle = (56 - i) % 7;
      const routineName = cycle[dayOfCycle];
      
      if (routineName !== 'Rest') {
        const exercises = DEFAULT_ROUTINES.filter(r => r.Routine === routineName);
        
        // Progress factor: starts at 0, goes up to 1.0 at day 56
        const progressFactor = (56 - i) / 56; 
        
        exercises.forEach(ex => {
          for (let set = 1; set <= ex.TargetSets; set++) {
            // Base weight logic
            let baseW = 20;
            if (ex.Exercise.includes('スクワット') || ex.Exercise.includes('デッドリフト') || ex.Exercise.includes('レッグプレス')) baseW = 80;
            if (ex.Exercise.includes('ベンチプレス') || ex.Exercise.includes('ペンドレイロー')) baseW = 60;
            if (ex.Exercise === 'チンニング' || ex.Exercise === 'ディップス') baseW = 0; // Bodyweight
            
            // Weight increases by ~25% over 8 weeks
            const weight = baseW > 0 ? baseW + (baseW * 0.25 * progressFactor) : 0;
            // Round to nearest 2.5
            const finalWeight = Math.round(weight / 2.5) * 2.5;
            
            // Reps: 8 to 10 depending on the day
            let reps = 10;
            if (set === 2) reps = 9;
            if (set === 3) reps = 8;
            
            // If bodyweight, reps progress instead
            if (baseW === 0) {
              reps = Math.floor(8 + (6 * progressFactor)) - (set - 1);
            }

            dummyData.push({
              Date: dateStr,
              Routine: routineName,
              Exercise: ex.Exercise,
              Set: set,
              Weight: finalWeight,
              Reps: reps,
              Memo: set === 1 ? 'Dummy generated data' : '',
              Unit: 'kg'
            });
          }
        });
      }
    }
    
    await sheet.addRows(dummyData);
    
    return NextResponse.json({ success: true, inserted: dummyData.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
