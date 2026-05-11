import { useEffect } from "react";
import type { SiteSettingsState } from "../types";

/** Sasisha document.title na meta za SEO/OG kutoka site_settings */
export function useSiteDocumentMeta(site: SiteSettingsState) {
  useEffect(() => {
    const title = site.meta_title?.trim();
    const defaultTitle = "KMK(T) Tanzania Website";
    const defaultDescription = "KMK(T) Tanzania Website — huduma za kidigitali za Kanisa la Mennonite la Kiinjili Tanzania.";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const defaultOgImage = origin ? `${origin}/apple-touch-icon.png` : "/apple-touch-icon.png";
    document.title = title || defaultTitle;

    function upsertMeta(selector: string, attrName: string, attrVal: string, content: string) {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    upsertMeta('meta[name="description"]', "name", "description", site.meta_description?.trim() || defaultDescription);
    upsertMeta('meta[name="application-name"]', "name", "application-name", document.title);

    function og(property: string, content: string) {
      const sel = `meta[property="${property}"]`;
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    const ogTitle = site.meta_title?.trim() || document.title;
    const ogDesc = site.meta_description?.trim() || defaultDescription;
    const ogImg = site.og_image_url?.trim() || defaultOgImage;
    og("og:title", ogTitle);
    og("og:description", ogDesc);
    og("og:site_name", "KMK(T) Tanzania Website");
    og("og:url", site.canonical_base_url?.trim() || (typeof window !== "undefined" ? window.location.href : ""));
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", ogTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", ogDesc);
    og("og:image", ogImg);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImg);
    og("og:type", "website");
    if (site.canonical_base_url?.trim()) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", site.canonical_base_url.trim());
    }

    const fav = site.favicon_url?.trim();
    if (fav) {
      let icon = document.querySelector("link[rel~='icon']");
      if (!icon) {
        icon = document.createElement("link");
        icon.setAttribute("rel", "icon");
        document.head.appendChild(icon);
      }
      icon.setAttribute("href", fav);
      icon.setAttribute("type", fav.endsWith(".svg") ? "image/svg+xml" : "image/png");
    }
  }, [
    site.meta_title,
    site.meta_description,
    site.og_image_url,
    site.canonical_base_url,
    site.favicon_url,
  ]);
}
