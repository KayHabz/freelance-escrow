import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { createUser } from "../repositories/userRepository";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser(name, email, hashedPassword, role);

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating user" });
  }
};