/** The shared look of everything that floats: menus, popovers, and the cards over the board. A
 *  seat-0 to seat-1 hairline runs along the top edge, faded out before the corners. */
export const surfaceClass =
	"relative rounded-xl border bg-popover/95 text-popover-foreground shadow-xl shadow-black/40 backdrop-blur-md before:pointer-events-none before:absolute before:inset-x-3 before:-top-px before:h-px before:bg-linear-to-r before:from-seat-0 before:to-seat-1 before:mask-x-from-70%";

/** Entrance and exit for bits-ui floating content: a quick fade and slight scale from the trigger's
 *  side. Off under reduced motion. Pair with an `origin-(--bits-…-transform-origin)` class. */
export const floatingMotionClass =
	"motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:zoom-out-95 motion-safe:data-closed:duration-100";
