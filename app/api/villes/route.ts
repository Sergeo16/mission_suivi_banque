import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, nom FROM ville ORDER BY nom'
    );

    return NextResponse.json({ villes: result.rows });
  } catch (error) {
    console.error('Error fetching villes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des villes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom } = body;

    if (!nom || typeof nom !== 'string' || nom.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de la ville est requis' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      'INSERT INTO ville (nom) VALUES ($1) RETURNING id, nom',
      [nom.trim()]
    );

    return NextResponse.json({ ville: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cette ville existe déjà' },
        { status: 409 }
      );
    }
    console.error('Error creating ville:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la ville' },
      { status: 500 }
    );
  }
}

