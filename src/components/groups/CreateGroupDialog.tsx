import React, { useState } from 'react';
import { X, Users, Lock, Globe, Settings, Clock, Shield, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreateGroupDialogProps {
    open: boolean;
    onClose: () => void;
    onGroupCreated?: (groupId: string) => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ open, onClose, onGroupCreated }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Formulaire
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [groupType, setGroupType] = useState<'PUBLIC' | 'PRIVATE' | 'MIXTE'>('MIXTE');
    const [audienceType, setAudienceType] = useState<'ALL' | 'MEN_ONLY' | 'WOMEN_ONLY'>('ALL');
    const [showHistory, setShowHistory] = useState(false);
    
    // Options MIXTE
    const [isVisibleInSearch, setIsVisibleInSearch] = useState(true);
    const [joinApprovalRequired, setJoinApprovalRequired] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error('Le nom du groupe est requis');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-group`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user?.session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    group_type: groupType,
                    is_visible_in_search: isVisibleInSearch,
                    join_approval_required: joinApprovalRequired,
                    audience_type: audienceType,
                    show_history_to_new_members: showHistory,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la création du groupe');
            }

            toast.success('Groupe créé avec succès !');
            onGroupCreated?.(data.group.id);
            handleClose();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la création du groupe');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setGroupType('MIXTE');
        setAudienceType('ALL');
        setShowHistory(false);
        setIsVisibleInSearch(true);
        setJoinApprovalRequired(false);
        onClose();
    };

    const getGroupTypeInfo = (type: string) => {
        switch (type) {
            case 'PUBLIC':
                return {
                    icon: <Globe className="w-4 h-4" />,
                    color: 'bg-blue-100 text-blue-700 border-blue-200',
                    description: 'Visible dans la recherche, accessible à tous',
                };
            case 'PRIVATE':
                return {
                    icon: <Lock className="w-4 h-4" />,
                    color: 'bg-red-100 text-red-700 border-red-200',
                    description: 'Invisible, accès par invitation uniquement',
                };
            case 'MIXTE':
                return {
                    icon: <Settings className="w-4 h-4" />,
                    color: 'bg-purple-100 text-purple-700 border-purple-200',
                    description: 'Configuration flexible personnalisable',
                };
            default:
                return { icon: null, color: '', description: '' };
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Créer un groupe
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Informations de base */}
                    <div className="space-y-4">
                        <div>
                            <Label>Nom du groupe *</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Fans de Football"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Décrivez votre groupe..."
                                rows={3}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {/* Type de groupe */}
                    <div className="space-y-3">
                        <Label>Type de groupe</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['PUBLIC', 'PRIVATE', 'MIXTE'] as const).map((type) => {
                                const info = getGroupTypeInfo(type);
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setGroupType(type)}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            groupType === type
                                                ? 'border-primary bg-primary/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className={`p-2 rounded-full ${info.color}`}>
                                                {info.icon}
                                            </div>
                                            <span className="text-sm font-medium">{type}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Options MIXTE */}
                    {groupType === 'MIXTE' && (
                        <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900 flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Configuration MIXTE
                            </h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Visible dans la recherche</Label>
                                        <p className="text-xs text-gray-500">Le groupe apparaît dans les résultats de recherche</p>
                                    </div>
                                    <Switch
                                        checked={isVisibleInSearch}
                                        onCheckedChange={setIsVisibleInSearch}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Approbation requise</Label>
                                        <p className="text-xs text-gray-500">Les demandes doivent être validées</p>
                                    </div>
                                    <Switch
                                        checked={joinApprovalRequired}
                                        onCheckedChange={setJoinApprovalRequired}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filtrage par genre */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4" />
                            Audience (optionnel)
                        </Label>
                        <Select value={audienceType} onValueChange={(value: any) => setAudienceType(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        <span>Tous (hommes et femmes)</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="MEN_ONLY">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-blue-600" />
                                        <span>Hommes uniquement</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="WOMEN_ONLY">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-pink-600" />
                                        <span>Femmes uniquement</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                            Limitez l'accès au groupe selon le genre des membres
                        </p>
                    </div>

                    {/* Historique des messages */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Historique pour les nouveaux membres
                            </Label>
                            <p className="text-xs text-gray-500">
                                Les nouveaux membres peuvent voir l'historique complet des messages
                            </p>
                        </div>
                        <Switch
                            checked={showHistory}
                            onCheckedChange={setShowHistory}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Création...' : 'Créer le groupe'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateGroupDialog;
