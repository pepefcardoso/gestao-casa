import { eq } from "drizzle-orm";
import { hashPassword } from "../../../shared-logic/src/utils/auth-helpers";
import { db, pool } from "./index";
import { houseMemberships, houses, users } from "./schema";

const FALLBACK_HOUSE_ID = "9519c5f5-e74b-49dc-88d9-e484fda2c3c2";

const SEED_USERS = [
  {
    id: "a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0",
    name: "Alice (Proprietária)",
    email: "alice@exemplo.com",
    passwordHash: hashPassword("senha123"),
  },
  {
    id: "b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0",
    name: "Bob (Colaborador)",
    email: "bob@exemplo.com",
    passwordHash: hashPassword("senha123"),
  },
  {
    id: "c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0",
    name: "Charlie (Visualizador)",
    email: "charlie@exemplo.com",
    passwordHash: hashPassword("senha123"),
  },
];

const SEED_MEMBERSHIPS = [
  {
    id: "d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0",
    userId: "a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0",
    houseId: FALLBACK_HOUSE_ID,
    role: "OWNER",
  },
  {
    id: "e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0",
    userId: "b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0",
    houseId: FALLBACK_HOUSE_ID,
    role: "COLLABORATOR",
  },
  {
    id: "f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0",
    userId: "c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0",
    houseId: FALLBACK_HOUSE_ID,
    role: "VIEWER",
  },
];

export async function runSeeding(): Promise<void> {
  console.log("Seeding database...");
  try {
    // 1. Ensure the default house exists
    await db
      .insert(houses)
      .values({
        id: FALLBACK_HOUSE_ID,
        name: "Minha Casa",
        location: "São Paulo - SP",
      })
      .onConflictDoNothing();

    // 2. Insert Seed Users
    for (const u of SEED_USERS) {
      await db
        .insert(users)
        .values(u)
        .onConflictDoUpdate({
          target: users.email,
          set: { name: u.name, passwordHash: u.passwordHash },
        });
    }

    // 3. Insert Seed Memberships
    for (const m of SEED_MEMBERSHIPS) {
      const [existing] = await db
        .select()
        .from(houseMemberships)
        .where(eq(houseMemberships.id, m.id));

      if (!existing) {
        await db.insert(houseMemberships).values(m);
      } else {
        await db
          .update(houseMemberships)
          .set({ role: m.role })
          .where(eq(houseMemberships.id, m.id));
      }
    }

    console.log("Database seeded successfully!");
  } catch (error: unknown) {
    console.error("Seeding failed:", error);
    throw error;
  }
}

// Allow running from the command line
if (require.main === module) {
  (async (): Promise<void> => {
    try {
      await runSeeding();
      process.exit(0);
    } catch {
      process.exit(1);
    } finally {
      await pool.end();
    }
  })();
}
