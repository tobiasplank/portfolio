// /src/lib/mongodb.ts
import { MongoClient, type Db } from "mongodb";

// Type-safe helper to access environment variables from either Astro or Node runtime
function getEnv(key: string): string | undefined {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const processEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    return metaEnv?.[key] ?? processEnv?.[key];
}

const host = getEnv("MONGODB_HOST");
const username = getEnv("MONGODB_USER");
const password = getEnv("MONGODB_PASSWORD");
const databaseName = getEnv("MONGODB_DB") || "";
const authSource = getEnv("MONGODB_AUTH_SOURCE");

if (!host || !username || !password || !databaseName) {
    throw new Error(
        `MONGODB_HOST, MONGODB_USER, MONGODB_PASSWORD or MONGODB_DB isn't set.`
    );
}

// Build query parameters safely without undefined values
const queryParams = new URLSearchParams();
queryParams.set("serverSelectionTimeoutMS", "7000");
queryParams.set("directConnection", "true");

if (authSource) {
    queryParams.set("authSource", authSource);
}

const uri =
    `mongodb://${encodeURIComponent(username)}:` +
    `${encodeURIComponent(password)}@${host}/` +
    `${encodeURIComponent(databaseName)}?${queryParams.toString()}`;

// Interface for globalThis cache to avoid WebStorm 'var' warnings
interface MongoGlobal {
    _mongoClientPromise?: Promise<MongoClient>;
}

const globalStore = globalThis as unknown as MongoGlobal;

const clientPromise: Promise<MongoClient> =
    globalStore._mongoClientPromise ??
    (globalStore._mongoClientPromise = new MongoClient(uri).connect());

export async function getDb(): Promise<Db> {
    const client = await clientPromise;
    return client.db(databaseName);
}