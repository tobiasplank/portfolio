// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import { getRelativeLocaleUrl } from "astro:i18n";
import {
    defaultLocale,
    locales,
    type locale,
} from "@/lib/i18n/locales";

function getPreferredLocale(acceptLanguage: string | null): locale {
    if (!acceptLanguage) return defaultLocale;

    const supported = locales.map(({ code }) => code);

    const languages = acceptLanguage
        .split(",")
        .map((item, index) => {
            const [tag, ...parameters] = item.trim().split(";");
            const qParameter = parameters.find((parameter) =>
                parameter.trim().startsWith("q="),
            );
            const quality = qParameter
                ? Number(qParameter.trim().slice(2))
                : 1;

            return { tag: tag.toLowerCase(), quality, index };
        })
        .filter(({ tag, quality }) => tag !== "" && tag !== "*" && quality > 0)
        .sort((a, b) => b.quality - a.quality || a.index - b.index);

    for (const { tag } of languages) {
        const exact = supported.find((code) => code.toLowerCase() === tag);
        if (exact) return exact;

        const baseLanguage = tag.split("-")[0];
        const baseMatch = supported.find(
            (code) => code.toLowerCase() === baseLanguage,
        );
        if (baseMatch) return baseMatch;
    }

    return defaultLocale;
}

function getLocaleFromPath(pathname: string): locale | undefined {
    const firstSegment = pathname.split("/")[1];

    return locales.find(({ code }) => code === firstSegment)?.code;
}

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname, search } = context.url;
    const pathLocale = getLocaleFromPath(pathname);

    // Not localized path: /about -> /en/about or /de/about.
    if (!pathLocale) {
        const preferredLocale = getPreferredLocale(
            context.request.headers.get("accept-language"),
        );

        const pathWithoutLeadingSlash = pathname.replace(/^\/+/, "");
        const localizedPath = pathWithoutLeadingSlash
            ? getRelativeLocaleUrl(preferredLocale, pathWithoutLeadingSlash)
            : getRelativeLocaleUrl(preferredLocale);

        const target = new URL(localizedPath, context.url);
        target.search = search;

        const response = context.redirect(target.pathname + target.search, 302);
        response.headers.set("Vary", "Accept-Language");

        return response;
    }

    // Path is already localized: /en/about or /de/about.
    const response = await next();

    // Prevents a redirect from /en/404 or /de/404 to itself.
    const normalizedPath = pathname.replace(/\/+$/, "");
    const isLocale404Page = normalizedPath === `/${pathLocale}/404`;

    if (response.status === 404 && !isLocale404Page) {
        return context.redirect(getRelativeLocaleUrl(pathLocale, "404"), 302);
    }

    return response;
});