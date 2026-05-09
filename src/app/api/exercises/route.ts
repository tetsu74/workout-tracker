import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheet } from '@/lib/googleSheets';

export async function GET() {
  try {
    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByTitle['Exercises'];
    
    if (!sheet) {
      return NextResponse.json({ exercises: [] });
    }

    const rows = await sheet.getRows();
    const exercises = rows.map(row => ({
      muscleGroup: row.get('MuscleGroup'),
      exercise: row.get('Exercise'),
    }));

    return NextResponse.json({ exercises });
  } catch (error: any) {
    console.error('Error fetching exercises:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { muscleGroup, exercise } = body;

    if (!muscleGroup || !exercise) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const doc = await getGoogleSheet();
    const sheet = doc.sheetsByTitle['Exercises'];
    
    if (!sheet) {
      return NextResponse.json({ error: 'Exercises sheet not found' }, { status: 500 });
    }

    await sheet.addRow({
      MuscleGroup: muscleGroup,
      Exercise: exercise,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding exercise:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
