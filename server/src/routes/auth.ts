import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signToken, requireAuth, AuthedRequest } from "../lib/auth";

export const authRouter = Router();

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

authRouter.post("/signup", async (req, res) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });
  const token = signToken({ userId: user.id });
  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

authRouter.post("/login", async (req, res) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ userId: user.id });
  res.json({ token, user: { id: user.id, email: user.email } });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: { id: user.id, email: user.email } });
});
