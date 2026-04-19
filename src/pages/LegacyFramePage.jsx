import { useLocation } from "react-router-dom";

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
