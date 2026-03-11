import React, { useState } from 'react';
import { useShopAgents, useCreateShopAgent, useUpdateShopAgent, useDeleteShopAgent, ShopAgent } from '@/hooks/shop/useShopAgents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    UserPlus,
    Shield,
    Trash2,
    Edit2,
    Check,
    X,
    Lock,
    User as UserIcon,
    Search
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface BoutiqueAgentsManagerProps {
    shopId: string;
}

export const BoutiqueAgentsManager: React.FC<BoutiqueAgentsManagerProps> = ({ shopId }) => {
    const { data: agents, isLoading } = useShopAgents(shopId);
    const createAgent = useCreateShopAgent();
    const updateAgent = useUpdateShopAgent();
    const deleteAgent = useDeleteShopAgent();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newAgent, setNewAgent] = useState({
        first_name: '',
        last_name: '',
        role: 'vendeur' as const,
        pin_code: '',
        username: '',
        password: '',
    });

    const [editingAgent, setEditingAgent] = useState<ShopAgent | null>(null);

    const handleAddAgent = async () => {
        if (!newAgent.first_name || !newAgent.last_name) return;

        await createAgent.mutateAsync({
            shop_id: shopId,
            first_name: newAgent.first_name,
            last_name: newAgent.last_name,
            role: newAgent.role,
            pin_code: newAgent.pin_code || null,
            username: newAgent.username || null,
            password_hash: newAgent.password || null,
            user_id: null,
        });

        setNewAgent({ first_name: '', last_name: '', role: 'vendeur', pin_code: '', username: '', password: '' });
        setIsAddDialogOpen(false);
    };

    const handleToggleStatus = (agent: ShopAgent) => {
        updateAgent.mutate({
            id: agent.id,
            shop_id: shopId,
            status: agent.status === 'active' ? 'inactive' : 'active'
        });
    };

    const handleDelete = (agentId: string) => {
        if (confirm('Êtes-vous sûr de vouloir retirer cet agent ?')) {
            deleteAgent.mutate({ id: agentId, shop_id: shopId });
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'PDG': return <Badge variant="default" className="bg-purple-600">PDG</Badge>;
            case 'comptable': return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Comptable</Badge>;
            default: return <Badge variant="outline" className="border-green-200 text-green-700">Vendeur</Badge>;
        }
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground italic">Chargement de l'équipe...</div>;

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center justify-between pb-2">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        Gestion de l'Équipe
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Gérez les accès et les rôles de votre personnel boutique.
                    </p>
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-gradient-to-r from-primary to-primary-foreground text-white border-none shadow-premium transition-all hover:scale-105 active:scale-95">
                            <UserPlus className="w-4 h-4" />
                            Recruter un agent
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Nouvel Agent Local</DialogTitle>
                            <DialogDescription>
                                Créez un compte spécifique pour votre boutique.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Prénom</label>
                                    <Input
                                        placeholder="Ex: Jean"
                                        value={newAgent.first_name}
                                        onChange={(e) => setNewAgent({ ...newAgent, first_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nom</label>
                                    <Input
                                        placeholder="Ex: Dupont"
                                        value={newAgent.last_name}
                                        onChange={(e) => setNewAgent({ ...newAgent, last_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rôle</label>
                                <Select
                                    value={newAgent.role}
                                    onValueChange={(v: any) => setNewAgent({ ...newAgent, role: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir un rôle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vendeur">Vendeur (Ventes uniquement)</SelectItem>
                                        <SelectItem value="comptable">Comptable (Ventes + Stats)</SelectItem>
                                        <SelectItem value="PDG">PDG (Gestion totale)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Identifiant</label>
                                    <Input
                                        placeholder="Username"
                                        value={newAgent.username}
                                        onChange={(e) => setNewAgent({ ...newAgent, username: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Mot de passe</label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={newAgent.password}
                                        onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Lock className="w-3 h-3" /> Code PIN (Accès rapide)
                                </label>
                                <Input
                                    type="password"
                                    placeholder="4-6 chiffres"
                                    maxLength={6}
                                    value={newAgent.pin_code}
                                    onChange={(e) => setNewAgent({ ...newAgent, pin_code: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                            <Button
                                onClick={handleAddAgent}
                                disabled={!newAgent.first_name || !newAgent.last_name}
                            >
                                Ajouter l'agent
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents?.map((agent) => (
                    <Card key={agent.id} className={`overflow-hidden transition-all duration-300 ${agent.status === 'inactive' ? 'opacity-60 grayscale' : 'hover:shadow-lg border-primary/10'}`}>
                        <CardHeader className="p-4 pb-2 border-b bg-muted/30">
                            <div className="flex justify-between items-start">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-white shadow-sm">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                {getRoleBadge(agent.role)}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-4">
                            <div className="space-y-1 mb-4">
                                <p className="font-bold text-lg leading-tight uppercase tracking-tight">{agent.first_name} {agent.last_name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px] uppercase font-bold">
                                        {agent.status}
                                    </Badge>
                                    • Créé le {new Date(agent.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 mt-6">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-9 rounded-lg hover:bg-muted transition-colors"
                                    onClick={() => handleToggleStatus(agent)}
                                >
                                    {agent.status === 'active' ? 'Suspendre' : 'Rétablir'}
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                                    onClick={() => handleDelete(agent.id)}
                                    disabled={agent.role === 'PDG'} // Empêcher de supprimer le PDG via cette liste (sécurité relative)
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {(!agents || agents.length === 0) && (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-muted-foreground font-medium">Aucun agent dans cette boutique pour l'instant.</p>
                    <p className="text-xs text-muted-foreground max-w-[250px] text-center mt-2 leading-relaxed">
                        Commencez par ajouter un vendeur ou un comptable pour déléguer la gestion.
                    </p>
                </div>
            )}
        </div>
    );
};
