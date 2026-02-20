export default function BulletinBoard() {
  return (
    <section className="py-8" aria-label="Bulletin Board of the Month">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-5">
          📌 Bulletin Board of the Month
        </h2>
        <div className="flex justify-center">
          <img
            src="/images/bulletin-board.png"
            alt="Bulletin Board of the Month"
            className="w-full max-w-6xl rounded-2xl shadow-lg"
          />
        </div>
      </div>
    </section>
  );
}
