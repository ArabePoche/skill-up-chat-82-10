
import React from 'react';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

interface ShopSidebarProps {
  categories: Array<{ id: string; name: string; label: string }>;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  isVisible: boolean;
  onClose: () => void;
}

const ShopSidebar: React.FC<ShopSidebarProps> = ({
  categories,
  activeCategory,
  setActiveCategory,
  priceRange,
  setPriceRange,
  isVisible,
  onClose
}) => {
  if (!isVisible) return null;

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center">
            <Filter size={20} className="mr-2" />
            Filtres
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="md:hidden">
            ×
          </Button>
        </div>

        {/* Catégories */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Catégories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={category.id}
                  checked={activeCategory === category.name}
                  onCheckedChange={() => setActiveCategory(category.name)}
                />
                <label
                  htmlFor={category.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {category.label}
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Prix */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Slider
                defaultValue={priceRange}
                max={500}
                min={0}
                step={10}
                onValueChange={(value) => setPriceRange(value as [number, number])}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{priceRange[0]}€</span>
                <span>{priceRange[1]}€</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <Checkbox id={`rating-${rating}`} />
                <label htmlFor={`rating-${rating}`} className="text-sm flex items-center cursor-pointer">
                  <div className="flex mr-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  et plus
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShopSidebar;
