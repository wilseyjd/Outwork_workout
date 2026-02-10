import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { users, sessions } from "@shared/models/auth";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName, acceptTerms } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (!acceptTerms) {
        return res.status(400).json({ message: "You must accept the Terms of Use and Privacy Policy" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        termsAcceptedAt: new Date(),
      }).returning();

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        req.session.userId = newUser.id;
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ message: "Failed to save session" });
          }
          const { password: _, ...userWithoutPassword } = newUser;
          res.status(201).json(userWithoutPassword);
        });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        req.session.userId = user.id;
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ message: "Failed to save session" });
          }
          const { password: _, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);

      if (!user) {
        req.session.destroy(() => { });
        return res.status(401).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Change password for logged-in users
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).session.userId;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, userId));

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Request password reset (forgot password)
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      // Don't reveal if user exists or not for security
      if (!user) {
        return res.json({ message: "If an account exists with that email, a reset link has been sent" });
      }

      // Generate a random token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");

      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Import passwordResetTokens from auth models
      const { passwordResetTokens } = await import("@shared/models/auth");

      // Delete any existing tokens for this user
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

      // Create new reset token
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // For local development, log the token to console
      // In production, this would send an email
      console.log("\n=== PASSWORD RESET TOKEN ===");
      console.log(`Email: ${email}`);
      console.log(`Token: ${token}`);
      console.log(`Expires: ${expiresAt.toISOString()}`);
      console.log("============================\n");

      res.json({ message: "If an account exists with that email, a reset link has been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const { passwordResetTokens } = await import("@shared/models/auth");

      // Find the reset token
      const [resetToken] = await db.select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token))
        .limit(1);

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, resetToken.userId));

      // Delete the used token
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/auth/accept-terms", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [updatedUser] = await db.update(users)
        .set({ termsAcceptedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Accept terms error:", error);
      res.status(500).json({ message: "Failed to accept terms" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function getUserId(req: Express.Request): string {
  return (req as any).session.userId;
}
