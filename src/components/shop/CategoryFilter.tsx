
import React from 'react';

interface Category {
  id: string;
  name: string;
  label: string;
}

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  isLoading: boolean;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  setActiveCategory,
  isLoading
}) => {
  if (isLoading) return null;

  return (
    <div className="p-2 sm:p-4 pt-0">
      <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full whitespace-nowrap transition-all duration-200 text-xs sm:text-sm flex-shrink-0 ${
              activeCategory === category.id
                ? 'bg-edu-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
