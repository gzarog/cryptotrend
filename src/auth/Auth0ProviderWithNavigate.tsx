import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  children: ReactNode;
}

export const Auth0ProviderWithNavigate = ({ children }: Props) => {
  const navigate = useNavigate();

  const domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined;

  if (!domain || !clientId) {
    console.warn(
      "[Auth0] Missing VITE_AUTH0_DOMAIN or VITE_AUTH0_CLIENT_ID. Auth is disabled.",
    );
    return <>{children}</>;
  }

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(audience ? { audience } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};
