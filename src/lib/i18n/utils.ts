import { defaultLocale, type locale } from "./locales";
import { ui, type translationKey } from "./ui";

export function useTranslations(locale: locale) {
    return (
        key: translationKey,
        params: Record<string, string | number> = {},
    ) => {
        const template = ui[locale][key] ?? ui[defaultLocale][key];

        return template.replace(/\{(\w+)}/g, (_, name: string) =>
            String(params[name] ?? `{${name}}`),
        );
    };
}