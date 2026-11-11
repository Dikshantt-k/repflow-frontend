export interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loadPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loadPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load the payment widget. Check your connection and try again."));
    document.body.appendChild(script);
  });
  return loadPromise;
}

export async function openRazorpayCheckout(options: Omit<RazorpayCheckoutOptions, "key"> & { keyId: string }): Promise<void> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error("Payment widget failed to load.");
  const { keyId, ...rest } = options;
  new window.Razorpay({ key: keyId, ...rest }).open();
}

export interface RazorpayProofFields {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Shared staff-side "pay via UPI" step: opens checkout for an already-created order and
 * resolves with the proof fields once Razorpay confirms the payment, or rejects if the
 * staff member closes the widget before paying.
 */
export function collectUpiPayment(opts: {
  order: { orderId: string; amountPaise: number; keyId: string };
  orgName: string;
  description: string;
}): Promise<RazorpayProofFields> {
  return new Promise((resolve, reject) => {
    openRazorpayCheckout({
      keyId: opts.order.keyId,
      order_id: opts.order.orderId,
      amount: opts.order.amountPaise,
      currency: "INR",
      name: opts.orgName,
      description: opts.description,
      theme: { color: "#0e6b5c" },
      modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
      handler: (response) =>
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }),
    }).catch(reject);
  });
}
