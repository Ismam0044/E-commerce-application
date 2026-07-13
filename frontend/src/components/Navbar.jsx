import { Link } from "react-router";

export default function Navbar() {
  return (
    <header className="navbar bg-base-100 border-b border-base-300 px-4">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost normal-case text-xl">
          Northwind Supply
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <div className="menu menu-horizontal px-1">
          <Link to="/" className="btn btn-ghost">
            Home
          </Link>
          <Link to="/cart" className="btn btn-ghost">
            Cart
          </Link>
          <Link to="/orders" className="btn btn-ghost">
            Orders
          </Link>
          <Link to="/admin" className="btn btn-ghost">
            Admin
          </Link>
          <Link to="/demo-sentry" className="btn btn-ghost">
            Sentry
          </Link>
        </div>
      </div>
    </header>
  );
}
