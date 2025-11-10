import { AiFillFacebook } from "react-icons/ai"; 
import { AiFillInstagram } from "react-icons/ai"; 
import { AiOutlineLinkedin } from "react-icons/ai"; 


export default function Footer() {  
  return (
    <div className="min-h-30 w-screen flex items-center bg-indigo-100 gap-16 px-30">
      <a>Contact Us</a> 
      <a>Privacy Policy</a>
      <AiFillFacebook size={32} />
      <AiFillInstagram size={32} />
      <AiOutlineLinkedin size={32}/>
    </div>
  );
}
