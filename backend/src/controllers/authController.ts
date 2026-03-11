import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { poolPromise } from "../db";

// ── Helpers ────────────────────────────────────────────
const VALID_ROLES   = ["client", "freelancer"];
const EMAIL_REGEX   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export const registerUser = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const { name, email, password, role } = req.body;

    // ✅ All fields required
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role are required" });
    }

    // ✅ Name must be non-empty string
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Invalid name" });
    }

    // ✅ Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // ✅ Enforce minimum password length
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      });
    }

    // ✅ Prevent role escalation — only client/freelancer allowed
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Role must be 'client' or 'freelancer'" });
    }

    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, role]
    );

    const user = userResult.rows[0];

    // Automatically create wallet
    await client.query(
      `INSERT INTO wallets (user_id, balance)
       VALUES ($1, 0)`,
      [user.id]
    );

    await client.query("COMMIT");

    res.status(201).json(user);

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("registerUser error:", error);

    if (error.code === "23505") {
      return res.status(409).json({ message: "Email already in use" });
    }

    res.status(500).json({ message: "Registration failed" });
  } finally {
    client.release();
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // ✅ Normalise email before lookup
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // ✅ Same error message for missing user or wrong password (prevents user enumeration)
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    res.json({ token, role: user.role });

  } catch (error) {
    console.error("loginUser error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};