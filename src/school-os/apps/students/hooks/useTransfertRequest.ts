 // Hook pour gérer les demandes de transfert d'élèves entre écoles
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 export type TransferRequestStatus = 'pending' | 'approved' | 'rejected';
 
 export interface TransferRequest {
   id: string;
   archived_student_id: string;
   source_school_id: string;
   target_school_id: string;
   source_school_name: string | null;
   target_school_name: string | null;
   student_first_name: string;
   student_last_name: string;
   student_date_of_birth: string;
   student_gender: string;
   student_code: string | null;
   student_photo_url: string | null;
   parent_name: string | null;
   parent_phone: string | null;
   parent_email: string | null;
   requested_by: string | null;
   status: TransferRequestStatus;
   rejection_reason: string | null;
   reviewed_by: string | null;
   reviewed_at: string | null;
   created_at: string;
   updated_at: string;
   // Relations jointes
   source_school?: { id: string; name: string } | null;
   target_school?: { id: string; name: string } | null;
 }
 
 // Récupérer les demandes de transfert entrantes (école cible)
 export const useIncomingTransferRequests = (schoolId?: string) => {
   return useQuery({
     queryKey: ['transfer-requests', 'incoming', schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('student_transfer_requests')
         .select('*')
         .eq('target_school_id', schoolId!)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       return (data || []) as unknown as TransferRequest[];
     },
     enabled: !!schoolId,
   });
 };
 
 // Récupérer les demandes de transfert sortantes (école source)
 export const useOutgoingTransferRequests = (schoolId?: string) => {
   return useQuery({
     queryKey: ['transfer-requests', 'outgoing', schoolId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('student_transfer_requests')
         .select('*')
         .eq('source_school_id', schoolId!)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       return (data || []) as unknown as TransferRequest[];
     },
     enabled: !!schoolId,
   });
 };
 
 // Compter les demandes en attente (pour badge de notification)
 export const usePendingTransferRequestsCount = (schoolId?: string) => {
   return useQuery({
     queryKey: ['transfer-requests', 'pending-count', schoolId],
     queryFn: async () => {
       const { count, error } = await supabase
         .from('student_transfer_requests')
         .select('*', { count: 'exact', head: true })
         .eq('target_school_id', schoolId!)
         .eq('status', 'pending');
 
       if (error) throw error;
       return count || 0;
     },
     enabled: !!schoolId,
   });
 };
 
 // Créer une demande de transfert
 export interface CreateTransferRequestInput {
   archived_student_id: string;
   source_school_id: string;
   target_school_id: string;
   source_school_name?: string | null;
   target_school_name?: string | null;
   student_first_name: string;
   student_last_name: string;
   student_date_of_birth: string;
   student_gender: string;
   student_photo_url?: string | null;
   student_code?: string | null;
   parent_name?: string | null;
   parent_phone?: string | null;
   parent_email?: string | null;
   requested_by: string;
 }
 
 export const useCreateTransferRequest = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (input: CreateTransferRequestInput) => {
       const { data, error } = await supabase
         .from('student_transfer_requests')
         .insert({
           archived_student_id: input.archived_student_id,
           source_school_id: input.source_school_id,
           target_school_id: input.target_school_id,
           source_school_name: input.source_school_name,
           target_school_name: input.target_school_name,
           student_first_name: input.student_first_name,
           student_last_name: input.student_last_name,
           student_date_of_birth: input.student_date_of_birth,
           student_gender: input.student_gender,
           student_photo_url: input.student_photo_url,
           student_code: input.student_code,
           parent_name: input.parent_name,
           parent_phone: input.parent_phone,
           parent_email: input.parent_email,
           requested_by: input.requested_by,
           status: 'pending',
         })
         .select()
         .single();
 
       if (error) throw error;
       return data as unknown as TransferRequest;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
     },
     onError: (error: any) => {
       console.error('Error creating transfer request:', error);
       toast.error('Erreur lors de la création de la demande de transfert');
     },
   });
 };
 
 // Approuver une demande de transfert
 export interface ApproveTransferRequestInput {
   requestId: string;
   targetClassId: string;
   targetSchoolYearId: string;
   reviewedBy: string;
 }
 
 export const useApproveTransferRequest = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (input: ApproveTransferRequestInput) => {
       const { requestId, targetClassId, targetSchoolYearId, reviewedBy } = input;
 
       // 1. Récupérer la demande de transfert avec les données archivées
       const { data: request, error: fetchError } = await supabase
         .from('student_transfer_requests')
         .select('*')
         .eq('id', requestId)
         .single();
 
       if (fetchError) throw fetchError;
 
       // Récupérer les données complètes de l'élève archivé
       const { data: archivedStudent, error: archiveError } = await supabase
         .from('archived_students')
         .select('*')
         .eq('id', request.archived_student_id)
         .single();
 
       if (archiveError) throw archiveError;
 
       // 2. Créer l'élève dans l'école cible
       const { data: newStudent, error: insertError } = await supabase
         .from('students_school')
         .insert({
           school_id: request.target_school_id,
           class_id: targetClassId,
           school_year_id: targetSchoolYearId,
           first_name: request.student_first_name,
           last_name: request.student_last_name,
           date_of_birth: request.student_date_of_birth,
           gender: request.student_gender,
           student_code: request.student_code,
           photo_url: request.student_photo_url,
           parent_name: request.parent_name,
           parent_phone: request.parent_phone,
           parent_email: request.parent_email,
           address: archivedStudent?.address || null,
           city: archivedStudent?.city || null,
           medical_notes: archivedStudent?.medical_notes || null,
           family_id: null,
           discount_percentage: null,
           discount_amount: null,
           father_name: archivedStudent?.father_name || null,
           mother_name: archivedStudent?.mother_name || null,
           mother_occupation: archivedStudent?.mother_occupation || null,
           father_occupation: archivedStudent?.father_occupation || null,
           birth_place: archivedStudent?.birth_place || null,
           observations: archivedStudent?.observations || null,
           status: 'active',
         })
         .select()
         .single();
 
       if (insertError) throw insertError;
 
       // 3. Mettre à jour le statut de la demande
       const { error: updateError } = await supabase
         .from('student_transfer_requests')
         .update({
           status: 'approved',
           reviewed_by: reviewedBy,
           reviewed_at: new Date().toISOString(),
         })
         .eq('id', requestId);
 
       if (updateError) {
         await supabase.from('students_school').delete().eq('id', newStudent.id);
         throw updateError;
       }
 
       // 4. Marquer l'archive comme restaurée
       if (archivedStudent) {
         await supabase
           .from('archived_students')
           .update({
             is_restored: true,
             restored_at: new Date().toISOString(),
             restored_by: reviewedBy,
             restored_to_class_id: targetClassId,
           })
           .eq('id', archivedStudent.id);
       }
 
       return newStudent;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
       queryClient.invalidateQueries({ queryKey: ['students'] });
       queryClient.invalidateQueries({ queryKey: ['archived-students'] });
       toast.success('Demande de transfert approuvée - Élève intégré avec succès');
     },
     onError: (error: any) => {
       console.error('Error approving transfer request:', error);
       toast.error('Erreur lors de l\'approbation: ' + error.message);
     },
   });
 };
 
 // Rejeter une demande de transfert
 export interface RejectTransferRequestInput {
   requestId: string;
   reviewedBy: string;
   rejectionReason?: string;
 }
 
 export const useRejectTransferRequest = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (input: RejectTransferRequestInput) => {
       const { requestId, reviewedBy, rejectionReason } = input;
 
       const { error } = await supabase
         .from('student_transfer_requests')
         .update({
           status: 'rejected',
           reviewed_by: reviewedBy,
           rejection_reason: rejectionReason,
           reviewed_at: new Date().toISOString(),
         })
         .eq('id', requestId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
       toast.success('Demande de transfert rejetée');
     },
     onError: (error: any) => {
       console.error('Error rejecting transfer request:', error);
       toast.error('Erreur lors du rejet: ' + error.message);
     },
   });
 };