import { useEffect } from "react";
import type { SiteSettingsState } from "../types";

/** Sasisha document.title na meta za SEO/OG kutoka site_settings */
export function useSiteDocumentMeta(site: SiteSettingsState) {
  useEffect(() => {
    const title = site.meta_title?.trim();
    document.title = title || "KMK(T) Internal Portal";

    function upsertMeta(selector: string, attrName: string, attrVal: string, content: string) {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    upsertMeta('meta[name="description"]', "name", "description", site.meta_description?.trim() || "");

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
    const ogDesc = site.meta_description?.trim() || "";
    const ogImg = site.og_image_url?.trim() || "";
    og("og:title", ogTitle);
    og("og:description", ogDesc);
    if (ogImg) {
      og("og:image", ogImg);
      og("og:type", "website");
    }
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
