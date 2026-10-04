// src/lib/portfolio-cache.ts
import { getDb } from "./mongodb";
import { defaultLocale, type locale } from "@/lib/i18n/locales";

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
    grade?: string | null;
    title: string;
    company: string;
    logo?: string;
    badge?: string;
    description?: string;
    location_city?: string;
    location_country?: string;
    location_type?: string | null;
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

interface ProfileTranslation {
    grade?: string;
    job_title?: string;
    volunteer_work?: string[];
    hobbies?: string[];
    learning?: string[];
}

interface PositionTranslation {
    grade?: string | null;
    title?: string;
    description?: string;
    location_type?: string | null;
    employment_type?: string;
}

interface RawProfile extends Profile {
    translations?: Partial<Record<locale, Partial<ProfileTranslation>>>;
}

interface RawPosition extends Omit<
    Position,
    "grade" | "title" | "description" | "location_type" | "employment_type"
> {
    grade?: string | null;
    title?: string;
    description?: string;
    location_type?: string | null;
    employment_type?: string;
    translations?: Partial<Record<locale, Partial<PositionTranslation>>>;
}

interface RawPortfolioData {
    profile: RawProfile | null;
    experience: RawPosition[];
    contact: Contact | null;
}

const CACHE_TTL_MS = 5_000;

interface PortfolioCache {
    expiresAt: number;
    data?: RawPortfolioData;
    inFlight?: Promise<RawPortfolioData>;
}

const cache: PortfolioCache = {
    expiresAt: 0,
};

function getLocalizedFields<T extends object>(
    translations: Partial<Record<locale, Partial<T>>> | undefined,
    currentLocale: locale,
): Partial<T> {
    return {
        ...translations?.[defaultLocale],
        ...translations?.[currentLocale],
    };
}

async function getRawPortfolioData(): Promise<RawPortfolioData> {
    if (cache.data && Date.now() < cache.expiresAt) {
        return cache.data;
    }

    if (!cache.inFlight) {
        cache.inFlight = (async () => {
            try {
                const db = await getDb();

                const [profile, experience, contact] = await Promise.all([
                    db.collection<RawProfile>("profile").findOne({}),
                    db
                        .collection<RawPosition>("experience")
                        .find({})
                        .sort({ start: -1 })
                        .toArray(),
                    db.collection<Contact>("contact").findOne({}),
                ]);

                const data: RawPortfolioData = {
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
    }

    return cache.inFlight;
}

export async function getPortfolioData(
    currentLocale: locale = defaultLocale,
): Promise<PortfolioData> {
    const rawData = await getRawPortfolioData();

    const profile = rawData.profile
        ? (() => {
            const { translations, ...baseProfile } = rawData.profile;

            return {
                ...baseProfile,
                ...getLocalizedFields<ProfileTranslation>(
                    translations,
                    currentLocale,
                ),
            };
        })()
        : null;

    const experience: Position[] = rawData.experience.map((position) => {
        const { translations, ...basePosition } = position;

        const localizedFields = getLocalizedFields<PositionTranslation>(
            translations,
            currentLocale,
        );

        return {
            ...basePosition,
            ...localizedFields,
            title:
                localizedFields.title ??
                basePosition.title ??
                translations?.[defaultLocale]?.title ??
                "",
        };
    });

    return {
        profile,
        experience,
        contact: rawData.contact,
    };
}