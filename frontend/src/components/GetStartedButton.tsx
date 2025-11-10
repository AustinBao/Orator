import { useNavigate } from 'react-router-dom';

export default function GetStartedButton({ children }) {
  const navigate = useNavigate();
  return (
    <button className="text-black bg-gradient-to-br from-custom-pink to-custom-orange focus:ring-4 focus:outline-none focus:ring-custom-pink dark:focus:ring-custom-pink font-medium rounded-full px-6 py-2 text-center transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(254,168,111,0.9),0_0_60px_rgba(255,222,243,0.7),0_0_90px_rgba(254,168,111,0.5)]" onClick={() => navigate("/app") }>{children}</button>
  );
}
