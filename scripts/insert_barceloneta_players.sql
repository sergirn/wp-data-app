-- Script para añadir jugadores del CN Barcelona al club_id 4
-- Ejecutar este script en Supabase SQL Editor

INSERT INTO players (club_id, name, number, is_goalkeeper, created_at) VALUES
(4, 'Alberto Munarriz Egaña', 7, false, NOW()),
(4, 'Alejandro Bustos Sanchez', 2, false, NOW()),
(4, 'Alessandro Velotto', 3, false, NOW()),
(4, 'Bernat Sanahuja Carne', 4, false, NOW()),
(4, 'Biel Gomila Faiges', 5, false, NOW()),
(4, 'Bruno Delmas Tortorella', 13, true, NOW()),
(4, 'Daniel Merida Orozco', 6, false, NOW()),
(4, 'Enzo Fernandez Perrier', 19, false, NOW()),
(4, 'Gergely Zoltan Burian', 8, false, NOW()),
(4, 'Gonzalo Oscar Echenique Saglietti', 9, false, NOW()),
(4, 'Hugo Martin Moron', 10, false, NOW()),
(4, 'Jose Javier Bustos Sanchez', 11, false, NOW()),
(4, 'Marc Valls Ferrer', 12, false, NOW()),
(4, 'Max Casabella Belles', 14, false, NOW()),
(4, 'Roger Tahull Compte', 15, false, NOW()),
(4, 'Unai Aguirre Rubio', 1, true, NOW()),
(4, 'Unai Biel Lara', 16, false, NOW()),
(4, 'Unai Lema Llapur', 17, false, NOW()),
(4, 'Vince Pal Vigvari', 18, false, NOW());

-- Verificar los jugadores insertados
SELECT id, name, number, is_goalkeeper 
FROM players 
WHERE club_id = 4 
ORDER BY number;
