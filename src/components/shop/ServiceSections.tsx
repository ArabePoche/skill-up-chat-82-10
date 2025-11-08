/**
 * Composant pour afficher les sections de services dans la boutique
 */
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Euro } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Service } from '@/shop/services/hooks/useServices';

interface ServiceSectionsProps {
  services: Service[];
  onBookService?: (serviceId: string) => void;
}

const ServiceSections: React.FC<ServiceSectionsProps> = ({ 
  services,
  onBookService 
}) => {
  const { t } = useTranslation();

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('shop.noServices', 'Aucun service disponible pour le moment')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('shop.allServices', 'Tous les services')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {services.map((service) => (
          <Card key={service.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{service.name}</CardTitle>
              <CardDescription className="line-clamp-2">{service.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{service.duration} min</span>
              </div>
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{service.price}€</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => onBookService?.(service.id)}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {t('shop.bookService', 'Réserver')}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ServiceSections;
