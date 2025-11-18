import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import * as XLSX from 'xlsx';

// Fonction pour obtenir l'appréciation à partir de la moyenne
function getAppreciation(moyenne: number, bareme: Array<{ note: number; libelle: string }>): string {
  const noteArrondie = Math.round(moyenne);
  const baremeItem = bareme.find((b) => b.note === noteArrondie);
  return baremeItem ? baremeItem.libelle : '';
}

// Fonction pour générer le nom de feuille Excel (max 31 caractères)
function generateSheetName(prefix: string, villeNom: string, etablissementNom: string): string {
  const villePrefix = villeNom.substring(0, 4).toUpperCase();
  // Tronquer l'établissement si nécessaire pour respecter la limite de 31 caractères
  const maxEtabLength = 31 - prefix.length - villePrefix.length - 1; // -1 pour le underscore
  const etabTruncated = etablissementNom.length > maxEtabLength
    ? etablissementNom.substring(0, maxEtabLength)
    : etablissementNom;
  return `${prefix}${villePrefix}_${etabTruncated}`;
}

export async function GET(request: NextRequest) {
  try {
    // Authentification supprimée - accès libre à /admin

    const missionId = request.nextUrl.searchParams.get('missionId');
    const villeId = request.nextUrl.searchParams.get('villeId');
    const etablissementId = request.nextUrl.searchParams.get('etablissementId');
    const controleurId = request.nextUrl.searchParams.get('controleurId');
    const voletId = request.nextUrl.searchParams.get('voletId');

    const pool = getPool();

    // Récupérer le barème
    const baremeResult = await pool.query(
      'SELECT note, libelle FROM bareme ORDER BY note'
    );
    const bareme = baremeResult.rows;

    // Construire les conditions WHERE
    const whereConditions: string[] = [];
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

    const whereClause = whereConditions.length > 0 
      ? whereConditions.join(' AND ')
      : '1=1';

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
      // Déterminer le préfixe selon le volet
      let prefix = '';
      if (volet.code === 'FI') {
        prefix = 'Moy_FI_';
      } else if (volet.code === 'F_QS') {
        prefix = 'Moy_QS_';
      } else if (volet.code === 'F_GAB') {
        prefix = 'Moy_GAB_';
      }

      // Récupérer les rubriques du volet
      const rubriquesResult = await pool.query(
        'SELECT id, numero, libelle FROM rubrique WHERE volet_id = $1 ORDER BY numero',
        [volet.id]
      );
      const rubriques = rubriquesResult.rows;

      // Requête pour les moyennes par Ville et Établissement pour ce volet
      // On groupe par rubrique pour calculer la moyenne de chaque rubrique
      const voletParamIndex = params.length + 1;
      const finalParams = [...params, volet.id];
      
      // D'abord, récupérer toutes les évaluations pour ce volet
      const evaluationsQuery = `
        SELECT 
          v.id as ville_id,
          v.nom as ville_nom,
          et.id as etablissement_id,
          et.nom as etablissement_nom,
          e.rubrique_id,
          e.note
        FROM evaluation e
        JOIN ville v ON e.ville_id = v.id
        JOIN etablissement_visite et ON e.etablissement_visite_id = et.id
        WHERE ${whereClause} AND e.volet_id = $${voletParamIndex}
      `;
      
      const evaluationsResult = await pool.query(evaluationsQuery, finalParams);
      
      // Grouper par (ville_id, etablissement_id) et calculer les moyennes
      const groupedEvaluations: Record<string, {
        ville_id: number;
        ville_nom: string;
        etablissement_id: number;
        etablissement_nom: string;
        rubriques: Record<number, number[]>;
      }> = {};
      
      evaluationsResult.rows.forEach((row) => {
        const key = `${row.ville_id}_${row.etablissement_id}`;
        if (!groupedEvaluations[key]) {
          groupedEvaluations[key] = {
            ville_id: row.ville_id,
            ville_nom: row.ville_nom,
            etablissement_id: row.etablissement_id,
            etablissement_nom: row.etablissement_nom,
            rubriques: {},
          };
        }
        if (!groupedEvaluations[key].rubriques[row.rubrique_id]) {
          groupedEvaluations[key].rubriques[row.rubrique_id] = [];
        }
        groupedEvaluations[key].rubriques[row.rubrique_id].push(row.note);
      });
      
      // Convertir en format pour Excel
      const result = Object.values(groupedEvaluations).map((group) => {
        const row: any = {
          ville_id: group.ville_id,
          ville_nom: group.ville_nom,
          etablissement_id: group.etablissement_id,
          etablissement_nom: group.etablissement_nom,
        };
        
        // Calculer la moyenne pour chaque rubrique
        const allNotes: number[] = [];
        rubriques.forEach((rubrique) => {
          const notes = group.rubriques[rubrique.id] || [];
          const moyenne = notes.length > 0
            ? notes.reduce((sum, n) => sum + n, 0) / notes.length
            : null;
          row[`rubrique_${rubrique.numero}`] = moyenne;
          if (moyenne !== null) {
            allNotes.push(...notes);
          }
        });
        
        // Moyenne globale
        row.moyenne_5 = allNotes.length > 0
          ? allNotes.reduce((sum, n) => sum + n, 0) / allNotes.length
          : 0;
        
        return row;
      });

      // Grouper par combinaison (Ville, Établissement) et créer une feuille par combinaison
      const groupedData: Record<string, any[]> = {};
      result.forEach((row) => {
        const key = `${row.ville_id}_${row.etablissement_id}`;
        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push(row);
      });

      // Créer une feuille pour chaque combinaison (Ville, Établissement)
      for (const [key, rows] of Object.entries(groupedData)) {
        if (rows.length === 0) continue;

        const firstRow = rows[0];
        const sheetName = generateSheetName(prefix, firstRow.ville_nom, firstRow.etablissement_nom);

        // Préparer les données en format array of arrays pour Excel
        const excelRows: any[][] = [];

        // En-tête avec Volet, Ville, Établissement
        excelRows.push(['Volet:', volet.libelle]);
        excelRows.push(['Ville:', firstRow.ville_nom]);
        excelRows.push(['Établissement visité:', firstRow.etablissement_nom]);
        excelRows.push([]); // Ligne vide

        // En-têtes des colonnes
        const headerRow: any[] = [];
        rubriques.forEach((rubrique) => {
          headerRow.push(`Rubrique ${rubrique.numero}`);
        });
        headerRow.push('Moyenne / 5');
        headerRow.push('Observations');
        excelRows.push(headerRow);

        // Données - une ligne avec toutes les moyennes des rubriques
        const dataRow: any[] = [];
        
        // Ajouter les moyennes par rubrique
        rubriques.forEach((rubrique) => {
          const moyenneRubrique = rows[0]?.[`rubrique_${rubrique.numero}`];
          dataRow.push(moyenneRubrique !== null && moyenneRubrique !== undefined
            ? parseFloat(moyenneRubrique.toString()).toFixed(2)
            : '');
        });

        // Moyenne globale
        const moyenneGlobale = parseFloat(rows[0]?.moyenne_5) || 0;
        dataRow.push(moyenneGlobale.toFixed(2));

        // Observations basées sur le barème
        dataRow.push(getAppreciation(moyenneGlobale, bareme));

        excelRows.push(dataRow);

        // Créer la feuille Excel
        const worksheet = XLSX.utils.aoa_to_sheet(excelRows);

        // Ajuster la largeur des colonnes
        // Structure: 2 colonnes pour les en-têtes (label + valeur), puis les rubriques + moyenne + observations
        const numDataCols = rubriques.length + 2; // Rubriques + Moyenne / 5 + Observations
        const maxCols = Math.max(2, numDataCols);
        const colWidths: any[] = [];
        for (let i = 0; i < maxCols; i++) {
          if (i === 0) {
            colWidths.push({ wch: 25 }); // Colonne des labels
          } else if (i === 1) {
            colWidths.push({ wch: 40 }); // Colonne des valeurs pour les en-têtes
          } else {
            colWidths.push({ wch: 15 }); // Colonnes des rubriques, moyenne, observations
          }
        }
        worksheet['!cols'] = colWidths;

        // Ajouter la feuille au classeur
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
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
