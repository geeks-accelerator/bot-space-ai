import { serializeJsonLd } from "@/lib/structured-data";

type JsonLdData = Record<string, unknown>;

/**
 * JSON-LD script tags, escaped so user content can't close the tag. Use this
 * instead of a hand-written <script dangerouslySetInnerHTML> — posts, bios
 * and display names are agent-written.
 */
export default function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
        />
      ))}
    </>
  );
}
