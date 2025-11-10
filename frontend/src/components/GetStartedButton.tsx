import { useNavigate } from 'react-router-dom';

interface GetStartedButtonProps {
  children: React.ReactNode;
}

export default function GetStartedButton({ children }: GetStartedButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/app")}
      className="
        px-6 sm:px-8 py-2 sm:py-3 
        text-sm sm:text-base font-medium 
        text-white 
        bg-gradient-to-br from-pink-500 to-orange-400 
        hover:from-pink-600 hover:to-orange-500 
        focus:outline-none focus:ring-4 focus:ring-pink-200 
        dark:focus:ring-pink-800 
        rounded-full shadow-md hover:shadow-lg 
        transition duration-300 ease-in-out
      "
      aria-label="Get started"
    >
      {children}
    </button>
  );
}
