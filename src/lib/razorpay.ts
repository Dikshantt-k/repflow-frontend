import { mockGatewayApi } from "./api";
import { formatPaise } from "./format";

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
  // The gym is on the test gateway (no real money): show a stand-in checkout instead of Razorpay's.
  if (options.keyId === "mock") return openMockCheckout(options);
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
  order: { orderId: string; amountPaise: number; keyId: string; currency?: string };
  orgName: string;
  description: string;
}): Promise<RazorpayProofFields> {
  return new Promise((resolve, reject) => {
    openRazorpayCheckout({
      keyId: opts.order.keyId,
      order_id: opts.order.orderId,
      amount: opts.order.amountPaise,
      currency: opts.order.currency ?? "INR",
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

/**
 * Stand-in checkout for gyms on the test gateway. Looks like a payment sheet, makes clear no real
 * money moves, and on "Pay" asks the server for a signed proof, exactly what Razorpay returns.
 */
function openMockCheckout(options: Omit<RazorpayCheckoutOptions, "key"> & { keyId: string }): Promise<void> {
  {
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Test payment");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px";
    const card = document.createElement("div");
    card.style.cssText =
      "background:#fff;color:#0f172a;border-radius:14px;max-width:360px;width:100%;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.3);font:15px/1.45 system-ui,sans-serif";
    const amount = formatPaise(options.amount, options.currency);
    card.innerHTML = `
      <div style="font-size:12px;font-weight:700;letter-spacing:.04em;color:#b45309;background:#fef3c7;display:inline-block;padding:3px 8px;border-radius:999px">TEST PAYMENT · NO REAL MONEY</div>
      <div style="margin-top:12px;color:#475569" data-k="name"></div>
      <div style="font-size:28px;font-weight:700;margin:4px 0 2px" data-k="amount"></div>
      <div style="color:#64748b;font-size:13px" data-k="desc"></div>
      <div style="display:flex;gap:8px;margin-top:18px">
        <button type="button" data-k="cancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;cursor:pointer">Cancel</button>
        <button type="button" data-k="pay" style="flex:1;padding:10px;border-radius:10px;border:0;background:#0e6b5c;color:#fff;font-weight:600;cursor:pointer">Pay</button>
      </div>
      <div style="color:#b91c1c;font-size:13px;margin-top:10px" data-k="error"></div>`;
    const el = (k: string) => card.querySelector(`[data-k="${k}"]`) as HTMLElement;
    el("name").textContent = options.name;
    el("amount").textContent = amount;
    el("desc").textContent = options.description ?? "";
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    el("cancel").addEventListener("click", () => {
      close();
      options.modal?.ondismiss?.();
    });
    el("pay").addEventListener("click", async () => {
      const pay = el("pay") as HTMLButtonElement;
      pay.disabled = true;
      pay.textContent = "Paying…";
      try {
        const proof = await mockGatewayApi.pay(options.order_id);
        close();
        options.handler({
          razorpay_order_id: proof.razorpayOrderId,
          razorpay_payment_id: proof.razorpayPaymentId,
          razorpay_signature: proof.razorpaySignature,
        });
      } catch (err) {
        pay.disabled = false;
        pay.textContent = "Pay";
        el("error").textContent = err instanceof Error ? err.message : "Test payment failed.";
      }
    });
  }
  return Promise.resolve();
}
