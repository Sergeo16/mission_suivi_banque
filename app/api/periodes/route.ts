import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const villeId = request.nextUrl.searchParams.get('villeId');
    const pool = getPool();

    if (villeId) {
      const result = await pool.query(
        'SELECT id, libelle, date_debut, date_fin FROM periode WHERE ville_id = $1 ORDER BY date_debut',
        [parseInt(villeId, 10)]
      );
      return NextResponse.json({ periodes: result.rows });
    }

    const result = await pool.query(
      'SELECT id, ville_id, libelle, date_debut, date_fin FROM periode ORDER BY ville_id, date_debut'
    );
    return NextResponse.json({ periodes: result.rows });
  } catch (error) {
    console.error('Error fetching periodes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des périodes' },
      { status: 500 }
    );
  }
}

