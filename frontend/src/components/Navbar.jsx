import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X, Twitter, Send, BookOpen } from "lucide-react"; // Removed unused Star import
import blazelyLogo from "../assets/blazely-logo.png";
import { ConnectKitButton } from "connectkit";

// --- Custom Discord Icon (as it's not in lucide-react) ---
const DiscordIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M20.317,4.485c-0.843-0.512-1.762-0.913-2.738-1.181c-0.08-0.024-0.164-0.038-0.25-0.038c-0.194,0-0.38,0.061-0.528,0.178 c-0.551,0.43-0.988,0.963-1.32,1.59c-1.398-0.293-2.822-0.293-4.22,0C10.932,4.996,10.495,4.463,9.944,4.033 c-0.148-0.117-0.334-0.178-0.528-0.178c-0.086,0-0.17,0.014-0.25,0.038C8.19,3.572,7.27,3.973,6.428,4.485 c-0.143,0.086-0.222,0.24-0.222,0.4c-0.002,0.322,0.043,0.643,0.134,0.959c-1.432,1.611-2.236,3.676-2.236,5.821 c0,4.469,2.83,8.232,6.588,9.261c0.141,0.038,0.283,0.013,0.404-0.065c0.121-0.078,0.203-0.203,0.22-0.341 c0.045-0.34,0.113-0.678,0.201-1.011c-0.574-0.229-1.117-0.528-1.612-0.89c-0.115-0.084-0.25-0.12-0.388-0.101 c-0.138,0.019-0.264,0.084-0.354,0.183c-1.2,1.309-2.793,2.02-4.444,2.02c-0.231,0-0.422-0.191-0.422-0.422 c0-0.211,0.157-0.389,0.363-0.418c0.822-0.114,1.604-0.393,2.321-0.817c0.126-0.074,0.205-0.205,0.215-0.347 c0.01-0.142-0.049-0.28-0.158-0.368C5.253,14.004,5.253,14.004,5.253,14c-0.404-0.34-0.778-0.72-1.112-1.134 c-0.093-0.114-0.24-0.169-0.389-0.15c-0.149,0.02-0.281,0.09-0.37,0.207c-0.297,0.395-0.57,0.81-0.81,1.238 c-0.05,0.088-0.131,0.15-0.226,0.174c-0.095,0.024-0.196,0.007-0.28-0.045c-0.422-0.26-0.81-0.564-1.16-0.906 C1.001,13.1,1,12.712,1,11.684c0-2.247,0.865-4.38,2.396-6.065C3.35,5.49,3.308,5.361,3.254,5.229 c-0.01-0.024-0.02-0.049-0.028-0.073c-0.002-0.005-0.003-0.01-0.005-0.015c-0.012-0.033-0.021-0.067-0.028-0.1 c-0.025-0.118-0.033-0.236-0.026-0.354c0.009-0.142,0.06-0.279,0.147-0.39c0.912-1.134,2.236-1.921,3.708-2.316 C7.458,1.905,7.91,1.83,8.366,1.83c1.47,0,2.916,0.329,4.22,0.939c1.52,0.708,2.784,1.789,3.708,3.172 c0.048,0.074,0.08,0.154,0.093,0.239c0.014,0.09,0.01,0.179-0.009,0.265c-0.067,0.296-0.18,0.581-0.334,0.85 c-0.06,0.104-0.078,0.23-0.047,0.347c0.031,0.117,0.108,0.214,0.215,0.27c0.887,0.465,1.693,1.042,2.396,1.733 c0.116,0.114,0.18,0.27,0.18,0.435c0,0.231-0.191,0.422-0.422,0.422c-1.651,0-3.244-0.711-4.444-2.02 c-0.09-0.099-0.216-0.164-0.354-0.183c-0.138-0.019-0.273,0.017-0.388,0.101c-0.495,0.362-1.038,0.661-1.612,0.89 c0.088,0.333,0.156,0.671,0.201,1.011c0.017,0.138,0.099,0.263,0.22,0.341c0.121,0.078,0.263,0.103,0.404,0.065 C20.17,19.916,23,16.153,23,11.684C23,9.539,22.196,7.474,20.764,5.864C20.855,5.543,20.9,5.222,20.898,4.885 C20.898,4.725,20.819,4.571,20.676,4.485z" />
  </svg>
);

// UPDATED: Added "Leaderboard"
const navLinks = [
  { name: "Home", path: "/", end: true },
  { name: "Leaderboard", path: "/leaderboard" },
  { name: "Create Token", path: "/create" },
  { name: "Bridge", path: "/bridge" },
  { name: "Profile", path: "/profile" },
];

// NEW: Array for social links
const socialLinks = [
  { name: "Twitter", href: "#", icon: Twitter },
  { name: "Telegram", href: "#", icon: Send },
  { name: "Discord", href: "#", icon: DiscordIcon },
  { name: "Docs", href: "#", icon: BookOpen },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const getNavLinkClass = ({ isActive }) =>
    `relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-in-out ` +
    (isActive
      ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white shadow-inner shadow-white/5"
      : "text-slate-300 hover:text-white hover:bg-slate-800/50");

  return (
    <nav className="sticky top-0 z-50">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />

      <div className="bg-slate-950/60 backdrop-blur-xl border-b border-slate-800/70">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
          <Link to="/" className="group flex items-center gap-3">
            <img
              src={blazelyLogo}
              alt="Blazely"
              className="w-10 h-10 rounded-xl shadow-lg group-hover:rotate-6 transition-transform duration-300 ease-in-out"
            />
            <span className="text-2xl font-extrabold tracking-wide bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:bg-gradient-to-l transition-all duration-500">
              Blazely
            </span>
          </Link>

          <div className="hidden lg:flex items-center space-x-2 bg-slate-900/50 p-2 rounded-full border border-slate-800/80 shadow-inner shadow-black/20">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={getNavLinkClass}
                end={link.end}
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          {/* Connect Wallet Button (Desktop) - using ConnectKit default styling now */}
          <div className="hidden lg:block">
            <ConnectKitButton />
          </div>

          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-3 rounded-full hover:bg-slate-800/60 transition-colors duration-300 text-slate-300 hover:text-white group"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X
                  size={24}
                  className="group-hover:rotate-90 transition-transform duration-300"
                />
              ) : (
                <Menu
                  size={24}
                  className="group-hover:scale-110 transition-transform duration-300"
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden animate-slideDown absolute top-full left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/70 shadow-2xl">
          <div className="px-6 py-8 space-y-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center text-lg font-semibold p-4 rounded-xl transition-all duration-300 ` +
                  (isActive
                    ? "text-white bg-gradient-to-r from-cyan-500/20 to-purple-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50")
                }
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </NavLink>
            ))}
            <div className="pt-6 border-t border-slate-800">
              <ConnectKitButton />
            </div>
            {/* NEW: Mobile Social Links */}
            <div className="pt-8 border-t border-slate-800">
              <div className="flex items-center justify-around">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    aria-label={link.name}
                    className="p-3 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <link.icon className="w-6 h-6" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keep slideDown animation CSS (used for mobile menu) */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
