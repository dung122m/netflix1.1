import { LoginForm } from "./LoginForm";
import { NetflixLogo } from "../vn-d838105b/icons";

export const LoginPage = () => {
  return (
    <div className="relative h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4 w-40">
        <NetflixLogo className="w-10 h-auto" />
      </div>
      <LoginForm />
    </div>
  );
};
