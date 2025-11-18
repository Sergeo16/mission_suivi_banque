'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Settings, Users, Building2, Calendar, UserCheck, Shield, BarChart3, Download } from 'lucide-react';

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

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'maintenance' | 'users' | 'referentiels' | 'synthese'>('synthese');
  
  // Données pour les filtres de synthèse
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

  useEffect(() => {
    // Charger les données directement sans authentification
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

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filterVille) params.append('villeId', filterVille.toString());
      if (filterEtablissement) params.append('etablissementId', filterEtablissement.toString());
      if (filterControleur) params.append('controleurId', filterControleur.toString());
      if (filterVolet) params.append('voletId', filterVolet.toString());
      if (filterPeriode) {
        const periode = periodes.find((p) => p.id === filterPeriode);
        if (periode) {
          // Trouver la mission correspondante
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
        throw new Error('Erreur lors de l\'export');
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
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erreur lors de l\'export Excel');
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
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
        Administration
      </h1>

      <div className="tabs tabs-boxed mb-6">
        <button
          type="button"
          className={`tab ${activeTab === 'synthese' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('synthese')}
        >
          <BarChart3 className="mr-2" size={16} />
          Synthèse
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'maintenance' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('maintenance')}
        >
          <Settings className="mr-2" size={16} />
          Maintenance
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'users' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="mr-2" size={16} />
          Utilisateurs
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'referentiels' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('referentiels')}
        >
          <Building2 className="mr-2" size={16} />
          Référentiels
        </button>
      </div>

      {activeTab === 'synthese' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Synthèse des Évaluations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Ville</span>
                </label>
                <select
                  className="select select-bordered"
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
                <label className="label">
                  <span className="label-text">Établissement</span>
                </label>
                <select
                  className="select select-bordered"
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
                <label className="label">
                  <span className="label-text">Période</span>
                </label>
                <select
                  className="select select-bordered"
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
                <label className="label">
                  <span className="label-text">Contrôleur</span>
                </label>
                <select
                  className="select select-bordered"
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
                <label className="label">
                  <span className="label-text">Volet</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filterVolet || ''}
                  onChange={(e) => {
                    const voletId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setFilterVolet(voletId);
                  }}
                >
                  <option value="">Tous les volets</option>
                  {volets.map((volet) => (
                    <option key={volet.id} value={volet.id}>
                      {volet.libelle}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExport}
              >
                <Download className="mr-2" size={16} />
                Exporter
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Mode Maintenance</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg">
                  Statut actuel:{' '}
                  <span className={maintenanceMode ? 'text-error font-bold' : 'text-success font-bold'}>
                    {maintenanceMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                  </span>
                </p>
                <p className="text-sm text-gray-400 mt-2">
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
          <div className="card-body">
            <h2 className="card-title mb-4">Gestion des Utilisateurs</h2>
            <p className="text-gray-400 mb-4">
              Interface de gestion des utilisateurs en cours de développement...
            </p>
            <div className="alert alert-info">
              <Shield size={20} />
              <span>
                Fonctionnalité de gestion des utilisateurs à implémenter :
                création, édition, désactivation, attribution de rôles
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'referentiels' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Gestion des Référentiels</h2>
            <p className="text-gray-400 mb-4">
              Interface de gestion des référentiels en cours de développement...
            </p>
            <div className="space-y-4">
              <div className="alert alert-info">
                <Building2 size={20} />
                <span>Gestion des villes et établissements</span>
              </div>
              <div className="alert alert-info">
                <Calendar size={20} />
                <span>Gestion des missions</span>
              </div>
              <div className="alert alert-info">
                <UserCheck size={20} />
                <span>Gestion des contrôleurs</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

