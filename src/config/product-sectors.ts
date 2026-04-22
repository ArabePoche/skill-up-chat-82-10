import { SectorConfig } from '@/types/product-form';

/**
 * Configurations des secteurs pour le formulaire produit dynamique
 */
export const SECTOR_CONFIGS: Record<string, SectorConfig> = {
  default: {
    id: 'default',
    name: 'Standard',
    description: 'Produit standard sans secteur spécifique',
    fields: [
      {
        name: 'size',
        label: 'Taille',
        type: 'text',
        placeholder: 'Ex: M, L, XL',
      },
      {
        name: 'color',
        label: 'Couleur',
        type: 'text',
        placeholder: 'Ex: Bleu, Rouge',
      },
      {
        name: 'condition',
        label: 'État',
        type: 'select',
        required: true,
        defaultValue: 'new',
        options: [
          { value: 'new', label: 'Neuf' },
          { value: 'used', label: 'Seconde main' },
        ],
      },
      {
        name: 'characteristics',
        label: 'Caractéristiques',
        type: 'textarea',
        placeholder: 'Décrivez les caractéristiques du produit...',
      },
    ],
  },

  pharmaceutical: {
    id: 'pharmaceutical',
    name: 'Pharmaceutique',
    description: 'Médicaments et produits de santé',
    fields: [
      {
        name: 'expiration_date',
        label: 'Date d\'expiration',
        type: 'date',
        required: true,
        validation: (value) => {
          if (!value) return 'La date d\'expiration est requise';
          const expDate = new Date(value);
          if (expDate < new Date()) {
            return 'Le produit est périmé';
          }
          return null;
        },
      },
      {
        name: 'batch_number',
        label: 'Numéro de lot',
        type: 'text',
        required: true,
        placeholder: 'Ex: LOT-2024-001',
      },
      {
        name: 'prescription_required',
        label: 'Prescription requise',
        type: 'select',
        required: true,
        defaultValue: 'no',
        options: [
          { value: 'yes', label: 'Oui' },
          { value: 'no', label: 'Non' },
        ],
      },
      {
        name: 'regulation_level',
        label: 'Niveau de réglementation',
        type: 'select',
        required: true,
        options: [
          { value: 'otc', label: 'Vente libre (OTC)' },
          { value: 'prescription', label: 'Sur ordonnance' },
          { value: 'restricted', label: 'Restreint' },
          { value: 'controlled', label: 'Substance contrôlée' },
        ],
      },
      {
        name: 'storage_conditions',
        label: 'Conditions de stockage',
        type: 'select',
        options: [
          { value: 'room', label: 'Température ambiante' },
          { value: 'refrigerated', label: 'Réfrigéré (2-8°C)' },
          { value: 'frozen', label: 'Congelé (-20°C)' },
          { value: 'cool', label: 'Frais (8-15°C)' },
        ],
      },
      {
        name: 'dosage',
        label: 'Dosage',
        type: 'text',
        placeholder: 'Ex: 500mg, 10ml',
      },
      {
        name: 'active_ingredient',
        label: 'Principe actif',
        type: 'text',
        placeholder: 'Ex: Paracétamol',
      },
    ],
  },

  food: {
    id: 'food',
    name: 'Alimentaire',
    description: 'Produits alimentaires et boissons',
    fields: [
      {
        name: 'expiry_date',
        label: 'Date de péremption',
        type: 'date',
        required: true,
        validation: (value) => {
          if (!value) return 'La date de péremption est requise';
          const expDate = new Date(value);
          if (expDate < new Date()) {
            return 'Le produit est périmé';
          }
          return null;
        },
      },
      {
        name: 'storage_temperature',
        label: 'Température de conservation',
        type: 'select',
        required: true,
        options: [
          { value: 'ambient', label: 'Température ambiante' },
          { value: 'refrigerated', label: 'Réfrigéré' },
          { value: 'frozen', label: 'Congelé' },
          { value: 'cool', label: 'Frais' },
        ],
      },
      {
        name: 'weight',
        label: 'Poids',
        type: 'number',
        placeholder: 'Ex: 500',
      },
      {
        name: 'weight_unit',
        label: 'Unité de poids',
        type: 'select',
        conditional: { field: 'weight', value: true },
        options: [
          { value: 'g', label: 'Grammes (g)' },
          { value: 'kg', label: 'Kilogrammes (kg)' },
          { value: 'mg', label: 'Milligrammes (mg)' },
          { value: 'l', label: 'Litres (L)' },
          { value: 'ml', label: 'Millilitres (mL)' },
        ],
      },
      {
        name: 'allergens',
        label: 'Allergènes',
        type: 'multiselect',
        options: [
          { value: 'gluten', label: 'Gluten' },
          { value: 'dairy', label: 'Produits laitiers' },
          { value: 'nuts', label: 'Fruits à coque' },
          { value: 'eggs', label: 'Œufs' },
          { value: 'soy', label: 'Soja' },
          { value: 'fish', label: 'Poisson' },
          { value: 'shellfish', label: 'Crustacés' },
          { value: 'peanuts', label: 'Arachides' },
        ],
      },
      {
        name: 'nutritional_info',
        label: 'Informations nutritionnelles',
        type: 'textarea',
        placeholder: 'Calories, protéines, glucides, lipides...',
      },
      {
        name: 'organic',
        label: 'Produit biologique',
        type: 'select',
        options: [
          { value: 'yes', label: 'Oui' },
          { value: 'no', label: 'Non' },
        ],
      },
    ],
  },

  clothing: {
    id: 'clothing',
    name: 'Vestimentaire',
    description: 'Vêtements et accessoires',
    fields: [
      {
        name: 'size',
        label: 'Taille',
        type: 'select',
        required: true,
        options: [
          { value: 'XS', label: 'XS' },
          { value: 'S', label: 'S' },
          { value: 'M', label: 'M' },
          { value: 'L', label: 'L' },
          { value: 'XL', label: 'XL' },
          { value: 'XXL', label: 'XXL' },
          { value: 'XXXL', label: 'XXXL' },
          { value: 'custom', label: 'Personnalisé' },
        ],
      },
      {
        name: 'custom_size',
        label: 'Taille personnalisée',
        type: 'text',
        placeholder: 'Ex: 40, 42, 44',
        conditional: { field: 'size', value: 'custom' },
      },
      {
        name: 'color',
        label: 'Couleur',
        type: 'select',
        required: true,
        options: [
          { value: 'black', label: 'Noir' },
          { value: 'white', label: 'Blanc' },
          { value: 'gray', label: 'Gris' },
          { value: 'red', label: 'Rouge' },
          { value: 'blue', label: 'Bleu' },
          { value: 'green', label: 'Vert' },
          { value: 'yellow', label: 'Jaune' },
          { value: 'orange', label: 'Orange' },
          { value: 'pink', label: 'Rose' },
          { value: 'purple', label: 'Violet' },
          { value: 'brown', label: 'Marron' },
          { value: 'beige', label: 'Beige' },
          { value: 'multicolor', label: 'Multicolore' },
          { value: 'custom', label: 'Autre' },
        ],
      },
      {
        name: 'custom_color',
        label: 'Couleur personnalisée',
        type: 'text',
        placeholder: 'Ex: Bleu marine, Vert olive',
        conditional: { field: 'color', value: 'custom' },
      },
      {
        name: 'material',
        label: 'Matière',
        type: 'select',
        required: true,
        options: [
          { value: 'cotton', label: 'Coton' },
          { value: 'polyester', label: 'Polyester' },
          { value: 'wool', label: 'Laine' },
          { value: 'silk', label: 'Soie' },
          { value: 'linen', label: 'Lin' },
          { value: 'denim', label: 'Denim' },
          { value: 'leather', label: 'Cuir' },
          { value: 'synthetic', label: 'Synthétique' },
          { value: 'blend', label: 'Mélangé' },
          { value: 'other', label: 'Autre' },
        ],
      },
      {
        name: 'gender',
        label: 'Genre',
        type: 'select',
        options: [
          { value: 'men', label: 'Homme' },
          { value: 'women', label: 'Femme' },
          { value: 'unisex', label: 'Unisexe' },
          { value: 'kids', label: 'Enfant' },
          { value: 'baby', label: 'Bébé' },
        ],
      },
      {
        name: 'brand',
        label: 'Marque',
        type: 'text',
        placeholder: 'Ex: Nike, Adidas, Zara',
      },
      {
        name: 'care_instructions',
        label: 'Instructions d\'entretien',
        type: 'textarea',
        placeholder: 'Lavage, repassage, etc.',
      },
    ],
  },

  electronics: {
    id: 'electronics',
    name: 'Électronique',
    description: 'Appareils électroniques et informatiques',
    fields: [
      {
        name: 'warranty_duration',
        label: 'Durée de garantie',
        type: 'select',
        required: true,
        options: [
          { value: '3_months', label: '3 mois' },
          { value: '6_months', label: '6 mois' },
          { value: '1_year', label: '1 an' },
          { value: '2_years', label: '2 ans' },
          { value: '3_years', label: '3 ans' },
          { value: 'lifetime', label: 'À vie' },
        ],
      },
      {
        name: 'serial_number',
        label: 'Numéro de série',
        type: 'text',
        placeholder: 'Ex: SN-123456789',
      },
      {
        name: 'power',
        label: 'Puissance',
        type: 'text',
        placeholder: 'Ex: 100W, 220V',
      },
      {
        name: 'voltage',
        label: 'Tension',
        type: 'select',
        options: [
          { value: '110v', label: '110V' },
          { value: '220v', label: '220V' },
          { value: '230v', label: '230V' },
          { value: '240v', label: '240V' },
          { value: 'dual', label: 'Bivolt (110-220V)' },
        ],
      },
      {
        name: 'brand',
        label: 'Marque',
        type: 'text',
        required: true,
        placeholder: 'Ex: Samsung, Apple, Sony',
      },
      {
        name: 'model',
        label: 'Modèle',
        type: 'text',
        placeholder: 'Ex: iPhone 15, Galaxy S24',
      },
      {
        name: 'condition',
        label: 'État',
        type: 'select',
        required: true,
        defaultValue: 'new',
        options: [
          { value: 'new', label: 'Neuf' },
          { value: 'open_box', label: 'Boîte ouverte' },
          { value: 'refurbished', label: 'Remis à neuf' },
          { value: 'used', label: 'Occasion' },
          { value: 'for_parts', label: 'Pour pièces' },
        ],
      },
      {
        name: 'includes_accessories',
        label: 'Accessoires inclus',
        type: 'textarea',
        placeholder: 'Chargeur, câble, manuel, etc.',
      },
      {
        name: 'technical_specs',
        label: 'Spécifications techniques',
        type: 'textarea',
        placeholder: 'Processeur, RAM, stockage, etc.',
      },
    ],
  },

  school_supplies: {
    id: 'school_supplies',
    name: 'Fournitures scolaires',
    description: 'Fournitures et matériel scolaire',
    fields: [
      {
        name: 'school_level',
        label: 'Niveau scolaire',
        type: 'select',
        required: true,
        options: [
          { value: 'kindergarten', label: 'Maternelle' },
          { value: 'primary', label: 'Primaire' },
          { value: 'middle_school', label: 'Collège' },
          { value: 'high_school', label: 'Lycée' },
          { value: 'university', label: 'Université' },
          { value: 'all', label: 'Tous niveaux' },
        ],
      },
      {
        name: 'subject',
        label: 'Matière',
        type: 'select',
        options: [
          { value: 'math', label: 'Mathématiques' },
          { value: 'french', label: 'Français' },
          { value: 'english', label: 'Anglais' },
          { value: 'science', label: 'Sciences' },
          { value: 'history', label: 'Histoire-Géographie' },
          { value: 'art', label: 'Arts plastiques' },
          { value: 'sport', label: 'EPS' },
          { value: 'music', label: 'Musique' },
          { value: 'general', label: 'Général' },
        ],
      },
      {
        name: 'grade',
        label: 'Classe',
        type: 'select',
        options: [
          { value: 'cp', label: 'CP' },
          { value: 'ce1', label: 'CE1' },
          { value: 'ce2', label: 'CE2' },
          { value: 'cm1', label: 'CM1' },
          { value: 'cm2', label: 'CM2' },
          { value: '6eme', label: '6ème' },
          { value: '5eme', label: '5ème' },
          { value: '4eme', label: '4ème' },
          { value: '3eme', label: '3ème' },
          { value: '2nde', label: '2nde' },
          { value: '1ere', label: '1ère' },
          { value: 'term', label: 'Terminale' },
        ],
      },
      {
        name: 'set_type',
        label: 'Type de fourniture',
        type: 'select',
        required: true,
        options: [
          { value: 'kit', label: 'Kit complet' },
          { value: 'individual', label: 'Article individuel' },
          { value: 'pack', label: 'Pack thématique' },
        ],
      },
      {
        name: 'age_range',
        label: 'Tranche d\'âge',
        type: 'select',
        options: [
          { value: '3-5', label: '3-5 ans' },
          { value: '6-8', label: '6-8 ans' },
          { value: '9-11', label: '9-11 ans' },
          { value: '12-14', label: '12-14 ans' },
          { value: '15-18', label: '15-18 ans' },
          { value: '18+', label: '18+ ans' },
        ],
      },
      {
        name: 'quantity',
        label: 'Quantité',
        type: 'number',
        placeholder: 'Ex: 12 (stylos), 1 (cahier)',
      },
      {
        name: 'contents',
        label: 'Contenu',
        type: 'textarea',
        placeholder: 'Liste des articles inclus dans le kit/pack',
      },
    ],
  },

  hardware: {
    id: 'hardware',
    name: 'Quincaillerie',
    description: 'Outils et matériaux de construction',
    fields: [
      {
        name: 'material',
        label: 'Matériau',
        type: 'select',
        required: true,
        options: [
          { value: 'steel', label: 'Acier' },
          { value: 'aluminum', label: 'Aluminium' },
          { value: 'wood', label: 'Bois' },
          { value: 'plastic', label: 'Plastique' },
          { value: 'brass', label: 'Laiton' },
          { value: 'copper', label: 'Cuivre' },
          { value: 'iron', label: 'Fer' },
          { value: 'composite', label: 'Composite' },
          { value: 'other', label: 'Autre' },
        ],
      },
      {
        name: 'brand',
        label: 'Marque',
        type: 'text',
        placeholder: 'Ex: Bosch, Stanley, Makita',
      },
      {
        name: 'dimensions',
        label: 'Dimensions',
        type: 'text',
        placeholder: 'Ex: 10x5x2 cm',
      },
      {
        name: 'weight',
        label: 'Poids',
        type: 'number',
        placeholder: 'En kg',
      },
      {
        name: 'condition',
        label: 'État',
        type: 'select',
        required: true,
        defaultValue: 'new',
        options: [
          { value: 'new', label: 'Neuf' },
          { value: 'used', label: 'Occasion' },
          { value: 'refurbished', label: 'Remis à neuf' },
        ],
      },
      {
        name: 'warranty',
        label: 'Garantie',
        type: 'select',
        options: [
          { value: 'no', label: 'Sans garantie' },
          { value: '3_months', label: '3 mois' },
          { value: '6_months', label: '6 mois' },
          { value: '1_year', label: '1 an' },
          { value: '2_years', label: '2 ans' },
        ],
      },
      {
        name: 'usage',
        label: 'Usage',
        type: 'select',
        options: [
          { value: 'indoor', label: 'Intérieur' },
          { value: 'outdoor', label: 'Extérieur' },
          { value: 'both', label: 'Intérieur et extérieur' },
        ],
      },
      {
        name: 'technical_specs',
        label: 'Spécifications techniques',
        type: 'textarea',
        placeholder: 'Résistance, capacité, etc.',
      },
    ],
  },

  services: {
    id: 'services',
    name: 'Services',
    description: 'Services et prestations',
    fields: [
      {
        name: 'service_type',
        label: 'Type de service',
        type: 'select',
        required: true,
        options: [
          { value: 'consulting', label: 'Conseil' },
          { value: 'repair', label: 'Réparation' },
          { value: 'delivery', label: 'Livraison' },
          { value: 'installation', label: 'Installation' },
          { value: 'maintenance', label: 'Maintenance' },
          { value: 'training', label: 'Formation' },
          { value: 'rental', label: 'Location' },
          { value: 'other', label: 'Autre' },
        ],
      },
      {
        name: 'duration',
        label: 'Durée estimée',
        type: 'text',
        placeholder: 'Ex: 2 heures, 1 jour, 1 semaine',
      },
      {
        name: 'availability',
        label: 'Disponibilité',
        type: 'select',
        options: [
          { value: 'immediate', label: 'Immédiate' },
          { value: '24h', label: 'Sous 24h' },
          { value: '48h', label: 'Sous 48h' },
          { value: 'week', label: 'Dans la semaine' },
          { value: 'appointment', label: 'Sur rendez-vous' },
        ],
      },
      {
        name: 'service_area',
        label: 'Zone de service',
        type: 'select',
        options: [
          { value: 'local', label: 'Local' },
          { value: 'regional', label: 'Régional' },
          { value: 'national', label: 'National' },
          { value: 'international', label: 'International' },
          { value: 'remote', label: 'À distance' },
        ],
      },
      {
        name: 'certifications',
        label: 'Certifications',
        type: 'textarea',
        placeholder: 'Certifications professionnelles, accréditations, etc.',
      },
      {
        name: 'experience_years',
        label: 'Années d\'expérience',
        type: 'number',
        placeholder: 'Ex: 5',
      },
    ],
  },
};

/**
 * Fonction pour obtenir la configuration d'un secteur
 */
export const getSectorConfig = (sectorId: string): SectorConfig => {
  return SECTOR_CONFIGS[sectorId] || SECTOR_CONFIGS.default;
};

/**
 * Fonction pour obtenir toutes les configurations de secteurs
 */
export const getAllSectorConfigs = (): SectorConfig[] => {
  return Object.values(SECTOR_CONFIGS);
};

/**
 * Fonction pour obtenir les secteurs disponibles
 */
export const getAvailableSectors = () => {
  return Object.values(SECTOR_CONFIGS).map(config => ({
    id: config.id,
    name: config.name,
    description: config.description,
  }));
};
