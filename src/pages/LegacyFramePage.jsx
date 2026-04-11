import { useLocation } from "react-router-dom";

/**
 * Legacy живёт в iframe. Роутер снаружи — например /property?id=5 — а iframe раньше
 * открывал только /legacy/property.html без query: внутри страницы не было id объекта,
 * отзывы и данные не совпадали с тем, что в адресной строке браузера.
 */
export default function LegacyFramePage({ file }) {
  const { search, hash } = useLocation();
  const src = `/legacy/${file}${search}${hash}`;
  return (
    <main className="legacy-page">
      <iframe
        key={src}
        className="legacy-frame"
        src={src}
        title={`legacy-${file}`}
      />
    </main>
  );
}
