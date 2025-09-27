import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useTeacherApplications } from '../hooks/useTeacherApplications';
import { TeacherApplicationCard } from './TeacherApplicationCard';

export const TeacherApplicationsList: React.FC = () => {
  const { data: applications, isLoading, error } = useTeacherApplications();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des candidatures...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Erreur lors du chargement des candidatures
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Candidatures d'encadreurs
          </CardTitle>
          <CardDescription>
            Gérez les candidatures pour devenir encadreur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucune candidature pour le moment
          </div>
        </CardContent>
      </Card>
    );
  }

  // Statistiques
  const pending = applications.filter(app => app.status === 'pending').length;
  const approved = applications.filter(app => app.status === 'approved').length;
  const rejected = applications.filter(app => app.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Candidatures d'encadreurs
          </CardTitle>
          <CardDescription>
            Gérez les candidatures pour devenir encadreur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-800">{pending}</div>
                <div className="text-sm text-yellow-600">En attente</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-800">{approved}</div>
                <div className="text-sm text-green-600">Approuvées</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-800">{rejected}</div>
                <div className="text-sm text-red-600">Rejetées</div>
              </div>
            </div>
          </div>

          {/* Filtres rapides */}
          <div className="flex gap-2 mb-4">
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              Toutes ({applications.length})
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted bg-yellow-100 text-yellow-800">
              En attente ({pending})
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              Approuvées ({approved})
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              Rejetées ({rejected})
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Liste des candidatures */}
      <div className="space-y-4">
        {applications.map((application) => (
          <TeacherApplicationCard
            key={application.id}
            application={application}
          />
        ))}
      </div>
    </div>
  );
};