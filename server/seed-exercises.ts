import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db";
import { exercises } from "../shared/schema";
import { eq, and, isNull } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
    try {
        const csvPath = path.resolve(__dirname, "../exercises-seed.csv");
        if (!fs.existsSync(csvPath)) {
            console.error(`CSV file not found at ${csvPath}`);
            process.exit(1);
        }

        // Step 1: Clear existing system exercises for a clean reseed
        console.log("Clearing existing system exercises...");
        await db.delete(exercises).where(eq(exercises.isSystem, true));
        console.log("Done clearing.");

        const content = fs.readFileSync(csvPath, "utf8");
        const lines = content.split("\n").filter(line => line.trim() !== "");

        if (lines.length < 2) {
            console.log("No data found in CSV to seed.");
            process.exit(0);
        }

        // Detect column positions from header
        const header = lines[0].split("|");
        const indices = {
            name: header.findIndex(h => h.trim().toLowerCase() === "name"),
            category: header.findIndex(h => h.trim().toLowerCase() === "category"),
            notes: header.findIndex(h => h.trim().toLowerCase() === "notes"),
            url: header.findIndex(h => h.trim().toLowerCase() === "url")
        };

        console.log(`Found ${lines.length - 1} potential exercises to seed.`);

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split("|");
            const name = values[indices.name]?.trim();
            const category = values[indices.category]?.trim() || null;
            const notes = values[indices.notes]?.trim() || null;
            const url = values[indices.url]?.trim() || null;

            if (!name) continue;

            await db.insert(exercises).values({
                name,
                category: category || undefined,
                notes: notes || undefined,
                url: url || undefined,
                isSystem: true,
                userId: null
            });
            console.log(`✅ Seeded: ${name}`);
        }

        console.log("Seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seed();
