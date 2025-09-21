export default function Debug() {
  return (
    <div style={{padding: 20}}>
      <h1>__DEBUG OK</h1>
      <p>Dieses Build kommt aus <code>blutonium-core-v2/app/__debug/page.tsx</code></p>
      <p>Zeitstempel: {new Date().toISOString()}</p>
    </div>
  );
}
