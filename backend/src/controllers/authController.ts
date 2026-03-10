import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { poolPromise } from "../db";

export const registerUser = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const { name, email, password, role } = req.body;

    // Basic validation: all fields are required for registration
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role are required" });
    }

    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, role`,
      [name, email, passwordHash, role]
    );

    const user = userResult.rows[0];

    // Automatically create wallet
    await client.query(
      `INSERT INTO wallets (user_id, balance)
       VALUES ($1, $2)`,
      [user.id, 0]
    );

    await client.query("COMMIT");

    res.status(201).json(user);

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("registerUser error:", error);

    // handle unique constraint violation for email
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

    const result = await pool.query(
      `SELECT * FROM users WHERE email=$1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    // ✅ Return role alongside token
    res.json({ token, role: user.role });

  } catch (error) {
    console.error("loginUser error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};