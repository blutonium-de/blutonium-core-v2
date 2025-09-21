export default function NavBar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-black/70 backdrop-blur-md z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-bold text-xl">Blutonium</a>
        <div className="flex gap-6 text-sm">
          <a href="/releases" className="hover:text-cyan-400">Releases</a>
          <a href="/artists" className="hover:text-cyan-400">Artists & Booking</a>
          <a href="/merchandise" className="hover:text-cyan-400">Merchandise</a>
          <a href="/samples" className="hover:text-cyan-400">Samples</a>
          <a href="/videos" className="hover:text-cyan-400">Videos</a>
        </div>
      </div>
    </nav>
  )
}
