 // Carte affichant une demande de transfert entrante avec actions approuver/rejeter
 import React, { useState } from 'react';
 import { format } from 'date-fns';
 import { fr } from 'date-fns/locale';
 import { Card, CardContent } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Badge } from '@/components/ui/badge';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
   DialogFooter,
 } from '@/components/ui/dialog';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import { Check, X, Loader2, School, User, Phone, Mail, Calendar } from 'lucide-react';
 import { useSchoolClasses } from '@/school/hooks/useClasses';
 import { useSchoolYear } from '@/school/context/SchoolYearContext';
 import { useAuth } from '@/hooks/useAuth';
 import {
   TransferRequest,
   useApproveTransferRequest,
   useRejectTransferRequest,
 } from '../hooks/useTransferRequests';
 
 interface TransferRequestCardProps {
   request: TransferRequest;
 }
 
 export const TransferRequestCard: React.FC<TransferRequestCardProps> = ({ request }) => {
   const { user } = useAuth();
   const { school, activeSchoolYear } = useSchoolYear();
   const { data: classes = [] } = useSchoolClasses(school?.id, activeSchoolYear?.id);
   
   const approveRequest = useApproveTransferRequest();
   const rejectRequest = useRejectTransferRequest();
 
   const [showApproveDialog, setShowApproveDialog] = useState(false);
   const [showRejectDialog, setShowRejectDialog] = useState(false);
   const [selectedClassId, setSelectedClassId] = useState('');
   const [rejectionReason, setRejectionReason] = useState('');
 
   const handleApprove = async () => {
     if (!selectedClassId || !user?.id || !activeSchoolYear?.id) return;
     
     await approveRequest.mutateAsync({
       requestId: request.id,
       targetClassId: selectedClassId,
       targetSchoolYearId: activeSchoolYear.id,
       reviewedBy: user.id,
     });
     
     setShowApproveDialog(false);
     setSelectedClassId('');
   };
 
   const handleReject = async () => {
     if (!user?.id) return;
     
     await rejectRequest.mutateAsync({
       requestId: request.id,
       reviewedBy: user.id,
       rejectionReason: rejectionReason || undefined,
     });
     
     setShowRejectDialog(false);
     setRejectionReason('');
   };
 
   const isPending = request.status === 'pending';
   const isApproved = request.status === 'approved';
   const isRejected = request.status === 'rejected';
 
   return (
     <>
       <Card className={`transition-all ${isPending ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
         <CardContent className="p-4">
           <div className="flex items-start gap-4">
             {/* Photo élève */}
             <Avatar className="w-14 h-14 flex-shrink-0">
               <AvatarImage src={request.student_photo_url || undefined} />
               <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                 {request.student_first_name?.[0]}{request.student_last_name?.[0]}
               </AvatarFallback>
             </Avatar>
 
             {/* Infos élève */}
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 flex-wrap">
                 <h4 className="font-semibold text-lg">
                   {request.student_first_name} {request.student_last_name}
                 </h4>
                 {isPending && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">En attente</Badge>}
                 {isApproved && <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Approuvé</Badge>}
                 {isRejected && <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Rejeté</Badge>}
               </div>
 
               <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                 <div className="flex items-center gap-2">
                   <School className="w-4 h-4" />
                   <span>Provenance: <strong>{request.source_school_name || 'École inconnue'}</strong></span>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <Calendar className="w-4 h-4" />
                   <span>
                     Né(e) le {format(new Date(request.student_date_of_birth), 'dd MMMM yyyy', { locale: fr })}
                     {' • '}{request.student_gender === 'M' ? 'Garçon' : 'Fille'}
                   </span>
                 </div>
 
                 {request.parent_name && (
                   <div className="flex items-center gap-2">
                     <User className="w-4 h-4" />
                     <span>Parent: {request.parent_name}</span>
                   </div>
                 )}
 
                 {request.parent_phone && (
                   <div className="flex items-center gap-2">
                     <Phone className="w-4 h-4" />
                     <span>{request.parent_phone}</span>
                   </div>
                 )}
 
                 {request.parent_email && (
                   <div className="flex items-center gap-2">
                     <Mail className="w-4 h-4" />
                     <span>{request.parent_email}</span>
                   </div>
                 )}
               </div>
 
               <p className="text-xs text-muted-foreground mt-2">
                 Demande reçue le {format(new Date(request.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
               </p>
 
               {isRejected && request.rejection_reason && (
                 <p className="text-sm text-red-600 mt-2">
                   <strong>Motif du rejet:</strong> {request.rejection_reason}
                 </p>
               )}
             </div>
 
             {/* Actions */}
             {isPending && (
               <div className="flex flex-col gap-2">
                 <Button
                   size="sm"
                   className="bg-green-600 hover:bg-green-700"
                   onClick={() => setShowApproveDialog(true)}
                 >
                   <Check className="w-4 h-4 mr-1" />
                   Approuver
                 </Button>
                 <Button
                   size="sm"
                   variant="destructive"
                   onClick={() => setShowRejectDialog(true)}
                 >
                   <X className="w-4 h-4 mr-1" />
                   Rejeter
                 </Button>
               </div>
             )}
           </div>
         </CardContent>
       </Card>
 
       {/* Dialog Approbation */}
       <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Approuver le transfert</DialogTitle>
             <DialogDescription>
               Sélectionnez la classe dans laquelle intégrer {request.student_first_name} {request.student_last_name}
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Classe d'affectation *</Label>
               <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                 <SelectTrigger>
                   <SelectValue placeholder="Sélectionner une classe" />
                 </SelectTrigger>
                 <SelectContent>
                   {classes.map((cls: any) => (
                     <SelectItem key={cls.id} value={cls.id}>
                       {cls.name} ({cls.cycle})
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
               Annuler
             </Button>
             <Button
               onClick={handleApprove}
               disabled={!selectedClassId || approveRequest.isPending}
               className="bg-green-600 hover:bg-green-700"
             >
               {approveRequest.isPending ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Approbation...
                 </>
               ) : (
                 <>
                   <Check className="w-4 h-4 mr-2" />
                   Confirmer l'intégration
                 </>
               )}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Dialog Rejet */}
       <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Rejeter le transfert</DialogTitle>
             <DialogDescription>
               Êtes-vous sûr de vouloir rejeter la demande de transfert pour {request.student_first_name} {request.student_last_name} ?
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Motif du rejet (optionnel)</Label>
               <Textarea
                 placeholder="Indiquez la raison du rejet..."
                 value={rejectionReason}
                 onChange={(e) => setRejectionReason(e.target.value)}
                 rows={3}
               />
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
               Annuler
             </Button>
             <Button
               variant="destructive"
               onClick={handleReject}
               disabled={rejectRequest.isPending}
             >
               {rejectRequest.isPending ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Rejet...
                 </>
               ) : (
                 <>
                   <X className="w-4 h-4 mr-2" />
                   Confirmer le rejet
                 </>
               )}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </>
   );
 };