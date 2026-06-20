export default function IntakeLoading() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-4 w-32 animate-pulse bg-charcoal-light" />
          <div className="mx-auto mb-4 h-10 w-48 animate-pulse bg-charcoal-light" />
        </div>
        <div className="mb-8 h-20 animate-pulse border border-charcoal-light bg-charcoal" />
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="mb-2 h-4 w-40 animate-pulse bg-charcoal-light" />
              <div className="h-20 animate-pulse border border-charcoal-light bg-charcoal" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
