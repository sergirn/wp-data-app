-- Update club logo URLs to match the actual file paths
UPDATE clubs 
SET logo_url = '/logos/cn-sant-andreu.png'
WHERE short_name = 'CN Sant Andreu';

UPDATE clubs 
SET logo_url = '/logos/cn-barcelona.png'
WHERE short_name = 'CN Barcelona';

UPDATE clubs 
SET logo_url = '/logos/ce-mediterrani.webp'
WHERE short_name = 'CE Mediterrani';

-- Verify the updates
SELECT id, short_name, logo_url FROM clubs ORDER BY id;
