import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
	throw new Error("DATABASE_URL environment variable is not set");

// Single client. RLS dropped - app-level ownership filters (eq(userId, user.id))
// in every query enforce row isolation. No GUC plumbing needed.
export const db = drizzle(new Pool({ connectionString }), { schema });
