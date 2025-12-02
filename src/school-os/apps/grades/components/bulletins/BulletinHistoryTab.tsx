/**
 * Onglet Historique des bulletins générés
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { History, Download, Eye, Search, FileText, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BulletinHistoryTabProps {
  schoolId: string;
  schoolYearId: string;
}

interface BulletinRecord {
  id: string;
  className: string;
  period: string;
  generatedAt: Date;
  studentsCount: number;
  generatedBy: string;
  status: 'completed' | 'partial' | 'error';
}

export const BulletinHistoryTab: React.FC<BulletinHistoryTabProps> = ({ 
  schoolId,
  schoolYearId 
}) => {
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Charger depuis la base de données
  const bulletinHistory: BulletinRecord[] = [
    {
      id: '1',
      className: '6ème A',
      period: 'Trimestre 1',
      generatedAt: new Date('2024-12-01'),
      studentsCount: 32,
      generatedBy: 'M. Dupont',
      status: 'completed',
    },
    {
      id: '2',
      className: '5ème B',
      period: 'Trimestre 1',
      generatedAt: new Date('2024-12-02'),
      studentsCount: 28,
      generatedBy: 'Mme Martin',
      status: 'completed',
    },
    {
      id: '3',
      className: '4ème A',
      period: 'Trimestre 1',
      generatedAt: new Date('2024-11-30'),
      studentsCount: 25,
      generatedBy: 'M. Bernard',
      status: 'partial',
    },
  ];

  const getStatusBadge = (status: BulletinRecord['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Complet</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partiel</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
    }
  };

  const filteredHistory = bulletinHistory.filter(record => {
    if (filterClass !== 'all' && record.className !== filterClass) return false;
    if (filterPeriod !== 'all' && record.period !== filterPeriod) return false;
    if (searchQuery && !record.className.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une classe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            <SelectItem value="6ème A">6ème A</SelectItem>
            <SelectItem value="5ème B">5ème B</SelectItem>
            <SelectItem value="4ème A">4ème A</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les périodes</SelectItem>
            <SelectItem value="Trimestre 1">Trimestre 1</SelectItem>
            <SelectItem value="Trimestre 2">Trimestre 2</SelectItem>
            <SelectItem value="Trimestre 3">Trimestre 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des bulletins */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-4 h-4" />
            Historique des générations
            <Badge variant="outline" className="ml-auto">
              {filteredHistory.length} résultat{filteredHistory.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun bulletin généré</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((record) => (
                <div 
                  key={record.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{record.className}</h4>
                        <Badge variant="outline">{record.period}</Badge>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(record.generatedAt, 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {record.studentsCount} élèves
                        </span>
                        <span>Par {record.generatedBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
