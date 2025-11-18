import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const villeId = request.nextUrl.searchParams.get('villeId');
    const pool = getPool();

    let query = `
      SELECT id, nom, prenom, ville_id
      FROM controleur
    `;
    const params: any[] = [];

    if (villeId) {
      query += ' WHERE ville_id = $1';
      params.push(parseInt(villeId, 10));
    }

    query += ' ORDER BY nom, prenom';

    const result = await pool.query(query, params);
    return NextResponse.json({ controleurs: result.rows });
  } catch (error) {
    console.error('Error fetching controleurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des contrôleurs' },
      { status: 500 }
    );
  }
}
