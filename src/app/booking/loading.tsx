export default function BookingLoading() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 h-4 w-32 animate-pulse bg-charcoal-light" />
          <div className="mx-auto mb-4 h-10 w-64 animate-pulse bg-charcoal-light" />
          <div className="mx-auto h-4 w-80 animate-pulse bg-charcoal-light" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse border border-charcoal-light bg-charcoal"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
