"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = void 0;
const db_1 = require("../db");
const createUser = async (name, email, passwordHash, role) => {
    const pool = await db_1.poolPromise;
    const query = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role, created_at
  `;
    const values = [name, email, passwordHash, role];
    const result = await pool.query(query, values);
    return result.rows[0];
};
exports.createUser = createUser;
//# sourceMappingURL=userRepository.js.map