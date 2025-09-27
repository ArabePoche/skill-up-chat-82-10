import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Calendar, 
  GraduationCap, 
  Clock, 
  FileText, 
  Download,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TeacherApplication } from '../hooks/useTeacherApplications';
import { useTeacherApplicationActions } from '../hooks/useTeacherApplicationActions';

interface TeacherApplicationCardProps {
  application: TeacherApplication;
}

export const TeacherApplicationCard: React.FC<TeacherApplicationCardProps> = ({ application }) => {
  const { approveApplication, rejectApplication, isProcessing } = useTeacherApplicationActions();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  const handleApprove = async () => {
    try {
      await approveApplication(application.id);
    } catch (error) {
      // L'erreur est gérée dans le hook
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    
    try {
      await rejectApplication(application.id, rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    } catch (error) {
      // L'erreur est gérée dans le hook
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {application.profiles?.first_name} {application.profiles?.last_name}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(application.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </span>
              {application.profiles?.phone && (
                <span>📱 {application.profiles.phone}</span>
              )}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(application.status)}>
            {getStatusText(application.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Résumé */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {application.experience_years && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{application.experience_years} ans d'exp.</span>
            </div>
          )}
          {application.education_level && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>{application.education_level}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{application.teacher_application_files.length} fichier(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">📚</span>
            <span>{application.teacher_application_formations.length} formation(s)</span>
          </div>
        </div>

        {/* Formations sélectionnées */}
        <div>
          <Label className="text-sm font-medium">Formations à encadrer :</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {application.teacher_application_formations.map((tf) => (
              <Badge key={tf.formations.id} variant="secondary">
                {tf.formations.title}
              </Badge>
            ))}
          </div>
        </div>

        {/* Spécialités */}
        {application.specialties.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Spécialités :</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {application.specialties.map((specialty) => (
                <Badge key={specialty} variant="outline" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Message de motivation (aperçu) */}
        <div>
          <Label className="text-sm font-medium">Message de motivation :</Label>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {application.motivation_message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Voir détails
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Candidature de {application.profiles?.first_name} {application.profiles?.last_name}
                </DialogTitle>
                <DialogDescription>
                  Soumise le {format(new Date(application.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Message complet */}
                <div>
                  <Label className="font-medium">Message de motivation :</Label>
                  <p className="mt-2 p-3 bg-muted rounded text-sm">
                    {application.motivation_message}
                  </p>
                </div>

                {/* Disponibilités */}
                {application.availability && (
                  <div>
                    <Label className="font-medium">Disponibilités :</Label>
                    <p className="mt-2 p-3 bg-muted rounded text-sm">
                      {application.availability}
                    </p>
                  </div>
                )}

                {/* Fichiers */}
                {application.teacher_application_files.length > 0 && (
                  <div>
                    <Label className="font-medium">Fichiers joints :</Label>
                    <div className="space-y-2 mt-2">
                      {application.teacher_application_files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-muted p-3 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">{file.file_name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatFileSize(file.file_size)})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(file.file_url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews (si rejetée) */}
                {application.teacher_reviews.length > 0 && (
                  <div>
                    <Label className="font-medium">Commentaire de l'examinateur :</Label>
                    {application.teacher_reviews.map((review) => (
                      <div key={review.id} className="mt-2 p-3 bg-muted rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={review.decision === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {review.decision === 'approved' ? 'Approuvé' : 'Rejeté'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {application.status === 'pending' && (
            <div className="flex gap-2">
              <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isProcessing}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rejeter la candidature</DialogTitle>
                    <DialogDescription>
                      Veuillez fournir une raison pour le rejet de cette candidature.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reject-reason">Raison du rejet *</Label>
                      <Textarea
                        id="reject-reason"
                        placeholder="Expliquez pourquoi cette candidature est rejetée..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                        Annuler
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleReject}
                        disabled={!rejectReason.trim() || isProcessing}
                      >
                        {isProcessing ? 'Rejet...' : 'Confirmer le rejet'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                onClick={handleApprove} 
                size="sm" 
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approuver
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};