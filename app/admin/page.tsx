'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Settings, Users, Building2, Calendar, UserCheck, Shield } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'maintenance' | 'users' | 'referentiels'>('maintenance');

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/auth/me?token=' + token)
      .then((res) => res.json())
      .then((data) => {
        if (data.user && data.user.role === 'admin') {
          setIsAdmin(true);
          loadMaintenanceStatus(token);
        } else {
          router.push('/');
        }
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const loadMaintenanceStatus = async (token: string) => {
    try {
      const response = await fetch('/api/maintenance?token=' + token);
      const data = await response.json();
      setMaintenanceMode(data.enabled || false);
    } catch (error) {
      console.error('Error loading maintenance status:', error);
    }
  };

  const toggleMaintenance = async () => {
    const token = localStorage.getItem('session_token');
    if (!token) return;

    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, enabled: !maintenanceMode }),
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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
        Administration
      </h1>

      <div className="tabs tabs-boxed mb-6">
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

