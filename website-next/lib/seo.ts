import type {Metadata} from "next";

export const siteConfig = {
    name: "Q3JS",
    url: "https://q3.tsal.al",
    defaultTitle: "KOB Q3 SERVER",
    description: "",
    ogImage: "/og-cover.jpg",
    locale: "en_US",
    keywords: [],
};

export const siteOgImage = {
    url: siteConfig.ogImage,
    width: 1200,
    height: 630,
    alt: "",
} as const;

export function absoluteUrl(path: string) {
    if (path === "/") {
        return siteConfig.url;
    }

    return `${siteConfig.url}${path}`;
}

export function buildPageMetadata(input: {
    title: string;
    description: string;
    path: string;
    keywords?: string[];
    robots?: Metadata["robots"];
}): Metadata {
    const canonicalUrl = absoluteUrl(input.path);
    const pageTitle = `${input.title} | ${siteConfig.name}`;
    const keywords = input.keywords ?? siteConfig.keywords;

    return {
        title: input.title,
        description: input.description,
        keywords,
        alternates: {
            canonical: input.path,
        },
        openGraph: {
            title: pageTitle,
            description: input.description,
            url: canonicalUrl,
            siteName: siteConfig.name,
            locale: siteConfig.locale,
            type: "website",
            images: [siteOgImage],
        },
        twitter: {
            card: "summary_large_image",
            title: pageTitle,
            description: input.description,
            images: [siteConfig.ogImage],
        },
        robots: input.robots,
    };
}
