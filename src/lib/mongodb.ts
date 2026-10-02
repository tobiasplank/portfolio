// /src/lib/mongodb.ts
import { MongoClient, type Db } from "mongodb";

const host = import.meta.env.MONGODB_HOST;
const username = import.meta.env.MONGODB_USER;
const password = import.meta.env.MONGODB_PASSWORD;
const databaseName = import.meta.env.MONGODB_DB;
const authSource = import.meta.env.MONGODB_AUTH_SOURCE;

if (!host || !username || !password) {
    throw new Error(
        "MONGODB_HOST, MONGODB_USER or MONGODB_PASSWORD isn't set."
    );
}

const queryParams: Record<string, string> = {
    serverSelectionTimeoutMS: "7000",
    directConnection: "true", // Erzwingt die direkte IP-Verbindung
};

if (authSource) {
    queryParams.authSource = authSource;
}

const query = new URLSearchParams(queryParams);

const uri =
    `mongodb://${encodeURIComponent(username)}:` +
    `${encodeURIComponent(password)}@${host}/` +
    `${encodeURIComponent(databaseName)}?${query.toString()}`;

const debugUri = uri.replace(/:([^:@]+)@/, ":****@");
console.log("Connecting to MongoDB with URI:", debugUri);

declare global {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise =
    globalThis._mongoClientPromise ??
    (globalThis._mongoClientPromise = new MongoClient(uri).connect());

export async function getDb(): Promise<Db> {
    const client = await clientPromise;
    return client.db(databaseName);
}