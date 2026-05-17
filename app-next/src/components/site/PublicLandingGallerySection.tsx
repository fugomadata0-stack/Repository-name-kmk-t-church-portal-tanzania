import { motion } from "framer-motion";
import { Images } from "lucide-react";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";
import type { PublicGalleryRow } from "../../services/publicLandingService";

export function PublicLandingGallerySection({
  items,
  loading,
}: {
  items: PublicGalleryRow[];
  loading?: boolean;
}) {
  return (
    <section
      id="public-gallery"
      className="relative z-10 mx-auto w-full max-w-[min(100%,96rem)] scroll-mt-24 px-3 py-10 sm:px-6 lg:px-8"
      aria-labelledby="public-gallery-title"
    >
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/90">Picha</p>
        <h2 id="public-gallery-title" className="font-kmkt-display mt-2 text-2xl font-bold text-white md:text-3xl">
          Gallery ya Kanisa
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">Matukio, ibada na maisha ya jumuiya — picha za umma.</p>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/10" aria-hidden />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
          Picha za gallery zitawekwa kutoka mipangilio ya tovuti au moduli ya Gallery (weka is_public = true).
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <motion.figure
              key={item.id}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ delay: i * 0.04 }}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-white/15 bg-[#061633] shadow-lg ring-1 ring-white/10"
            >
              <ResponsiveLazyImage
                src={item.image_url}
                alt={item.title || "Picha ya gallery"}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                width={400}
                height={400}
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-2">
                <p className="text-xs font-semibold text-white line-clamp-1">{item.title}</p>
                {item.category ? <p className="text-[10px] text-amber-200/90">{item.category}</p> : null}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      )}
      {!loading && items.length > 0 ? (
        <p className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-500">
          <Images className="h-3.5 w-3.5" aria-hidden />
          {items.length} picha za umma
        </p>
      ) : null}
    </section>
  );
}
