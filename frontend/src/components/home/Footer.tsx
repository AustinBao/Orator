import { AiFillFacebook } from "react-icons/ai"; 
import { AiFillInstagram } from "react-icons/ai"; 
import { AiOutlineLinkedin } from "react-icons/ai"; 


export default function Footer() {  
  return (
    <div className="w-full bg-gradient-to-bl from-custom-orange via-white to-custom-pink py-30 px-20">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex gap-12 items-center">
          <a className="text-lg font-bold text-gray-900 hover:text-gray-600 transition-colors cursor-pointer">Contact Us</a>
          <span className="text-gray-400 text-2xl">•</span>
          <a className="text-lg font-bold text-gray-900 hover:text-gray-600 transition-colors cursor-pointer">Privacy Policy</a>
        </div>
        <div className="flex gap-6 items-center">
          <AiFillFacebook size={40} className="text-gray-900 hover:text-gray-600 transition-colors cursor-pointer" />
          <AiFillInstagram size={40} className="text-gray-900 hover:text-gray-600 transition-colors cursor-pointer" />
          <AiOutlineLinkedin size={40} className="text-gray-900 hover:text-gray-600 transition-colors cursor-pointer" />
        </div>
      </div>
    </div>
  );
}
