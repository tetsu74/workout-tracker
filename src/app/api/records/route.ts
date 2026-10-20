import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByTitle['Records_v2'];
    if (!sheet) {
      return NextResponse.json({ records: [] });
    }
    const rows = await sheet.getRows();

    // Auto-migrate requested historical record: 2026-10-18 トラップバーデッドリフト -> ルーマニアデッドリフト (Substitute)
    for (const row of rows) {
      const rDate = row.get('Date');
      const rEx = row.get('Exercise') || '';
      const rSub = String(row.get('Substitute') || '').toUpperCase() === 'TRUE';
      if (rDate === '2026-10-18' && rEx.includes('トラップバー') && !rSub) {
        row.set('OriginalExercise', rEx);
        row.set('Exercise', 'ルーマニアデッドリフト');
        row.set('Substitute', 'TRUE');
        await row.save();
      }
    }
    
    const records = rows.map(row => ({
      date: row.get('Date'),
      routine: row.get('Routine'),
      exercise: row.get('Exercise'),
      set: parseInt(row.get('Set')),
      weight: parseFloat(row.get('Weight')),
      reps: parseInt(row.get('Reps')),
      memo: row.get('Memo') || "",
      unit: row.get('Unit') || "kg",
      // Substitute = irregular alternative exercise performed instead of the routine's exercise
      substitute: String(row.get('Substitute') || '').toUpperCase() === 'TRUE',
      originalExercise: row.get('OriginalExercise') || ""
    }));

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByTitle['Records_v2'];

    if (!sheet) {
      return NextResponse.json({ error: 'Records sheet not found' }, { status: 500 });
    }

    // Handle both single object and array of objects
    const records = Array.isArray(body) ? body : [body];

    const rowsToAdd = records.map(record => ({
      Date: record.date,
      Routine: record.routine,
      Exercise: record.exercise,
      Set: record.set,
      Weight: record.weight,
      Reps: record.reps,
      Memo: record.memo || "",
      Unit: record.unit || "kg",
      Substitute: record.substitute ? "TRUE" : "",
      OriginalExercise: record.substitute ? (record.originalExercise || "") : ""
    }));

    await sheet.addRows(rowsToAdd);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, routine, currentExercise, newExercise, substitute, originalExercise } = body;

    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByTitle['Records_v2'];
    if (!sheet) {
      return NextResponse.json({ error: 'Records sheet not found' }, { status: 500 });
    }

    const rows = await sheet.getRows();
    let updatedCount = 0;

    for (const row of rows) {
      if (row.get('Date') === date && row.get('Routine') === routine && row.get('Exercise') === currentExercise) {
        row.set('Exercise', newExercise);
        row.set('Substitute', substitute ? 'TRUE' : '');
        row.set('OriginalExercise', substitute ? (originalExercise || currentExercise) : '');
        await row.save();
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
