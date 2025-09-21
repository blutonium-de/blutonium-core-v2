import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative w-full h-screen">
      <Image
        src="/hero.jpg"
        alt="Blutonium Boy performing live"
        fill
        className="object-cover object-center"
        priority
      />

      {/* Overlay mit Verlauf */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {/* Text-Zone */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="backdrop-blur-sm bg-black/30 px-6 py-4 rounded-2xl shadow-lg">
          <h1 className="text-white text-4xl md:text-6xl font-bold tracking-wide text-center drop-shadow-xl">
            Blutonium Records
          </h1>
          <p className="text-gray-200 text-lg md:text-2xl text-center mt-4">
            Hardstyle • Trance • Techno Legacy
          </p>
        </div>
      </div>
    </section>
  );
}
