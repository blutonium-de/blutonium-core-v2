export default function Head() {
  const title = "Releases – Blutonium Records"
  const desc =
    "Alle Veröffentlichungen von Blutonium Records – neueste zuerst, gefiltert nach Jahr und Typ."
  const url = "https://www.blutonium.de/releases"

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={desc} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      {/* <meta property="og:image" content="https://www.blutonium.de/og/blutonium.jpg" /> */}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
    </>
  )
}