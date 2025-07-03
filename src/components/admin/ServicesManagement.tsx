
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';

// Temporary mock data for services since the table doesn't exist yet in Supabase
const mockServices = [
  {
    id: '1',
    name: 'Consultation personnalisée',
    description: 'Séance de conseil individuelle',
    price: 50,
    duration: 60,
    category: 'Consultation',
    is_active: true,
    created_at: '2024-01-01'
  },
  {
    id: '2',
    name: 'Formation sur mesure',
    description: 'Formation adaptée aux besoins spécifiques',
    price: 200,
    duration: 240,
    category: 'Formation',
    is_active: true,
    created_at: '2024-01-02'
  }
];

const ServicesManagement = () => {
  const [services, setServices] = useState(mockServices);

  // Mock functions - will be replaced with real Supabase calls once the table is created
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const newService = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string) || 0,
      duration: parseInt(formData.get('duration') as string) || 0,
      category: formData.get('category') as string,
      is_active: true,
      created_at: new Date().toISOString()
    };

    setServices([...services, newService]);
    console.log('Service à créer:', newService);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      setServices(services.filter(service => service.id !== id));
      console.log('Service à supprimer:', id);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des services</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-[#25d366] hover:bg-[#25d366]/90">
              <Plus size={16} className="mr-2" />
              Nouveau service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un nouveau service</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom du service</label>
                <Input name="name" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea name="description" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prix (€)</label>
                <Input name="price" type="number" min="0" step="0.01" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Durée (minutes)</label>
                <Input name="duration" type="number" min="1" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie</label>
                <Input name="category" required />
              </div>
              <Button type="submit" className="w-full">
                Créer le service
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Cette section utilise des données temporaires. 
            La table "services" doit être créée dans Supabase pour la fonctionnalité complète.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>{service.category}</TableCell>
                <TableCell>{service.price}€</TableCell>
                <TableCell>{service.duration} min</TableCell>
                <TableCell>
                  <Badge variant={service.is_active ? 'default' : 'destructive'}>
                    {service.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ServicesManagement;
