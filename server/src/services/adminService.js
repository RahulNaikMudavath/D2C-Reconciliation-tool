
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "../config/database.js";
import { generateToken } from "./authService.js";

function isValidSetupKey(providedKey) {
  const expectedKey = process.env.ADMIN_SETUP_KEY;

  if (!expectedKey || !providedKey) {
    return false;
  }

  const provided = Buffer.from(providedKey);
  const expected = Buffer.from(expectedKey);

  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

export async function createCofounder({
  name,
  email,
  password,
  setupKey,
}) {
  if (!isValidSetupKey(setupKey)) {
    throw new Error("INVALID_SETUP_KEY");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.$transaction(
      async (tx) => {
        const existingCofounder = await tx.user.findFirst({
          where: { role: "CO_FOUNDER" },
        });

        if (existingCofounder) {
          throw new Error("COFOUNDER_ALREADY_EXISTS");
        }

        const existingUser = await tx.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw new Error("EMAIL_ALREADY_EXISTS");
        }

        return tx.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: "CO_FOUNDER",
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return {
      user,
      token: generateToken(user),
    };
  } catch (error) {
    if (
      error.message === "COFOUNDER_ALREADY_EXISTS" ||
      error.message === "EMAIL_ALREADY_EXISTS"
    ) {
      throw error;
    }

    if (error.code === "P2034") {
      throw new Error("COFOUNDER_SETUP_CONFLICT");
    }

    if (error.code === "P2002") {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
}
