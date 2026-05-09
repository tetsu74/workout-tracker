import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    const records = rows.map(row => ({
      date: row.get('Date'),
      muscleGroup: row.get('MuscleGroup'),
      exercise: row.get('Exercise'),
      set: parseInt(row.get('Set')),
      weight: parseFloat(row.get('Weight')),
      reps: parseInt(row.get('Reps')),
      memo: row.get('Memo') || ""
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
    const sheet = doc.sheetsByIndex[0];

    // Handle both single object and array of objects
    const records = Array.isArray(body) ? body : [body];

    const rowsToAdd = records.map(record => ({
      Date: record.date,
      MuscleGroup: record.muscleGroup,
      Exercise: record.exercise,
      Set: record.set,
      Weight: record.weight,
      Reps: record.reps,
      Memo: record.memo || ""
    }));

    await sheet.addRows(rowsToAdd);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
