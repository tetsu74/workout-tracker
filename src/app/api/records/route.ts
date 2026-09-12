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
    
    const records = rows.map(row => ({
      date: row.get('Date'),
      routine: row.get('Routine'),
      exercise: row.get('Exercise'),
      set: parseInt(row.get('Set')),
      weight: parseFloat(row.get('Weight')),
      reps: parseInt(row.get('Reps')),
      memo: row.get('Memo') || "",
      unit: row.get('Unit') || "kg"
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
      Unit: record.unit || "kg"
    }));

    await sheet.addRows(rowsToAdd);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
