import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, nom, date_debut, date_fin FROM mission ORDER BY date_debut DESC'
    );

    return NextResponse.json({ missions: result.rows });
  } catch (error) {
    console.error('Error fetching missions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des missions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, date_debut, date_fin } = body;

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de la mission est requis' },
        { status: 400 }
      );
    }

    if (!date_debut || !date_fin) {
      return NextResponse.json(
        { error: 'Les dates de début et de fin sont requises' },
        { status: 400 }
      );
    }

    const pool = getPool();
    // Vérifier si la mission existe déjà
    const existing = await pool.query(
      'SELECT id FROM mission WHERE nom = $1 AND date_debut = $2 AND date_fin = $3',
      [nom.trim(), date_debut, date_fin]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ mission: existing.rows[0], id: existing.rows[0].id });
    }

    const result = await pool.query(
      `INSERT INTO mission (nom, date_debut, date_fin)
       VALUES ($1, $2, $3)
       RETURNING id, nom, date_debut, date_fin`,
      [nom.trim(), date_debut, date_fin]
    );

    return NextResponse.json({ mission: result.rows[0], id: result.rows[0].id });
  } catch (error: any) {
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'La date de fin doit être supérieure ou égale à la date de début' },
        { status: 400 }
      );
    }
    console.error('Error creating mission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la mission' },
      { status: 500 }
    );
  }
}

