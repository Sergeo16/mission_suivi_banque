import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const villeId = request.nextUrl.searchParams.get('villeId');
    const pool = getPool();

    let query = `
      SELECT e.id, e.nom, e.ville_id, v.nom as ville_nom
      FROM etablissement_visite e
      JOIN ville v ON e.ville_id = v.id
    `;
    const params: any[] = [];

    if (villeId) {
      query += ' WHERE e.ville_id = $1';
      params.push(parseInt(villeId, 10));
    }

    query += ' ORDER BY v.nom, e.nom';

    const result = await pool.query(query, params);
    return NextResponse.json({ etablissements: result.rows });
  } catch (error) {
    console.error('Error fetching etablissements:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des établissements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, villeId } = body;

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de l\'établissement est requis' },
        { status: 400 }
      );
    }

    if (!villeId || typeof villeId !== 'number') {
      return NextResponse.json(
        { error: 'La ville est requise' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO etablissement_visite (nom, ville_id)
       VALUES ($1, $2)
       RETURNING id, nom, ville_id`,
      [nom.trim(), villeId]
    );

    return NextResponse.json({ etablissement: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cet établissement existe déjà dans cette ville' },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Ville introuvable' },
        { status: 404 }
      );
    }
    console.error('Error creating etablissement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'établissement' },
      { status: 500 }
    );
  }
}

