-- Système de lots pour gérer les expirations avec FEFO (First Expired First Out)
-- Chaque lot a sa propre date d'expiration et quantité
-- Permet de vendre les lots non expirés même si d'autres lots sont expirés

CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES physical_shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES physical_shop_products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    expiry_date DATE,
    sector_data JSONB DEFAULT '{}',
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    supplier_order_id UUID REFERENCES supplier_orders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_product_batches_product ON product_batches(product_id);
CREATE INDEX idx_product_batches_shop ON product_batches(shop_id);
CREATE INDEX idx_product_batches_expiry ON product_batches(expiry_date);
CREATE INDEX idx_product_batches_batch_number ON product_batches(batch_number);

-- Contrainte unique : numéro de lot unique par produit dans une boutique
CREATE UNIQUE INDEX idx_product_batches_unique_batch ON product_batches(shop_id, product_id, batch_number);

-- Commentaires
COMMENT ON TABLE product_batches IS 'Lots de produits avec dates d''expiration pour gestion FEFO';
COMMENT ON COLUMN product_batches.batch_number IS 'Numéro de lot (généré automatiquement si non renseigné)';
COMMENT ON COLUMN product_batches.expiry_date IS 'Date d''expiration du lot';
COMMENT ON COLUMN product_batches.sector_data IS 'Données spécifiques au secteur (date de péremption, dosage, etc.)';

-- Fonction pour générer un numéro de lot automatiquement
CREATE OR REPLACE FUNCTION generate_batch_number(p_shop_id UUID, p_product_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_base_number TEXT;
    v_count INTEGER;
    v_batch_number TEXT;
BEGIN
    -- Générer un numéro de lot basé sur la date actuelle + ID produit
    v_base_number := TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(p_product_id::TEXT, 1, 8);
    
    -- Compter les lots existants avec ce préfixe aujourd'hui
    SELECT COUNT(*) INTO v_count
    FROM product_batches
    WHERE shop_id = p_shop_id
      AND product_id = p_product_id
      AND batch_number LIKE v_base_number || '%';
    
    -- Ajouter un suffixe si plusieurs lots le même jour
    IF v_count > 0 THEN
        v_batch_number := v_base_number || '-' || LPAD((v_count + 1)::TEXT, 3, '0');
    ELSE
        v_batch_number := v_base_number;
    END IF;
    
    RETURN v_batch_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_product_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_batches_updated_at
    BEFORE UPDATE ON product_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_product_batches_updated_at();

-- Fonction pour obtenir le stock disponible (lots non expirés)
CREATE OR REPLACE FUNCTION get_available_stock(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_available_stock INTEGER;
BEGIN
    SELECT COALESCE(SUM(quantity), 0) INTO v_available_stock
    FROM product_batches
    WHERE product_id = p_product_id
      AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE);
    
    RETURN v_available_stock;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le stock expiré
CREATE OR REPLACE FUNCTION get_expired_stock(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_expired_stock INTEGER;
BEGIN
    SELECT COALESCE(SUM(quantity), 0) INTO v_expired_stock
    FROM product_batches
    WHERE product_id = p_product_id
      AND expiry_date IS NOT NULL
      AND expiry_date <= CURRENT_DATE;
    
    RETURN v_expired_stock;
END;
$$ LANGUAGE plpgsql;
