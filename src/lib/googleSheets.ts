import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!;

let docInstance: GoogleSpreadsheet | null = null;

const DEFAULT_EXERCISES = [
  { MuscleGroup: '胸', Exercise: 'ベンチプレス' },
  { MuscleGroup: '胸', Exercise: 'ダンベルフライ' },
  { MuscleGroup: '背中', Exercise: 'デッドリフト' },
  { MuscleGroup: '背中', Exercise: 'ラットプルダウン' },
  { MuscleGroup: '背中', Exercise: 'ベントオーバーロウ' },
  { MuscleGroup: '脚', Exercise: 'スクワット' },
  { MuscleGroup: '脚', Exercise: 'レッグプレス' },
  { MuscleGroup: '肩', Exercise: 'オーバーヘッドプレス' },
  { MuscleGroup: '肩', Exercise: 'サイドレイズ' },
  { MuscleGroup: '腕', Exercise: 'ダンベルカール' },
  { MuscleGroup: '腕', Exercise: 'トライセプスエクステンション' },
  { MuscleGroup: '腹筋', Exercise: 'クランチ' },
  { MuscleGroup: '腹筋', Exercise: 'レッグレイズ' },
];

function generateDummyData() {
  const dummyData = [];
  const today = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    
    if (i % 2 === 0 || i % 3 === 0) {
      const dateStr = d.toISOString().split('T')[0];
      const workoutType = i % 3; 
      
      let sessionExercises: typeof DEFAULT_EXERCISES = [];
      if (workoutType === 0) sessionExercises = [DEFAULT_EXERCISES[0], DEFAULT_EXERCISES[7], DEFAULT_EXERCISES[10]];
      else if (workoutType === 1) sessionExercises = [DEFAULT_EXERCISES[2], DEFAULT_EXERCISES[3], DEFAULT_EXERCISES[9]];
      else sessionExercises = [DEFAULT_EXERCISES[5], DEFAULT_EXERCISES[11], DEFAULT_EXERCISES[12]];

      sessionExercises.forEach(ex => {
        const memo = i % 5 === 0 ? "Good form, felt strong." : "";
        for (let set = 1; set <= 3; set++) {
          const baseWeight = ex.MuscleGroup === '脚' ? 80 : ex.MuscleGroup === '胸' || ex.MuscleGroup === '背中' ? 60 : ex.MuscleGroup === '腹筋' ? 0 : 20;
          const progress = Math.floor((30 - i) / 5) * 2.5; 
          let weight = baseWeight > 0 ? baseWeight + progress - (set - 1) * 2.5 : 0;
          const reps = 10 - (set - 1); 
          
          dummyData.push({
            Date: dateStr,
            MuscleGroup: ex.MuscleGroup,
            Exercise: ex.Exercise,
            Set: set,
            Weight: weight,
            Reps: reps,
            Memo: memo
          });
        }
      });
    }
  }
  return dummyData;
}

export async function getGoogleSheet() {
  if (docInstance) return docInstance;

  const serviceAccountAuth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo(); 
  
  const recordsSheet = doc.sheetsByIndex[0];
  try {
    await recordsSheet.loadHeaderRow();
    if (!recordsSheet.headerValues.includes('Memo')) {
       await recordsSheet.setHeaderRow(['Date', 'MuscleGroup', 'Exercise', 'Set', 'Weight', 'Reps', 'Memo']);
    }
  } catch (e) {
    await recordsSheet.setHeaderRow(['Date', 'MuscleGroup', 'Exercise', 'Set', 'Weight', 'Reps', 'Memo']);
  }

  let exercisesSheet = doc.sheetsByTitle['Exercises'];
  if (!exercisesSheet) {
    exercisesSheet = await doc.addSheet({ title: 'Exercises', headerValues: ['MuscleGroup', 'Exercise'] });
    await exercisesSheet.addRows(DEFAULT_EXERCISES);
  } else {
    const rows = await exercisesSheet.getRows();
    const hasAbs = rows.some(r => r.get('MuscleGroup') === '腹筋');
    if (!hasAbs) {
      await exercisesSheet.addRows([
        { MuscleGroup: '腹筋', Exercise: 'クランチ' },
        { MuscleGroup: '腹筋', Exercise: 'レッグレイズ' }
      ]);
    }
  }

  const rows = await recordsSheet.getRows();
  if (rows.length === 0) {
    const dummy = generateDummyData();
    await recordsSheet.addRows(dummy);
  }

  docInstance = doc;
  return docInstance;
}
