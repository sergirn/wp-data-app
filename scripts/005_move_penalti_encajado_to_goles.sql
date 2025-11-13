-- Move penalti_encajado from faltas to goles section for goalkeepers
ALTER TABLE match_stats 
RENAME COLUMN portero_faltas_penalti_encajado TO portero_goles_penalti_encajado;
