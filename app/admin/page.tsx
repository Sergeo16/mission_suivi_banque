'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Settings, Users, Building2, Calendar, UserCheck, Shield, BarChart3, Download, FileText, Trash2, Eye, X } from 'lucide-react';

interface Ville {
  id: number;
  nom: string;
}

interface Etablissement {
  id: number;
  nom: string;
  ville_id: number;
}

interface Periode {
  id: number;
  libelle: string;
  ville_id: number;
}

interface Controleur {
  id: number;
  nom: string;
  prenom: string;
  ville_id: number;
}

interface Volet {
  id: number;
  code: string;
  libelle: string;
}

interface ControleurStat {
  id: number;
  nom: string;
  prenom: string;
  nom_complet: string;
  volets_evalues?: number;
  derniere_evaluation?: string;
  derniere_soumission?: string;
}

interface ControleursStats {
  total: number;
  avec_evaluations: {
    nombre: number;
    controleurs: ControleurStat[];
  };
  sans_evaluations: {
    nombre: number;
    controleurs: ControleurStat[];
  };
}

interface RubriqueEvaluation {
  rubrique_id: number;
  numero: number;
  libelle: string;
  composante_evaluee: string | null;
  criteres_indicateurs: string | null;
  mode_verification: string | null;
  note: number;
  commentaire: string | null;
  date_evaluation: string;
  created_at: string;
}

interface EvaluationDetail {
  evaluation: {
    controleur_nom: string;
    ville_nom: string;
    etablissement_nom: string;
    volet_libelle: string;
    periode_libelle: string;
    date_evaluation: string;
    date_soumission: string;
  } | null;
  rubriques: RubriqueEvaluation[];
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'synthese' | 'controleurs' | 'evaluations' | 'maintenance' | 'users' | 'referentiels'>('synthese');

  // Fonction helper pour récupérer le token d'authentification
  const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('session_token');
    }
    return null;
  };

  // Fonction helper pour créer les headers avec authentification
  const getAuthHeaders = (): HeadersInit => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };
  
  // Données pour les filtres
  const [villes, setVilles] = useState<Ville[]>([]);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [controleurs, setControleurs] = useState<Controleur[]>([]);
  const [volets, setVolets] = useState<Volet[]>([]);
  
  // Filtres de synthèse
  const [filterVille, setFilterVille] = useState<number | null>(null);
  const [filterEtablissement, setFilterEtablissement] = useState<number | null>(null);
  const [filterPeriode, setFilterPeriode] = useState<number | null>(null);
  const [filterControleur, setFilterControleur] = useState<number | null>(null);
  const [filterVolet, setFilterVolet] = useState<number | null>(null);
  const [isUpdatingRubriques, setIsUpdatingRubriques] = useState(false);

  // Statistiques contrôleurs
  const [controleursStats, setControleursStats] = useState<ControleursStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showControleursAvecEvaluations, setShowControleursAvecEvaluations] = useState(true);
  const [showControleursSansEvaluations, setShowControleursSansEvaluations] = useState(true);

  // Évaluation détaillée
  const [evaluationDetail, setEvaluationDetail] = useState<EvaluationDetail | null>(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  useEffect(() => {
    loadMaintenanceStatus();
    loadSyntheseData();
    setIsLoading(false);
  }, []);

  const loadSyntheseData = async () => {
    try {
      const [villesRes, voletsRes] = await Promise.all([
        fetch('/api/villes').then((r) => r.json()),
        fetch('/api/volets').then((r) => r.json()),
      ]);
      setVilles(villesRes.villes || []);
      setVolets(voletsRes.volets || []);
    } catch (error) {
      console.error('Error loading synthese data:', error);
    }
  };

  useEffect(() => {
    if (filterVille) {
      Promise.all([
        fetch(`/api/etablissements?villeId=${filterVille}`).then((r) => r.json()),
        fetch(`/api/controleurs?villeId=${filterVille}`).then((r) => r.json()),
        fetch(`/api/periodes?villeId=${filterVille}`).then((r) => r.json()),
      ])
        .then(([etabData, controleursData, periodesData]) => {
          setEtablissements(etabData.etablissements || []);
          setControleurs(controleursData.controleurs || []);
          setPeriodes(periodesData.periodes || []);
        })
        .catch((error) => {
          console.error('Error loading filter data:', error);
        });
    } else {
      setEtablissements([]);
      setControleurs([]);
      setPeriodes([]);
    }
  }, [filterVille]);

  // Charger les statistiques contrôleurs
  useEffect(() => {
    if (activeTab === 'controleurs' && filterVille && filterEtablissement && filterPeriode && filterVolet) {
      loadControleursStats();
    } else if (activeTab === 'controleurs' && filterVille && filterEtablissement && filterPeriode && !filterVolet) {
      // Réinitialiser les stats si le volet est désélectionné
      setControleursStats(null);
    }
  }, [activeTab, filterVille, filterEtablissement, filterPeriode, filterVolet]);

  const loadControleursStats = async () => {
    if (!filterVille || !filterEtablissement || !filterPeriode || !filterVolet) {
      return;
    }

    setLoadingStats(true);
    try {
      const params = new URLSearchParams();
      params.append('villeId', filterVille.toString());
      params.append('etablissementId', filterEtablissement.toString());
      params.append('periodeId', filterPeriode.toString());
      params.append('voletId', filterVolet.toString());

      const response = await fetch(`/api/admin/controleurs-stats?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}: ${response.statusText}`);
      }
      setControleursStats(data);
      
      // Afficher un toast si aucun contrôleur n'a soumis d'évaluation
      if (data.avec_evaluations.nombre === 0 && data.total > 0) {
        toast.info(`Aucun contrôleur n'a encore soumis d'évaluation pour cette combinaison (Ville, Établissement, Période, Volet). ${data.total} contrôleur(s) de cette ville n'ont pas encore soumis.`);
      } else if (data.total === 0) {
        toast.warning('Aucun contrôleur trouvé pour cette ville.');
      }
    } catch (error: any) {
      console.error('Error loading controleurs stats:', error);
      toast.error(error.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadEvaluationDetail = async () => {
    if (!filterControleur || !filterVolet || !filterPeriode || !filterEtablissement || !filterVille) {
      toast.error('Veuillez sélectionner tous les filtres nécessaires (Ville, Établissement, Période, Contrôleur, Volet)');
      return;
    }

    setLoadingEvaluation(true);
    try {
      const params = new URLSearchParams();
      params.append('controleurId', filterControleur.toString());
      params.append('voletId', filterVolet.toString());
      params.append('periodeId', filterPeriode.toString());
      params.append('etablissementId', filterEtablissement.toString());
      params.append('villeId', filterVille.toString());

      const response = await fetch(`/api/admin/evaluations?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}: ${response.statusText}. Vérifiez que l'évaluation existe pour cette combinaison de filtres.`);
      }
      if (!data.evaluation || data.rubriques.length === 0) {
        throw new Error('Aucune évaluation trouvée pour cette combinaison de filtres (Ville, Établissement, Période, Contrôleur, Volet)');
      }
      setEvaluationDetail(data);
      setShowEvaluationModal(true);
    } catch (error: any) {
      console.error('Error loading evaluation detail:', error);
      toast.error(error.message || 'Erreur lors du chargement de l\'évaluation');
    } finally {
      setLoadingEvaluation(false);
    }
  };

  const handleDeleteEvaluation = async (deleteAll: boolean = false) => {
    if (deleteAll) {
      if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUTES les évaluations ? Cette action est irréversible.')) {
        return;
      }
    } else {
      if (!filterControleur || !filterVolet || !filterPeriode || !filterEtablissement || !filterVille) {
        toast.error('Veuillez sélectionner tous les filtres nécessaires');
        return;
      }
      if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action est irréversible.')) {
        return;
      }
    }

    try {
      const params = new URLSearchParams();
      if (deleteAll) {
        params.append('deleteAll', 'true');
      } else {
        params.append('controleurId', filterControleur!.toString());
        params.append('voletId', filterVolet!.toString());
        params.append('periodeId', filterPeriode!.toString());
        params.append('etablissementId', filterEtablissement!.toString());
        params.append('villeId', filterVille!.toString());
      }

      const response = await fetch(`/api/admin/evaluations?${params.toString()}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}: ${response.statusText}. ${deleteAll ? 'Impossible de supprimer toutes les évaluations.' : 'Impossible de supprimer cette évaluation. Vérifiez que l\'évaluation existe.'}`);
      }

      toast.success(data.message || 'Évaluation(s) supprimée(s) avec succès');
      
      // Recharger les statistiques si nécessaire
      if (activeTab === 'controleurs') {
        loadControleursStats();
      }
      if (showEvaluationModal) {
        setShowEvaluationModal(false);
        setEvaluationDetail(null);
      }
    } catch (error: any) {
      console.error('Error deleting evaluation:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleExportEvaluation = async () => {
    if (!evaluationDetail || !evaluationDetail.evaluation) {
      toast.error('Aucune évaluation à exporter. Veuillez d\'abord charger une évaluation.');
      return;
    }

    try {
      // Créer un fichier Excel avec les données de l'évaluation
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      const worksheetData = [
        ['Contrôleur', evaluationDetail.evaluation.controleur_nom],
        ['Ville', evaluationDetail.evaluation.ville_nom],
        ['Établissement', evaluationDetail.evaluation.etablissement_nom],
        ['Volet', evaluationDetail.evaluation.volet_libelle],
        ['Période', evaluationDetail.evaluation.periode_libelle],
        ['Date d\'évaluation', new Date(evaluationDetail.evaluation.date_evaluation).toLocaleDateString('fr-FR')],
        ['Date de soumission', new Date(evaluationDetail.evaluation.date_soumission).toLocaleDateString('fr-FR')],
        [],
        ['Numéro', 'Libellé', 'Composante évaluée', 'Critères / Indicateurs', 'Mode de vérification', 'Note', 'Commentaire'],
        ...evaluationDetail.rubriques.map((r) => [
          r.numero,
          r.libelle,
          r.composante_evaluee || '',
          r.criteres_indicateurs || '',
          r.mode_verification || '',
          r.note,
          r.commentaire || '',
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Évaluation');

      const fileName = `evaluation_${evaluationDetail.evaluation.controleur_nom.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Export Excel généré avec succès.');
    } catch (error: any) {
      console.error('Error exporting evaluation:', error);
      toast.error(error.message || 'Erreur lors de l\'export Excel. Vérifiez que toutes les données nécessaires sont disponibles.');
    }
  };

  const handleExport = async () => {
    if (!filterVolet) {
      toast.error('Veuillez sélectionner un volet avant d\'exporter');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filterVille) params.append('villeId', filterVille.toString());
      if (filterEtablissement) params.append('etablissementId', filterEtablissement.toString());
      if (filterControleur) params.append('controleurId', filterControleur.toString());
      params.append('voletId', filterVolet.toString());
      if (filterPeriode) {
        const periode = periodes.find((p) => p.id === filterPeriode);
        if (periode) {
          const missionRes = await fetch('/api/missions');
          const missionData = await missionRes.json();
          const mission = missionData.missions?.find(
            (m: any) => m.date_debut === periode.libelle.split(' ')[1]?.replace(/\//g, '-')
          );
          if (mission) params.append('missionId', mission.id.toString());
        }
      }

      const response = await fetch(`/api/dashboard/export?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}. Vérifiez que le volet est sélectionné et qu'il existe des données à exporter.`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluations_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export Excel généré avec succès.');
    } catch (error: any) {
      console.error('Error exporting:', error);
      toast.error(error.message || 'Erreur lors de l\'export Excel');
    }
  };

  const handleUpdateRubriques = async () => {
    setIsUpdatingRubriques(true);
    try {
      const response = await fetch('/api/admin/update-rubriques', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      if (data.skipped) {
        toast.info(data.message);
      } else {
        toast.success(data.message || `✅ ${data.updated} rubriques mises à jour avec succès`);
      }
    } catch (error: any) {
      console.error('Error updating rubriques:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour des rubriques');
    } finally {
      setIsUpdatingRubriques(false);
    }
  };

  const loadMaintenanceStatus = async () => {
    try {
      const response = await fetch('/api/maintenance');
      const data = await response.json();
      setMaintenanceMode(data.enabled || false);
    } catch (error) {
      console.error('Error loading maintenance status:', error);
    }
  };

  const toggleMaintenance = async () => {
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !maintenanceMode }),
      });

      const data = await response.json();
      if (response.ok) {
        setMaintenanceMode(data.enabled);
        toast.success(
          data.enabled
            ? 'Mode maintenance activé'
            : 'Mode maintenance désactivé'
        );
      } else {
        toast.error(data.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">
        Administration
      </h1>

      <div className="tabs tabs-boxed mb-4 sm:mb-6 overflow-x-auto">
        <button
          type="button"
          className={`tab ${activeTab === 'synthese' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('synthese')}
        >
          <BarChart3 className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Synthèse</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'controleurs' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('controleurs')}
        >
          <UserCheck className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Contrôleurs</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'evaluations' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('evaluations')}
        >
          <FileText className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Évaluations</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'maintenance' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('maintenance')}
        >
          <Settings className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Maintenance</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'users' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Utilisateurs</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'referentiels' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('referentiels')}
        >
          <Building2 className="mr-1 sm:mr-2" size={16} />
          <span className="hidden sm:inline">Référentiels</span>
        </button>
      </div>

      {activeTab === 'synthese' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="card-title text-lg sm:text-xl">Synthèse des Évaluations</h2>
              <button
                type="button"
                className="px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                onClick={handleExport}
                disabled={!filterVolet}
              >
                <Download className="inline mr-2" size={16} />
                Exporter
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Ville</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterVille || ''}
                  onChange={(e) => {
                    const villeId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterVille(villeId);
                    setFilterEtablissement(null);
                    setFilterPeriode(null);
                    setFilterControleur(null);
                  }}
                >
                  <option value="">Toutes les villes</option>
                  {villes.map((ville) => (
                    <option key={ville.id} value={ville.id}>
                      {ville.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Établissement</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterEtablissement || ''}
                  onChange={(e) => {
                    const etabId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterEtablissement(etabId);
                  }}
                  disabled={!filterVille}
                >
                  <option value="">Tous les établissements</option>
                  {etablissements.map((etab) => (
                    <option key={etab.id} value={etab.id}>
                      {etab.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Période</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterPeriode || ''}
                  onChange={(e) => {
                    const periodeId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterPeriode(periodeId);
                  }}
                  disabled={!filterVille}
                >
                  <option value="">Toutes les périodes</option>
                  {periodes.map((periode) => (
                    <option key={periode.id} value={periode.id}>
                      {periode.libelle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Contrôleur</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterControleur || ''}
                  onChange={(e) => {
                    const controleurId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterControleur(controleurId);
                  }}
                  disabled={!filterVille}
                >
                  <option value="">Tous les contrôleurs</option>
                  {controleurs.map((controleur) => (
                    <option key={controleur.id} value={controleur.id}>
                      {controleur.nom} {controleur.prenom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label py-1 sm:py-2">
                  <span className="label-text text-sm sm:text-base">Volet *</span>
                </label>
                <select
                  className="select select-bordered text-sm sm:text-base"
                  value={filterVolet || ''}
                  onChange={(e) => {
                    const voletId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterVolet(voletId);
                  }}
                  required
                >
                  <option value="">Sélectionner un volet</option>
                  {volets.map((volet) => (
                    <option key={volet.id} value={volet.id}>
                      {volet.libelle}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <div className="alert alert-info text-xs sm:text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5 sm:w-6 sm:h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <div className="font-bold">Données des rubriques</div>
                  <div>Si les colonnes &quot;Critères / Indicateurs&quot; et &quot;Mode de vérification&quot; sont vides dans l&apos;export, cliquez sur le bouton ci-dessous pour charger les données depuis synthese.xlsx</div>
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  className="btn btn-outline text-sm sm:text-base"
                  onClick={handleUpdateRubriques}
                  disabled={isUpdatingRubriques}
                >
                  {isUpdatingRubriques ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Chargement...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2" size={16} />
                      Charger les données des rubriques
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'controleurs' && (
        <div className="space-y-4">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title mb-4 text-lg sm:text-xl">Statistiques des Contrôleurs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Ville *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterVille || ''}
                    onChange={(e) => {
                      const villeId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterVille(villeId);
                      setFilterEtablissement(null);
                      setFilterPeriode(null);
                    }}
                  >
                    <option value="">Sélectionner une ville</option>
                    {villes.map((ville) => (
                      <option key={ville.id} value={ville.id}>
                        {ville.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Établissement *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterEtablissement || ''}
                    onChange={(e) => {
                      const etabId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterEtablissement(etabId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner un établissement</option>
                    {etablissements.map((etab) => (
                      <option key={etab.id} value={etab.id}>
                        {etab.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Période *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterPeriode || ''}
                    onChange={(e) => {
                      const periodeId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterPeriode(periodeId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner une période</option>
                    {periodes.map((periode) => (
                      <option key={periode.id} value={periode.id}>
                        {periode.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Volet *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterVolet || ''}
                    onChange={(e) => {
                      const voletId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterVolet(voletId);
                    }}
                    required
                  >
                    <option value="">Sélectionner un volet</option>
                    {volets.map((volet) => (
                      <option key={volet.id} value={volet.id}>
                        {volet.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loadingStats ? (
            <div className="flex justify-center items-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : controleursStats ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body p-4 sm:p-6">
                <div className="stats stats-vertical sm:stats-horizontal shadow w-full mb-4">
                  <div className="stat">
                    <div className="stat-title text-xs sm:text-sm">Total</div>
                    <div className="stat-value text-2xl sm:text-3xl">{controleursStats.total}</div>
                    <div className="stat-desc text-xs sm:text-sm">Contrôleurs</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-xs sm:text-sm">Avec évaluations</div>
                    <div className="stat-value text-2xl sm:text-3xl text-success">{controleursStats.avec_evaluations.nombre}</div>
                    <div className="stat-desc text-xs sm:text-sm">Contrôleurs</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-xs sm:text-sm">Sans évaluations</div>
                    <div className="stat-value text-2xl sm:text-3xl text-error">{controleursStats.sans_evaluations.nombre}</div>
                    <div className="stat-desc text-xs sm:text-sm">Contrôleurs</div>
                  </div>
                </div>

                {controleursStats.avec_evaluations.nombre > 0 && (
                  <div className="mb-4">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost mb-2"
                      onClick={() => setShowControleursAvecEvaluations(!showControleursAvecEvaluations)}
                    >
                      {showControleursAvecEvaluations ? 'Masquer' : 'Afficher'} les contrôleurs ayant soumis ({controleursStats.avec_evaluations.nombre})
                    </button>
                    {showControleursAvecEvaluations && (
                      <div className="overflow-x-auto">
                        <table className="table table-zebra w-full text-xs sm:text-sm">
                          <thead>
                            <tr>
                              <th>Nom</th>
                              <th className="hidden sm:table-cell">Volets évalués</th>
                              <th className="hidden md:table-cell">Dernière soumission</th>
                            </tr>
                          </thead>
                          <tbody>
                            {controleursStats.avec_evaluations.controleurs.map((c) => (
                              <tr key={c.id}>
                                <td>{c.nom_complet}</td>
                                <td className="hidden sm:table-cell">{c.volets_evalues || 0}</td>
                                <td className="hidden md:table-cell">
                                  {c.derniere_soumission ? new Date(c.derniere_soumission).toLocaleDateString('fr-FR') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {controleursStats.sans_evaluations.nombre > 0 && (
                  <div>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost mb-2"
                      onClick={() => setShowControleursSansEvaluations(!showControleursSansEvaluations)}
                    >
                      {showControleursSansEvaluations ? 'Masquer' : 'Afficher'} les contrôleurs n&apos;ayant pas soumis ({controleursStats.sans_evaluations.nombre})
                    </button>
                    {showControleursSansEvaluations && (
                      <div className="overflow-x-auto">
                        <table className="table table-zebra w-full text-xs sm:text-sm">
                          <thead>
                            <tr>
                              <th>Nom</th>
                            </tr>
                          </thead>
                          <tbody>
                            {controleursStats.sans_evaluations.controleurs.map((c) => (
                              <tr key={c.id}>
                                <td>{c.nom_complet}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <span>Sélectionnez une ville, un établissement, une période et un volet pour voir les statistiques</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title mb-4 text-lg sm:text-xl">Évaluation Détaillée</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Ville *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterVille || ''}
                    onChange={(e) => {
                      const villeId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterVille(villeId);
                      setFilterEtablissement(null);
                      setFilterPeriode(null);
                      setFilterControleur(null);
                    }}
                  >
                    <option value="">Sélectionner une ville</option>
                    {villes.map((ville) => (
                      <option key={ville.id} value={ville.id}>
                        {ville.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Établissement *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterEtablissement || ''}
                    onChange={(e) => {
                      const etabId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterEtablissement(etabId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner un établissement</option>
                    {etablissements.map((etab) => (
                      <option key={etab.id} value={etab.id}>
                        {etab.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Période *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterPeriode || ''}
                    onChange={(e) => {
                      const periodeId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterPeriode(periodeId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner une période</option>
                    {periodes.map((periode) => (
                      <option key={periode.id} value={periode.id}>
                        {periode.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Contrôleur *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterControleur || ''}
                    onChange={(e) => {
                      const controleurId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterControleur(controleurId);
                    }}
                    disabled={!filterVille}
                  >
                    <option value="">Sélectionner un contrôleur</option>
                    {controleurs.map((controleur) => (
                      <option key={controleur.id} value={controleur.id}>
                        {controleur.nom} {controleur.prenom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label py-1 sm:py-2">
                    <span className="label-text text-sm sm:text-base">Volet *</span>
                  </label>
                  <select
                    className="select select-bordered text-sm sm:text-base"
                    value={filterVolet || ''}
                    onChange={(e) => {
                      const voletId = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFilterVolet(voletId);
                    }}
                  >
                    <option value="">Sélectionner un volet</option>
                    {volets.map((volet) => (
                      <option key={volet.id} value={volet.id}>
                        {volet.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  onClick={loadEvaluationDetail}
                  disabled={loadingEvaluation || !filterControleur || !filterVolet || !filterPeriode || !filterEtablissement || !filterVille}
                >
                  {loadingEvaluation ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Chargement...
                    </>
                  ) : (
                    <>
                      <Eye className="inline mr-2" size={16} />
                      Voir l&apos;évaluation
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  onClick={() => handleDeleteEvaluation(false)}
                  disabled={!filterControleur || !filterVolet || !filterPeriode || !filterEtablissement || !filterVille}
                >
                  <Trash2 className="inline mr-2" size={16} />
                  Supprimer cette évaluation
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title mb-4 text-lg sm:text-xl text-error">Zone de danger</h2>
              <p className="text-sm sm:text-base mb-4">Supprimer toutes les évaluations (action irréversible)</p>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => handleDeleteEvaluation(true)}
              >
                <Trash2 className="mr-2" size={16} />
                Supprimer toutes les évaluations
              </button>
            </div>
          </div>
        </div>
      )}

      {showEvaluationModal && evaluationDetail && evaluationDetail.evaluation && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg sm:text-xl">Évaluation détaillée</h3>
              <button
                type="button"
                className="btn btn-sm btn-circle"
                onClick={() => {
                  setShowEvaluationModal(false);
                  setEvaluationDetail(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm sm:text-base">
                <div>
                  <span className="font-bold">Contrôleur:</span> {evaluationDetail.evaluation.controleur_nom}
                </div>
                <div>
                  <span className="font-bold">Ville:</span> {evaluationDetail.evaluation.ville_nom}
                </div>
                <div>
                  <span className="font-bold">Établissement:</span> {evaluationDetail.evaluation.etablissement_nom}
                </div>
                <div>
                  <span className="font-bold">Volet:</span> {evaluationDetail.evaluation.volet_libelle}
                </div>
                <div>
                  <span className="font-bold">Période:</span> {evaluationDetail.evaluation.periode_libelle}
                </div>
                <div>
                  <span className="font-bold">Date d&apos;évaluation:</span>{' '}
                  {new Date(evaluationDetail.evaluation.date_evaluation).toLocaleDateString('fr-FR')}
                </div>
                <div className="sm:col-span-2">
                  <span className="font-bold">Date de soumission:</span>{' '}
                  {new Date(evaluationDetail.evaluation.date_soumission).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="divider"></div>

              <div className="overflow-x-auto">
                <table className="table table-zebra w-full text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Libellé</th>
                      <th className="hidden md:table-cell">Composante</th>
                      <th className="hidden lg:table-cell">Critères</th>
                      <th className="hidden lg:table-cell">Mode vérif.</th>
                      <th>Note</th>
                      <th className="hidden sm:table-cell">Commentaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationDetail.rubriques.map((r) => (
                      <tr key={r.rubrique_id}>
                        <td>{r.numero}</td>
                        <td className="max-w-xs truncate">{r.libelle}</td>
                        <td className="hidden md:table-cell max-w-xs truncate">{r.composante_evaluee || '-'}</td>
                        <td className="hidden lg:table-cell max-w-xs truncate">{r.criteres_indicateurs || '-'}</td>
                        <td className="hidden lg:table-cell max-w-xs truncate">{r.mode_verification || '-'}</td>
                        <td className="font-bold">{r.note}</td>
                        <td className="hidden sm:table-cell max-w-xs truncate">{r.commentaire || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm sm:text-base"
                  onClick={handleExportEvaluation}
                >
                  <Download className="inline mr-2" size={16} />
                  Exporter en Excel
                </button>
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors text-sm sm:text-base"
                  onClick={() => handleDeleteEvaluation(false)}
                >
                  <Trash2 className="inline mr-2" size={16} />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowEvaluationModal(false);
            setEvaluationDetail(null);
          }}></div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4 text-lg sm:text-xl">Mode Maintenance</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-base sm:text-lg">
                  Statut actuel:{' '}
                  <span className={maintenanceMode ? 'text-error font-bold' : 'text-success font-bold'}>
                    {maintenanceMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                  </span>
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">
                  En mode maintenance, seuls les administrateurs peuvent accéder à la plateforme.
                </p>
              </div>
              <button
                type="button"
                className={`btn ${maintenanceMode ? 'btn-error' : 'btn-success'}`}
                onClick={toggleMaintenance}
              >
                {maintenanceMode ? 'Désactiver' : 'Activer'} la maintenance
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4 text-lg sm:text-xl">Gestion des Utilisateurs</h2>
            <p className="text-sm sm:text-base text-gray-400 mb-4">
              Interface de gestion des utilisateurs en cours de développement...
            </p>
            <div className="alert alert-info">
              <Shield size={20} />
              <span className="text-xs sm:text-sm">
                Fonctionnalité de gestion des utilisateurs à implémenter :
                création, édition, désactivation, attribution de rôles
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'referentiels' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4 text-lg sm:text-xl">Gestion des Référentiels</h2>
            <p className="text-sm sm:text-base text-gray-400 mb-4">
              Interface de gestion des référentiels en cours de développement...
            </p>
            <div className="space-y-4">
              <div className="alert alert-info">
                <Building2 size={20} />
                <span className="text-xs sm:text-sm">Gestion des villes et établissements</span>
              </div>
              <div className="alert alert-info">
                <Calendar size={20} />
                <span className="text-xs sm:text-sm">Gestion des missions</span>
              </div>
              <div className="alert alert-info">
                <UserCheck size={20} />
                <span className="text-xs sm:text-sm">Gestion des contrôleurs</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
