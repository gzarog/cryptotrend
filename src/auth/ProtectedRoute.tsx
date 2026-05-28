import { withAuthenticationRequired } from "@auth0/auth0-react";
import { type ComponentType } from "react";

export const ProtectedRoute = ({
  component,
}: {
  component: ComponentType<object>;
}) => {
  const Component = withAuthenticationRequired(component, {
    onRedirecting: () => <div className="p-8">Redirecting to login…</div>,
  });
  return <Component />;
};
