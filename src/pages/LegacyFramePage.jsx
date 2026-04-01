export default function LegacyFramePage({ file }) {
  return (
    <main className="legacy-page">
      <iframe
        key={file}
        className="legacy-frame"
        src={`/legacy/${file}`}
        title={`legacy-${file}`}
      />
    </main>
  );
}
