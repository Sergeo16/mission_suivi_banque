import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT note, libelle, description FROM bareme ORDER BY note'
    );

    return NextResponse.json({ bareme: result.rows });
  } catch (error) {
    console.error('Error fetching bareme:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du barème' },
      { status: 500 }
    );
  }
}

