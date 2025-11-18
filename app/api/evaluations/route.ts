import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';

const evaluationSchema = z.object({
  missionId: z.number().int().positive(),
  villeId: z.number().int().positive(),
  etablissementVisiteId: z.number().int().positive(),
  controleurId: z.number().int().positive(),
  voletId: z.number().int().positive(),
  rubriques: z.array(
    z.object({
      rubriqueId: z.number().int().positive(),
      note: z.number().int().min(1).max(5),
      commentaire: z.string().max(2000).nullable().optional(),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = evaluationSchema.parse(body);

    const pool = getPool();
    await pool.query('BEGIN');

    try {
      // Insérer chaque évaluation de rubrique
      for (const rubrique of validatedData.rubriques) {
        await pool.query(
          `INSERT INTO evaluation (
            mission_id, ville_id, etablissement_visite_id, controleur_id,
            volet_id, rubrique_id, note, commentaire, date_evaluation
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)`,
          [
            validatedData.missionId,
            validatedData.villeId,
            validatedData.etablissementVisiteId,
            validatedData.controleurId,
            validatedData.voletId,
            rubrique.rubriqueId,
            rubrique.note,
            rubrique.commentaire || null,
          ]
        );
      }

      await pool.query('COMMIT');

      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating evaluation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'évaluation' },
      { status: 500 }
    );
  }
}
