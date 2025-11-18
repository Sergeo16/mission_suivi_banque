import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionByToken, getUserById } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalide' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.userId);
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Utilisateur invalide' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin' && user.role !== 'superviseur') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    const missionId = request.nextUrl.searchParams.get('missionId');
    const villeId = request.nextUrl.searchParams.get('villeId');
    const etablissementId = request.nextUrl.searchParams.get('etablissementId');
    const controleurId = request.nextUrl.searchParams.get('controleurId');
    const voletId = request.nextUrl.searchParams.get('voletId');

    const pool = getPool();

    // Construire les conditions WHERE
    let whereConditions = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (missionId) {
      whereConditions.push(`e.mission_id = $${paramIndex}`);
      params.push(parseInt(missionId, 10));
      paramIndex++;
    }
    if (villeId) {
      whereConditions.push(`e.ville_id = $${paramIndex}`);
      params.push(parseInt(villeId, 10));
      paramIndex++;
    }
    if (etablissementId) {
      whereConditions.push(`e.etablissement_visite_id = $${paramIndex}`);
      params.push(parseInt(etablissementId, 10));
      paramIndex++;
    }
    if (controleurId) {
      whereConditions.push(`e.controleur_id = $${paramIndex}`);
      params.push(parseInt(controleurId, 10));
      paramIndex++;
    }
    if (voletId) {
      whereConditions.push(`er.volet_id = $${paramIndex}`);
      params.push(parseInt(voletId, 10));
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Moyennes par Ville
    const byVilleQuery = `
      SELECT 
        v.nom as label,
        ROUND(AVG(er.note)::numeric, 2) as moyenne,
        COUNT(DISTINCT e.id) as count
      FROM evaluation e
      JOIN evaluation_rubrique er ON e.id = er.evaluation_id
      JOIN ville v ON e.ville_id = v.id
      WHERE ${whereClause}
      GROUP BY v.id, v.nom
      ORDER BY moyenne DESC
    `;

    // Moyennes par Établissement
    const byEtablissementQuery = `
      SELECT 
        (et.nom || ' - ' || v.nom) as label,
        ROUND(AVG(er.note)::numeric, 2) as moyenne,
        COUNT(DISTINCT e.id) as count
      FROM evaluation e
      JOIN evaluation_rubrique er ON e.id = er.evaluation_id
      JOIN etablissement_visite et ON e.etablissement_visite_id = et.id
      JOIN ville v ON e.ville_id = v.id
      WHERE ${whereClause}
      GROUP BY et.id, et.nom, v.nom
      ORDER BY moyenne DESC
    `;

    // Moyennes par Volet
    const byVoletQuery = `
      SELECT 
        vo.libelle as label,
        ROUND(AVG(er.note)::numeric, 2) as moyenne,
        COUNT(DISTINCT e.id) as count
      FROM evaluation e
      JOIN evaluation_rubrique er ON e.id = er.evaluation_id
      JOIN volet vo ON er.volet_id = vo.id
      WHERE ${whereClause}
      GROUP BY vo.id, vo.libelle
      ORDER BY vo.ordre
    `;

    const [byVilleResult, byEtablissementResult, byVoletResult] = await Promise.all([
      pool.query(byVilleQuery, params),
      pool.query(byEtablissementQuery, params),
      pool.query(byVoletQuery, params),
    ]);

    return NextResponse.json({
      byVille: byVilleResult.rows.map((row) => ({
        label: row.label,
        moyenne: parseFloat(row.moyenne),
        count: parseInt(row.count, 10),
      })),
      byEtablissement: byEtablissementResult.rows.map((row) => ({
        label: row.label,
        moyenne: parseFloat(row.moyenne),
        count: parseInt(row.count, 10),
      })),
      byVolet: byVoletResult.rows.map((row) => ({
        label: row.label,
        moyenne: parseFloat(row.moyenne),
        count: parseInt(row.count, 10),
      })),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}

