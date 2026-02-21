import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/");
  }, [setLocation]);

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <Redirect to="/" />;
}
