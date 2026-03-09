
-- Add barcode column to physical_shop_products with auto-generation
ALTER TABLE public.physical_shop_products 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Function to generate a unique barcode (EAN-13 style prefix + random)
CREATE OR REPLACE FUNCTION public.generate_product_barcode()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_barcode TEXT;
  barcode_exists BOOLEAN;
BEGIN
  IF NEW.barcode IS NULL OR NEW.barcode = '' THEN
    LOOP
      -- Generate 13-digit barcode: prefix 200 (internal use) + 9 random digits + check digit
      new_barcode := '200' || lpad(floor(random() * 1000000000)::text, 9, '0');
      -- Add simple check digit (sum mod 10)
      new_barcode := new_barcode || (10 - (
        (
          CAST(substr(new_barcode, 1, 1) AS INT) +
          CAST(substr(new_barcode, 2, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 3, 1) AS INT) +
          CAST(substr(new_barcode, 4, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 5, 1) AS INT) +
          CAST(substr(new_barcode, 6, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 7, 1) AS INT) +
          CAST(substr(new_barcode, 8, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 9, 1) AS INT) +
          CAST(substr(new_barcode, 10, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 11, 1) AS INT) +
          CAST(substr(new_barcode, 12, 1) AS INT) * 3
        ) % 10
      ) % 10)::text;

      SELECT EXISTS(SELECT 1 FROM public.physical_shop_products WHERE barcode = new_barcode) INTO barcode_exists;
      EXIT WHEN NOT barcode_exists;
    END LOOP;
    NEW.barcode := new_barcode;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate barcode on insert
DROP TRIGGER IF EXISTS trg_generate_barcode ON public.physical_shop_products;
CREATE TRIGGER trg_generate_barcode
  BEFORE INSERT ON public.physical_shop_products
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_product_barcode();

-- Generate barcodes for existing products that don't have one
DO $$
DECLARE
  r RECORD;
  new_barcode TEXT;
  barcode_exists BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM public.physical_shop_products WHERE barcode IS NULL LOOP
    LOOP
      new_barcode := '200' || lpad(floor(random() * 1000000000)::text, 9, '0');
      new_barcode := new_barcode || (10 - (
        (
          CAST(substr(new_barcode, 1, 1) AS INT) +
          CAST(substr(new_barcode, 2, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 3, 1) AS INT) +
          CAST(substr(new_barcode, 4, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 5, 1) AS INT) +
          CAST(substr(new_barcode, 6, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 7, 1) AS INT) +
          CAST(substr(new_barcode, 8, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 9, 1) AS INT) +
          CAST(substr(new_barcode, 10, 1) AS INT) * 3 +
          CAST(substr(new_barcode, 11, 1) AS INT) +
          CAST(substr(new_barcode, 12, 1) AS INT) * 3
        ) % 10
      ) % 10)::text;

      SELECT EXISTS(SELECT 1 FROM public.physical_shop_products WHERE barcode = new_barcode) INTO barcode_exists;
      EXIT WHEN NOT barcode_exists;
    END LOOP;
    UPDATE public.physical_shop_products SET barcode = new_barcode WHERE id = r.id;
  END LOOP;
END;
$$;
