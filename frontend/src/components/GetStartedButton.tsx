import { useNavigate } from 'react-router-dom';

export default function GetStartedButton({ children }) {
  const navigate = useNavigate();
  return (
    <button className="text-white bg-gradient-to-br from-pink-500 to-orange-400 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800 font-medium rounded-full px-6 py-2 text-center" onClick={() => navigate("/app") }>{children}</button>
  );
}
