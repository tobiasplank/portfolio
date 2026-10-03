// /src/lib/portfolio-cache.ts
import { getDb } from "./mongodb";

export interface Profile {
    first_name: string;
    last_name: string;
    nicknames?: string[];
    country?: string;
    location?: string;
    birthdate?: string;
    grade?: string;
    job_title?: string;
    volunteer_work?: string[];
    hobbies?: string[];
    learning?: string[];
}

export interface Position {
    grade?: string;
    title: string;
    company: string;
    logo?: string;
    badge?: string;
    description?: string;
    location_city?: string;
    location_country?: string;
    location_type?: string;
    employment_type?: string;
    start: string;
    end?: string | null;
    projects?: string[];
    certifications?: string[];
    skills?: string[];
}

export interface Contact {
    address?: string;
    phone?: string;
    mail?: string;
    vcall?: string;
    linkedin?: string;
    github?: string;
    discord?: string;
    mastodon?: string;
}

export interface PortfolioData {
    profile: Profile | null;
    experience: Position[];
    contact: Contact | null;
}

const CACHE_TTL_MS = 5_000;

interface PortfolioCache {
    expiresAt: number;
    data?: PortfolioData;
    inFlight?: Promise<PortfolioData>;
}

declare global {
    var _portfolioDataCache: PortfolioCache | undefined;
}

const cache = (globalThis._portfolioDataCache ??= {
    expiresAt: 0,
});

export async function getPortfolioData(): Promise<PortfolioData> {
    if (cache.data && Date.now() < cache.expiresAt) {
        return cache.data;
    }

    if (cache.inFlight) {
        return cache.inFlight;
    }

    cache.inFlight = (async () => {
        try {
            const db = await getDb();

            // ACHTUNG: Prüfe, ob deine Collection "profile" oder "profiles" heißt!
            const [profile, experience, contact] = await Promise.all([
                db.collection<Profile>("profile").findOne({}),
                db
                    .collection<Position>("experience")
                    .find({})
                    .sort({ start: -1 })
                    .toArray(),
                db.collection<Contact>("contact").findOne({}),
            ]);

            const data: PortfolioData = {
                profile,
                experience,
                contact,
            };

            cache.data = data;
            cache.expiresAt = Date.now() + CACHE_TTL_MS;

            return data;
        } finally {
            cache.inFlight = undefined;
        }
    })();

    return cache.inFlight;
}