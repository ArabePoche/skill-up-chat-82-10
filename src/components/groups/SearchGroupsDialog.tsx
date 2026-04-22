import React, { useState, useEffect } from 'react';
import { Search, Globe, Lock, Users, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Group {
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    group_type: string;
    audience_type: string;
    member_count: number;
    is_member: boolean;
}

interface SearchGroupsDialogProps {
    open: boolean;
    onClose: () => void;
    onGroupJoined?: (groupId: string) => void;
}

const SearchGroupsDialog: React.FC<SearchGroupsDialogProps> = ({ open, onClose, onGroupJoined }) => {
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [joining, setJoining] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            searchGroups('');
        }
    }, [open]);

    const searchGroups = async (query: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('search-groups', {
                body: {
                    search: query,
                    limit: 20,
                },
            });

            if (error) {
                throw new Error(error.message || 'Erreur lors de la recherche');
            }

            setGroups(data.groups || []);
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la recherche');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        searchGroups(search);
    };

    const handleJoin = async (groupId: string) => {
        setJoining(groupId);
        try {
            const { data, error } = await supabase.functions.invoke('join-group', {
                body: {
                    group_id: groupId,
                },
            });

            if (error) {
                throw new Error(error.message || 'Erreur lors de la jonction');
            }

            toast.success(data.message || 'Demande envoyée avec succès');
            
            // Mettre à jour l'état du groupe
            setGroups(groups.map(g => 
                g.id === groupId ? { ...g, is_member: true } : g
            ));

            if (data.message.includes('rejoint')) {
                onGroupJoined?.(groupId);
            }
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la jonction');
        } finally {
            setJoining(null);
        }
    };

    const getGroupTypeInfo = (type: string) => {
        switch (type) {
            case 'PUBLIC':
                return { icon: <Globe className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' };
            case 'PRIVATE':
                return { icon: <Lock className="w-4 h-4" />, color: 'bg-red-100 text-red-700' };
            case 'MIXTE':
                return { icon: <Users className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' };
            default:
                return { icon: null, color: 'bg-gray-100 text-gray-700' };
        }
    };

    const getAudienceBadge = (audience: string) => {
        switch (audience) {
            case 'MEN_ONLY':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Hommes uniquement</Badge>;
            case 'WOMEN_ONLY':
                return <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">Femmes uniquement</Badge>;
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Rechercher des groupes
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Barre de recherche */}
                    <div className="flex gap-2">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Rechercher un groupe..."
                            className="flex-1"
                        />
                        <Button onClick={handleSearch} disabled={loading}>
                            <Search className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Liste des groupes */}
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">
                                Recherche en cours...
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Aucun groupe trouvé
                            </div>
                        ) : (
                            groups.map((group) => {
                                const typeInfo = getGroupTypeInfo(group.group_type);
                                return (
                                    <div
                                        key={group.id}
                                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            {group.avatar_url ? (
                                                <img
                                                    src={group.avatar_url}
                                                    alt={group.name}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <Users className="w-6 h-6 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold truncate">{group.name}</h4>
                                                    <Badge className={typeInfo.color}>
                                                        {typeInfo.icon}
                                                        <span className="ml-1">{group.group_type}</span>
                                                    </Badge>
                                                    {getAudienceBadge(group.audience_type)}
                                                </div>
                                                {group.description && (
                                                    <p className="text-sm text-gray-600 line-clamp-2">
                                                        {group.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {group.member_count} membres
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                {group.is_member ? (
                                                    <Button variant="outline" size="sm" disabled>
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Membre
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleJoin(group.id)}
                                                        disabled={joining === group.id}
                                                    >
                                                        {joining === group.id ? (
                                                            'En cours...'
                                                        ) : (
                                                            <>
                                                                <UserPlus className="w-4 h-4 mr-1" />
                                                                Rejoindre
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SearchGroupsDialog;
