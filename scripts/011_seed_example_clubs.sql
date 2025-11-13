-- Add CE Mediterrani as an example second club
INSERT INTO public.clubs (name, short_name, logo_url, primary_color, secondary_color)
VALUES (
  'Club Esportiu Mediterrani',
  'CE Mediterrani',
  '/placeholder.svg?height=100&width=100',
  '#dc2626',
  '#ef4444'
)
ON CONFLICT DO NOTHING;

-- Add CN Barcelona as another example club
INSERT INTO public.clubs (name, short_name, logo_url, primary_color, secondary_color)
VALUES (
  'Club Natació Barcelona',
  'CN Barcelona',
  '/placeholder.svg?height=100&width=100',
  '#16a34a',
  '#22c55e'
)
ON CONFLICT DO NOTHING;

-- Note: This script adds example clubs for demonstration purposes.
-- In production, you would add real clubs through an admin interface.
-- Users and data remain isolated per club through Row Level Security policies.
