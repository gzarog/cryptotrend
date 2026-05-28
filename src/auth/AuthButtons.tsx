import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";

export const LoginButton = () => {
  const { loginWithRedirect } = useAuth0();
  return (
    <Button
      onClick={() =>
        loginWithRedirect({
          appState: { returnTo: window.location.pathname },
        })
      }
    >
      Log in
    </Button>
  );
};

export const SignUpButton = () => {
  const { loginWithRedirect } = useAuth0();
  return (
    <Button
      variant="secondary"
      onClick={() =>
        loginWithRedirect({
          authorizationParams: { screen_hint: "signup" },
          appState: { returnTo: window.location.pathname },
        })
      }
    >
      Sign up
    </Button>
  );
};

export const LogoutButton = () => {
  const { logout } = useAuth0();
  return (
    <Button
      variant="outline"
      onClick={() =>
        logout({ logoutParams: { returnTo: window.location.origin } })
      }
    >
      Log out
    </Button>
  );
};

export const AuthStatus = () => {
  const { isLoading, isAuthenticated, user } = useAuth0();
  if (isLoading) return <span className="text-sm">Loading…</span>;
  if (!isAuthenticated) {
    return (
      <div className="flex gap-2">
        <LoginButton />
        <SignUpButton />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">{user?.email ?? user?.name}</span>
      <LogoutButton />
    </div>
  );
};
