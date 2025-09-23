export default function Head() {
  const title = "Videos – Blutonium Records"
  const desc =
    "Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal."
  const url = "https://www.blutonium.de/videos"

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={desc} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      {/* Falls du ein Social-Share-Bild hast: */}
      {/* <meta property="og:image" content="https://www.blutonium.de/og/blutonium.jpg" /> */}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
    </>
  )
}