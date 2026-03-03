-- Add CPF column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cpf TEXT;
