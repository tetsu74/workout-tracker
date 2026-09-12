import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByTitle['Routines'];
    
    if (!sheet) {
      return NextResponse.json({ routines: [] });
    }

    const rows = await sheet.getRows();
    const routines = rows.map(row => ({
      routine: row.get('Routine'),
      exercise: row.get('Exercise'),
      targetSets: parseInt(row.get('TargetSets')) || 3,
      targetReps: row.get('TargetReps'),
      order: parseInt(row.get('Order')) || 0,
    }));

    return NextResponse.json({ routines });
  } catch (error: any) {
    console.error('Error fetching routines:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { routines } = body; // Array of routines to replace existing

    if (!Array.isArray(routines)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const doc = await getGoogleSheet();
    let sheet = doc.sheetsByTitle['Routines'];
    
    if (!sheet) {
      return NextResponse.json({ error: 'Routines sheet not found' }, { status: 500 });
    }

    // Clear existing rows
    const rows = await sheet.getRows();
    for (const row of rows) {
      await row.delete();
    }

    // Add new rows
    const rowsToAdd = routines.map(r => ({
      Routine: r.routine,
      Exercise: r.exercise,
      TargetSets: r.targetSets,
      TargetReps: r.targetReps,
      Order: r.order
    }));

    await sheet.addRows(rowsToAdd);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating routines:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
