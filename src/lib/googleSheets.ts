import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!;

let docInstance: GoogleSpreadsheet | null = null;

const DEFAULT_ROUTINES = [
  // Push 1
  { Routine: 'Push 1', Exercise: 'フラットバーベルベンチプレス', TargetSets: 3, TargetReps: '4-6', Order: 1 },
  { Routine: 'Push 1', Exercise: 'レッグプレス', TargetSets: 3, TargetReps: '8-10', Order: 2 },
  { Routine: 'Push 1', Exercise: 'ダンベルショルダープレス', TargetSets: 3, TargetReps: '8-10', Order: 3 },
  { Routine: 'Push 1', Exercise: 'ケーブルトライセプスプッシュダウン', TargetSets: 3, TargetReps: '10-12', Order: 4 },
  { Routine: 'Push 1', Exercise: 'マシンカーフレイズ', TargetSets: 3, TargetReps: '12-15', Order: 5 },
  // Pull 1
  { Routine: 'Pull 1', Exercise: 'トラップバーデッドリフト', TargetSets: 3, TargetReps: '4-6', Order: 1 },
  { Routine: 'Pull 1', Exercise: 'ラットプルダウン', TargetSets: 3, TargetReps: '8-10', Order: 2 },
  { Routine: 'Pull 1', Exercise: 'ケーブルシーテッドロー', TargetSets: 3, TargetReps: '10-12', Order: 3 },
  { Routine: 'Pull 1', Exercise: 'ダンベルリアレイズ', TargetSets: 3, TargetReps: '12-15', Order: 4 },
  { Routine: 'Pull 1', Exercise: 'インクラインダンベルカール', TargetSets: 3, TargetReps: '10-12', Order: 5 },
  // Push 2
  { Routine: 'Push 2', Exercise: 'バーベルスクワット', TargetSets: 3, TargetReps: '4-6', Order: 1 },
  { Routine: 'Push 2', Exercise: 'インクラインダンベルプレス', TargetSets: 3, TargetReps: '8-10', Order: 2 },
  { Routine: 'Push 2', Exercise: 'ディップス', TargetSets: 3, TargetReps: '限界まで', Order: 3 },
  { Routine: 'Push 2', Exercise: 'ケーブルサイドレイズ', TargetSets: 3, TargetReps: '12-15', Order: 4 },
  { Routine: 'Push 2', Exercise: 'ペックデック', TargetSets: 3, TargetReps: '12-15', Order: 5 },
  // Pull 2
  { Routine: 'Pull 2', Exercise: 'ペンドレイロー', TargetSets: 3, TargetReps: '4-6', Order: 1 },
  { Routine: 'Pull 2', Exercise: 'チンニング', TargetSets: 3, TargetReps: '限界まで', Order: 2 },
  { Routine: 'Pull 2', Exercise: 'レッグカール', TargetSets: 3, TargetReps: '10-12', Order: 3 },
  { Routine: 'Pull 2', Exercise: 'リバース・ペックデック', TargetSets: 3, TargetReps: '12-15', Order: 4 },
  { Routine: 'Pull 2', Exercise: 'ハンマーカール', TargetSets: 3, TargetReps: '10-12', Order: 5 },
];

export async function getGoogleSheet() {
  if (docInstance) return docInstance;

  const serviceAccountAuth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo(); 
  
  let recordsSheet = doc.sheetsByTitle['Records_v2'];
  if (!recordsSheet) {
    recordsSheet = await doc.addSheet({ title: 'Records_v2', headerValues: ['Date', 'Routine', 'Exercise', 'Set', 'Weight', 'Reps', 'Memo', 'Unit'] });
  }

  let routinesSheet = doc.sheetsByTitle['Routines'];
  if (!routinesSheet) {
    routinesSheet = await doc.addSheet({ title: 'Routines', headerValues: ['Routine', 'Exercise', 'TargetSets', 'TargetReps', 'Order'] });
    await routinesSheet.addRows(DEFAULT_ROUTINES);
  }

  // Clear old sheets as requested
  try {
    const oldRecords = doc.sheetsByTitle['シート1'];
    if (oldRecords) await oldRecords.delete();
    const oldExercises = doc.sheetsByTitle['Exercises'];
    if (oldExercises) await oldExercises.delete();
  } catch (e) {
    console.error("Failed to delete old sheets", e);
  }

  docInstance = doc;
  return docInstance;
}
