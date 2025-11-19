'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FilterData {
  missionId: number | null;
  villeId: number | null;
  etablissementId: number | null;
  controleurId: number | null;
  voletId: number | null;
}

interface Statistic {
  label: string;
  moyenne: number;
  count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Données de référence
  const [villes, setVilles] = useState<any[]>([]);
  const [etablissements, setEtablissements] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [controleurs, setControleurs] = useState<any[]>([]);
  const [volets, setVolets] = useState<any[]>([]);

  // Filtres
  const [filters, setFilters] = useState<FilterData>({
    missionId: null,
    villeId: null,
    etablissementId: null,
    controleurId: null,
    voletId: null,
  });

  // Statistiques
  const [statsByVille, setStatsByVille] = useState<Statistic[]>([]);
  const [statsByEtablissement, setStatsByEtablissement] = useState<Statistic[]>([]);
  const [statsByVolet, setStatsByVolet] = useState<Statistic[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/auth/me?token=' + token)
      .then((res) => res.json())
      .then((data) => {
        if (data.user && (data.user.role === 'admin' || data.user.role === 'superviseur')) {
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          router.push('/');
        }
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    Promise.all([
      fetch('/api/villes').then((r) => r.json()),
      fetch('/api/missions').then((r) => r.json()),
      fetch('/api/controleurs').then((r) => r.json()),
      fetch('/api/volets').then((r) => r.json()),
    ])
      .then(([villesData, missionsData, controleursData, voletsData]) => {
        setVilles(villesData.villes || []);
        setMissions(missionsData.missions || []);
        setControleurs(controleursData.controleurs || []);
        setVolets(voletsData.volets || []);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        toast.error('Erreur lors du chargement des données');
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (filters.villeId) {
      fetch(`/api/etablissements?villeId=${filters.villeId}`)
        .then((res) => res.json())
        .then((data) => {
          setEtablissements(data.etablissements || []);
        })
        .catch(() => {
          toast.error('Erreur lors du chargement des établissements');
        });
    } else {
      setEtablissements([]);
    }
  }, [filters.villeId]);

  const loadStatistics = useCallback(async () => {
    const token = localStorage.getItem('session_token');
    if (!token) return;

    try {
      const params = new URLSearchParams();
      if (filters.missionId) params.append('missionId', filters.missionId.toString());
      if (filters.villeId) params.append('villeId', filters.villeId.toString());
      if (filters.etablissementId) params.append('etablissementId', filters.etablissementId.toString());
      if (filters.controleurId) params.append('controleurId', filters.controleurId.toString());
      if (filters.voletId) params.append('voletId', filters.voletId.toString());

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setStatsByVille(data.byVille || []);
        setStatsByEtablissement(data.byEtablissement || []);
        setStatsByVolet(data.byVolet || []);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Erreur lors du chargement des statistiques');
    }
  }, [filters]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStatistics();
    }
  }, [loadStatistics, isAuthenticated]);

  const handleExport = async () => {
    const token = localStorage.getItem('session_token');
    if (!token) return;

    try {
      const params = new URLSearchParams();
      if (filters.missionId) params.append('missionId', filters.missionId.toString());
      if (filters.villeId) params.append('villeId', filters.villeId.toString());
      if (filters.etablissementId) params.append('etablissementId', filters.etablissementId.toString());
      if (filters.controleurId) params.append('controleurId', filters.controleurId.toString());
      if (filters.voletId) params.append('voletId', filters.voletId.toString());

      const response = await fetch(`/api/dashboard/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evaluations_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        toast.success('Export réussi!');
      } else {
        toast.error('Erreur lors de l\'export');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
        Dashboard - Synthèse
      </h1>

      {/* Filtres */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title mb-4">Filtres</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Mission</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.missionId || ''}
                onChange={(e) =>
                  setFilters({ ...filters, missionId: e.target.value ? parseInt(e.target.value, 10) : null })
                }
              >
                <option value="">Toutes les missions</option>
                {missions.map((mission) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Ville</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.villeId || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    villeId: e.target.value ? parseInt(e.target.value, 10) : null,
                    etablissementId: null,
                  })
                }
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
                value={filters.etablissementId || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    etablissementId: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                disabled={!filters.villeId}
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
                <span className="label-text">Contrôleur</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.controleurId || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    controleurId: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
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
                value={filters.voletId || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    voletId: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
              >
                <option value="">Tous les volets</option>
                {volets.map((volet) => (
                  <option key={volet.id} value={volet.id}>
                    {volet.libelle}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">&nbsp;</span>
              </label>
              <button
                type="button"
                className="btn btn-accent"
                onClick={handleExport}
              >
                Exporter Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques par Ville */}
      {statsByVille.length > 0 && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Moyennes par Ville</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsByVille}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="moyenne" fill="#00d9ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Statistiques par Établissement */}
      {statsByEtablissement.length > 0 && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Moyennes par Établissement</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Établissement</th>
                    <th>Ville</th>
                    <th>Moyenne</th>
                    <th>Nombre d&apos;évaluations</th>
                  </tr>
                </thead>
                <tbody>
                  {statsByEtablissement.map((stat, idx) => (
                    <tr key={idx}>
                      <td>{stat.label}</td>
                      <td>{stat.label.split(' - ')[1] || ''}</td>
                      <td>{stat.moyenne.toFixed(2)}</td>
                      <td>{stat.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques par Volet */}
      {statsByVolet.length > 0 && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Moyennes par Volet</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsByVolet}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="moyenne" fill="#00d9ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

