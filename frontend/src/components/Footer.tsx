import { AiFillFacebook, AiFillInstagram, AiOutlineLinkedin } from "react-icons/ai";

export default function Footer() {
  return (
    <footer className="w-full bg-indigo-100 py-6 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-12">
      {/* Left section */}
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-gray-700 font-medium">
        <a href="#" className="hover:text-indigo-500 transition">Contact Us</a>
        <a href="#" className="hover:text-indigo-500 transition">Privacy Policy</a>
      </div>

      {/* Right section (social icons) */}
      <div className="flex items-center gap-6 text-gray-700">
        <a href="#" aria-label="Facebook" className="hover:text-indigo-500 transition">
          <AiFillFacebook size={28} />
        </a>
        <a href="#" aria-label="Instagram" className="hover:text-indigo-500 transition">
          <AiFillInstagram size={28} />
        </a>
        <a href="#" aria-label="LinkedIn" className="hover:text-indigo-500 transition">
          <AiOutlineLinkedin size={28} />
        </a>
      </div>
    </footer>
  );
}
