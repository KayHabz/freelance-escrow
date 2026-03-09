import { poolPromise } from "../db";

export const createUser = async (
  name: string,
  email: string,
  passwordHash: string,
  role: string
) => {
  const pool = await poolPromise;
  const query = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role, created_at
  `;

  const values = [name, email, passwordHash, role];

  const result = await pool.query(query, values);
  return result.rows[0];
};