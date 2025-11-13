-- Insert the players for Club Natació Sant Andreu
-- Initial squad of 14 players + 3 additional players (17 total)
INSERT INTO players (number, name, is_goalkeeper) VALUES
  (1, 'Marc Rodríguez', true),
  (2, 'Pol Fernández', false),
  (3, 'Arnau García', false),
  (4, 'Jordi Martínez', false),
  (5, 'Sergi López', false),
  (6, 'David Sánchez', false),
  (7, 'Albert Pérez', false),
  (8, 'Roger Gómez', false),
  (9, 'Pau Ruiz', false),
  (10, 'Oriol Jiménez', false),
  (11, 'Àlex Moreno', false),
  (12, 'Gerard Navarro', false),
  (13, 'Dani Torres', true),
  (14, 'Ivan Romero', false),
  -- Adding 3 additional players to the roster
  (15, 'Carles Vila', false),
  (16, 'Miquel Soler', false),
  (17, 'Adrià Camps', true)
ON CONFLICT (number) DO NOTHING;
