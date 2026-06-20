import { ConfirmBooking } from "./ConfirmBooking";

export const metadata = {
  title: "Booking Confirmed | Obsidian Men's Spa",
  description: "Your session has been booked.",
};

export default function BookingSuccessPage() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-lg text-center">
        <ConfirmBooking />
      </div>
    </section>
  );
}
