import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSessionByToken, getUserById } from '@/lib/auth';
import * as XLSX from 'xlsx';

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

    const whereClause = whereConditions.join(' AND ');

    // Récupérer les volets
    const voletsResult = await pool.query(
      'SELECT id, code, libelle, ordre FROM volet ORDER BY ordre'
    );
    const volets = voletId
      ? voletsResult.rows.filter((v) => v.id === parseInt(voletId, 10))
      : voletsResult.rows;

    // Créer un classeur Excel
    const workbook = XLSX.utils.book_new();

    for (const volet of volets) {
      // Récupérer les rubriques du volet
      const rubriquesResult = await pool.query(
        'SELECT id, numero, libelle FROM rubrique WHERE volet_id = $1 ORDER BY numero',
        [volet.id]
      );
      const rubriques = rubriquesResult.rows;

      // Requête pour les moyennes par Ville et Établissement pour ce volet
      const voletParamIndex = params.length + 1;
      const query = `
        SELECT 
          v.nom as ville_nom,
          et.nom as etablissement_nom,
          m.nom as mission_nom,
          m.date_debut,
          m.date_fin,
          c.nom as controleur_nom,
          c.prenom as controleur_prenom,
          ${rubriques
            .map(
              (r, idx) =>
                `ROUND(AVG(CASE WHEN er.rubrique_id = ${r.id} THEN er.note END)::numeric, 2) as rubrique_${r.numero}`
            )
            .join(',\n          ')}
          ROUND(AVG(er.note)::numeric, 2) as moyenne_globale,
          COUNT(DISTINCT e.id) as nombre_evaluations
        FROM evaluation e
        JOIN evaluation_rubrique er ON e.id = er.evaluation_id
        JOIN ville v ON e.ville_id = v.id
        JOIN etablissement_visite et ON e.etablissement_visite_id = et.id
        JOIN mission m ON e.mission_id = m.id
        JOIN controleur c ON e.controleur_id = c.id
        WHERE ${whereClause} AND er.volet_id = $${voletParamIndex}
        GROUP BY v.id, v.nom, et.id, et.nom, m.id, m.nom, m.date_debut, m.date_fin, c.id, c.nom, c.prenom
        ORDER BY v.nom, et.nom
      `;

      const finalParams = [...params, volet.id];
      const result = await pool.query(query, finalParams);

      // Préparer les données pour Excel
      const excelData = result.rows.map((row) => {
        const rowData: any = {
          Mission: row.mission_nom,
          'Date début': row.date_debut,
          'Date fin': row.date_fin,
          Ville: row.ville_nom,
          'Établissement': row.etablissement_nom,
          'Contrôleur': `${row.controleur_nom} ${row.controleur_prenom}`,
        };

        // Ajouter les colonnes pour chaque rubrique
        rubriques.forEach((rubrique) => {
          const colName = `Rubrique ${rubrique.numero}`;
          rowData[colName] = row[`rubrique_${rubrique.numero}`] || '';
        });

        rowData['Moyenne globale'] = parseFloat(row.moyenne_globale) || 0;
        rowData['Nombre d\'évaluations'] = parseInt(row.nombre_evaluations, 10);

        return rowData;
      });

      // Créer une feuille Excel
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Ajuster la largeur des colonnes
      const colWidths = [
        { wch: 20 }, // Mission
        { wch: 12 }, // Date début
        { wch: 12 }, // Date fin
        { wch: 20 }, // Ville
        { wch: 25 }, // Établissement
        { wch: 25 }, // Contrôleur
        ...rubriques.map(() => ({ wch: 15 })), // Rubriques
        { wch: 15 }, // Moyenne globale
        { wch: 20 }, // Nombre d'évaluations
      ];
      worksheet['!cols'] = colWidths;

      // Ajouter la feuille au classeur avec le nom du volet
      XLSX.utils.book_append_sheet(workbook, worksheet, volet.code);
    }

    // Générer le buffer Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Retourner le fichier Excel
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="evaluations_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'export Excel' },
      { status: 500 }
    );
  }
}

