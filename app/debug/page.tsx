export default function Debug2() {
  return (
    <div style={{ padding: 20 }}>
      <h1>/debug OK</h1>
      <p>Dieses Build kommt aus <code>app/debug/page.tsx</code></p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  )
}
