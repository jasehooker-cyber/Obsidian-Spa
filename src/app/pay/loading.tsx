export default function PayLoading() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-gold/30">
          <div className="h-6 w-6 animate-spin border-2 border-gold border-t-transparent" />
        </div>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">
          Loading Your Booking...
        </h1>
        <p className="text-muted">One moment while we pull up your details.</p>
      </div>
    </section>
  );
}
