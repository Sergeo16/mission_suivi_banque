'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Info } from 'lucide-react';

interface Ville {
  id: number;
  nom: string;
}

interface Etablissement {
  id: number;
  nom: string;
  ville_id: number;
}

interface Controleur {
  id: number;
  nom: string;
  prenom: string;
  ville_id: number;
}

interface Mission {
  id: number;
  nom: string;
  date_debut: string;
  date_fin: string;
}

interface Volet {
  id: number;
  code: string;
  libelle: string;
  ordre: number;
  rubriques: Array<{
    id: number;
    numero: number;
    libelle: string;
  }>;
}

interface BaremeItem {
  note: number;
  libelle: string;
  description: string;
}

interface RubriqueEvaluation {
  rubriqueId: number;
  note: number | null;
  commentaire: string;
}

export default function HomePage() {
  // Données de référence
  const [missions, setMissions] = useState<Mission[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [controleurs, setControleurs] = useState<Controleur[]>([]);
  const [volets, setVolets] = useState<Volet[]>([]);
  const [bareme, setBareme] = useState<BaremeItem[]>([]);

  // Sélections du formulaire
  const [selectedMission, setSelectedMission] = useState<number | null>(null);
  const [selectedVille, setSelectedVille] = useState<number | null>(null);
  const [selectedEtablissement, setSelectedEtablissement] = useState<number | null>(null);
  const [selectedControleur, setSelectedControleur] = useState<number | null>(null);
  const [selectedVolet, setSelectedVolet] = useState<number | null>(null);

  // Évaluations par rubrique
  const [evaluations, setEvaluations] = useState<Record<number, RubriqueEvaluation>>({});
  const [showBareme, setShowBareme] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baremeModalRef = useRef<HTMLDivElement>(null);

  // Fermer le modal du barème quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (baremeModalRef.current && !baremeModalRef.current.contains(event.target as Node)) {
        setShowBareme(false);
      }
    };

    if (showBareme) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBareme]);

  useEffect(() => {
    // Charger les données de référence
    Promise.all([
      fetch('/api/missions').then((r) => r.json()),
      fetch('/api/villes').then((r) => r.json()),
      fetch('/api/volets').then((r) => r.json()),
      fetch('/api/bareme').then((r) => r.json()),
    ])
      .then(([missionsData, villesData, voletsData, baremeData]) => {
        setMissions(missionsData.missions || []);
        setVilles(villesData.villes || []);
        setVolets(voletsData.volets || []);
        setBareme(baremeData.bareme || []);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        toast.error('Erreur lors du chargement des données');
      });
  }, []);

  useEffect(() => {
    if (selectedVille) {
      Promise.all([
        fetch(`/api/etablissements?villeId=${selectedVille}`).then((r) => r.json()),
        fetch(`/api/controleurs?villeId=${selectedVille}`).then((r) => r.json()),
      ])
        .then(([etabData, controleursData]) => {
          setEtablissements(etabData.etablissements || []);
          setControleurs(controleursData.controleurs || []);
        })
        .catch(() => {
          toast.error('Erreur lors du chargement des données');
        });
    } else {
      setEtablissements([]);
      setControleurs([]);
      setSelectedEtablissement(null);
      setSelectedControleur(null);
    }
  }, [selectedVille]);

  useEffect(() => {
    if (selectedVolet) {
      const volet = volets.find((v) => v.id === selectedVolet);
      if (volet && volet.rubriques) {
        const initialEvaluations: Record<number, RubriqueEvaluation> = {};
        volet.rubriques.forEach((rubrique) => {
          initialEvaluations[rubrique.id] = {
            rubriqueId: rubrique.id,
            note: null,
            commentaire: '',
          };
        });
        setEvaluations(initialEvaluations);
      }
    } else {
      setEvaluations({});
    }
  }, [selectedVolet, volets]);

  const updateRubriqueNote = (rubriqueId: number, note: number) => {
    setEvaluations((prev) => ({
      ...prev,
      [rubriqueId]: { ...prev[rubriqueId], rubriqueId, note },
    }));
  };

  const updateRubriqueCommentaire = (rubriqueId: number, commentaire: string) => {
    setEvaluations((prev) => ({
      ...prev,
      [rubriqueId]: { ...prev[rubriqueId], rubriqueId, commentaire },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMission || !selectedVille || !selectedEtablissement || !selectedControleur || !selectedVolet) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier qu'au moins une rubrique a une note
    const rubriquesAvecNote = Object.values(evaluations).filter((e) => e.note !== null);
    if (rubriquesAvecNote.length === 0) {
      toast.error('Veuillez évaluer au moins une rubrique');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: selectedMission,
          villeId: selectedVille,
          etablissementVisiteId: selectedEtablissement,
          controleurId: selectedControleur,
          voletId: selectedVolet,
          rubriques: rubriquesAvecNote.map((e) => ({
            rubriqueId: e.rubriqueId,
            note: e.note,
            commentaire: e.commentaire || null,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Évaluation enregistrée avec succès!');
        // Réinitialiser le formulaire
        setSelectedMission(null);
        setSelectedVille(null);
        setSelectedEtablissement(null);
        setSelectedControleur(null);
        setSelectedVolet(null);
        setEvaluations({});
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeVolet = volets.find((v) => v.id === selectedVolet);

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
        Évaluation des Banques
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélections de base */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title mb-4">Informations de base</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Mission / Période *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedMission || ''}
                  onChange={(e) => {
                    const missionId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedMission(missionId);
                    if (missionId) {
                      const mission = missions.find((m) => m.id === missionId);
                      toast.success(`Mission sélectionnée : ${mission?.nom || ''}`);
                    }
                  }}
                  required
                >
                  <option value="">Sélectionner une mission</option>
                  {missions.map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.nom} ({mission.date_debut} - {mission.date_fin})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Ville *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedVille || ''}
                  onChange={(e) => {
                    const villeId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedVille(villeId);
                    setSelectedEtablissement(null);
                    setSelectedControleur(null);
                    if (villeId) {
                      const ville = villes.find((v) => v.id === villeId);
                      toast.success(`Ville sélectionnée : ${ville?.nom || ''}`);
                    }
                  }}
                  required
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
                <label className="label">
                  <span className="label-text">Établissement visité *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedEtablissement || ''}
                  onChange={(e) => {
                    const etabId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedEtablissement(etabId);
                    if (etabId) {
                      const etab = etablissements.find((e) => e.id === etabId);
                      toast.success(`Établissement sélectionné : ${etab?.nom || ''}`);
                    }
                  }}
                  required
                  disabled={!selectedVille}
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
                <label className="label">
                  <span className="label-text">Contrôleur *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedControleur || ''}
                  onChange={(e) => {
                    const controleurId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedControleur(controleurId);
                    if (controleurId) {
                      const controleur = controleurs.find((c) => c.id === controleurId);
                      toast.success(`Contrôleur sélectionné : ${controleur?.nom || ''} ${controleur?.prenom || ''}`);
                    }
                  }}
                  required
                  disabled={!selectedVille}
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
                <label className="label">
                  <span className="label-text">Volet *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={selectedVolet || ''}
                  onChange={(e) => {
                    const voletId = e.target.value ? parseInt(e.target.value, 10) : null;
                    setSelectedVolet(voletId);
                    if (voletId) {
                      const volet = volets.find((v) => v.id === voletId);
                      toast.success(`Volet sélectionné : ${volet?.libelle || ''}`);
                    }
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

        {/* Évaluation des rubriques */}
        {activeVolet && activeVolet.rubriques && activeVolet.rubriques.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">{activeVolet.libelle}</h2>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setShowBareme(true);
                    toast.info('Barème affiché');
                  }}
                >
                  <Info size={16} className="mr-2" />
                  Barème
                </button>
              </div>

              {/* Modal du barème */}
              {showBareme && (
                <div className="modal modal-open">
                  <div className="modal-box" ref={baremeModalRef}>
                    <h3 className="font-bold text-lg mb-4">Barème d'évaluation</h3>
                    <div className="space-y-2">
                      {bareme.map((item) => (
                        <div key={item.note} className="border-b pb-2">
                          <div className="font-semibold">
                            {item.note} - {item.libelle}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-400">{item.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="modal-action">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setShowBareme(false);
                          toast.info('Barème fermé');
                        }}
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {activeVolet.rubriques.map((rubrique) => {
                  const evaluation = evaluations[rubrique.id] || {
                    rubriqueId: rubrique.id,
                    note: null,
                    commentaire: '',
                  };
                  return (
                    <div key={rubrique.id} className="border rounded-lg p-4">
                      <div className="mb-3">
                        <span className="font-semibold">Rubrique {rubrique.numero}:</span>{' '}
                        {rubrique.libelle}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Note (1-5) *</span>
                          </label>
                          <select
                            className="select select-bordered"
                            value={evaluation.note || ''}
                            onChange={(e) => {
                              const note = parseInt(e.target.value, 10);
                              updateRubriqueNote(rubrique.id, note);
                              toast.success(`Note ${note} sélectionnée`);
                            }}
                            required
                          >
                            <option value="">Sélectionner une note</option>
                            {[1, 2, 3, 4, 5].map((note) => (
                              <option key={note} value={note}>
                                {note}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Commentaire (optionnel)</span>
                          </label>
                          <textarea
                            className="textarea textarea-bordered"
                            rows={2}
                            value={evaluation.commentaire || ''}
                            onChange={(e) =>
                              updateRubriqueCommentaire(rubrique.id, e.target.value)
                            }
                            placeholder="Saisir vos observations..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-4">
          <button
            type="button"
            className="btn btn-error flex-1"
            onClick={() => {
              if (confirm('Êtes-vous sûr de vouloir annuler ?')) {
                setSelectedMission(null);
                setSelectedVille(null);
                setSelectedEtablissement(null);
                setSelectedControleur(null);
                setSelectedVolet(null);
                setEvaluations({});
                toast.info('Formulaire annulé');
              } else {
                toast.info('Annulation annulée');
              }
            }}
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isSubmitting}
            onClick={() => {
              if (!selectedMission || !selectedVille || !selectedEtablissement || !selectedControleur || !selectedVolet) {
                toast.warning('Veuillez remplir tous les champs obligatoires');
              }
            }}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer l\'évaluation'}
          </button>
        </div>
      </form>
    </div>
  );
}
