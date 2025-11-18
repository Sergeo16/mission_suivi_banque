'use client';

import { Building2 } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="card bg-base-100 shadow-xl max-w-md">
        <div className="card-body text-center">
          <Building2 className="text-accent mx-auto mb-4" size={64} />
          <h1 className="text-2xl font-bold mb-4">Maintenance en cours</h1>
          <p className="text-gray-400">
            La plateforme est actuellement en maintenance.
            <br />
            Veuillez réessayer plus tard.
          </p>
        </div>
      </div>
    </div>
  );
}

