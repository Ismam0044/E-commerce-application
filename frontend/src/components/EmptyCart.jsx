import { Link } from "react-router-dom";
import { ShoppingCartIcon } from "lucide-react";

export default function EmptyCart() {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-10 text-center">
      <ShoppingCartIcon className="mx-auto mb-4 size-12 text-primary" aria-hidden />
      <h2 className="text-2xl font-semibold text-base-content">Your cart is empty</h2>
      <p className="mt-2 text-base-content/70">
        Add something from the catalog to start checkout.
      </p>
      <Link to="/" className="btn btn-primary mt-6">
        Continue shopping
      </Link>
    </div>
  );
}
