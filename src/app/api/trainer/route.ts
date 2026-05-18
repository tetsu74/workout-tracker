import { NextRequest, NextResponse } from 'next/server';
import { getGoogleSheet } from '@/lib/googleSheets';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    const doc = await getGoogleSheet();
    const recordsSheet = doc.sheetsByIndex[0];
    const exercisesSheet = doc.sheetsByTitle['Exercises'];

    // Get available exercises
    let availableExercises: any[] = [];
    if (exercisesSheet) {
      const rows = await exercisesSheet.getRows();
      availableExercises = rows.map(r => ({ muscleGroup: r.get('MuscleGroup'), exercise: r.get('Exercise') }));
    }

    // Get recent records (last 50 rows should be enough for context)
    const recordsRows = await recordsSheet.getRows();
    const recentRecords = recordsRows.slice(-50).map(r => ({
      date: r.get('Date'),
      muscleGroup: r.get('MuscleGroup'),
      exercise: r.get('Exercise'),
      set: r.get('Set'),
      weight: r.get('Weight'),
      reps: r.get('Reps'),
      memo: r.get('Memo') || "",
      unit: r.get('Unit') || "kg"
    }));

    // Construct the prompt
    const systemPrompt = `
あなたはプロのパーソナルトレーナーです。
ユーザーのこれまでの筋トレの記録を分析し、漸進性過負荷の原則（少しずつ重量やレップスを上げる）に従って、
次の1サイクル（4回分）のトレーニングメニューを提案してください。

【メニュー選定および重量・レップス設計の重要ルール】
1. **基本的に重量を下げずに、レップ数（回数）を上げていく**ことを優先してください。重量を無闇に下げるのは避けてください。
2. **レップ数が一定の数（目安として8〜12レップス）に落ち着き（クリアできたら）、次回の重量を上げる**ように設計してください（例：kgなら+1.25kg〜+2.5kg、lbsなら+5lbs程度）。
3. **直前のメモ（memo）を最終的に最優先で参考にしてメニューや強度を決定する**ようにしてください。
   - 例えば、メモに「フォームが崩れた」「肩が痛い・違和感」「キツすぎた」などの記述がある場合は、基本ルール（重量維持・アップ）に関わらず、重量を下げるか、現状維持にするか、あるいは該当種目を別の安全な種目に変更するなどの柔軟な配慮を行ってください。
   - メモに「軽すぎた」「余裕あり」「次回重量アップ推奨」などの記述がある場合は、積極的に重量を上げるよう調整してください。
4. **lbsでの入力への配慮**:
   - ユーザーが直近で \`unit: "lbs"\` で記録している種目については、提案するターゲット重量も lbs 単位で設計し、\`targetUnit: "lbs"\` と指定してください。
   - kg で記録している種目は \`targetUnit: "kg"\` と指定してください。

ユーザーからの特別な要望:
"${prompt || "特に指定なし。通常のローテーション（例：Push, Leg, Pull, Leg）で提案してください。"}"

【利用可能な種目リスト（これ以外でも新しい種目を提案して構いません）】
${JSON.stringify(availableExercises)}

【直近のトレーニング記録（メモや単位も参考にしてください）】
${JSON.stringify(recentRecords)}

必ず以下のJSON形式で返答してください。余計なマークダウン（\`\`\`json など）は含めず、純粋なJSON文字列のみを出力してください。
[
  {
    "day": 1,
    "title": "Push Day または 胸の日 など",
    "exercises": [
      {
        "muscleGroup": "胸",
        "exerciseName": "ベンチプレス",
        "sets": 3,
        "targetWeight": 62.5,
        "targetReps": 10,
        "targetUnit": "kg"
      }
    ]
  },
  // day 2, day 3, day 4 を同様に...
]
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    
    // Clean up response if model added markdown
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const cyclePlan = JSON.parse(jsonStr);

    // Auto-register new exercises
    if (exercisesSheet) {
      const newExercisesToAdd: { MuscleGroup: string; Exercise: string }[] = [];
      const currentExSet = new Set(availableExercises.map(e => `${e.muscleGroup}-${e.exercise}`));
      
      for (const day of cyclePlan) {
        for (const ex of day.exercises) {
          const key = `${ex.muscleGroup}-${ex.exerciseName}`;
          if (!currentExSet.has(key)) {
            newExercisesToAdd.push({ MuscleGroup: ex.muscleGroup, Exercise: ex.exerciseName });
            currentExSet.add(key);
          }
        }
      }

      if (newExercisesToAdd.length > 0) {
        await exercisesSheet.addRows(newExercisesToAdd);
      }
    }

    return NextResponse.json({ cyclePlan });
  } catch (error: any) {
    console.error('Error generating AI plan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
