import { useAuth0 } from "@auth0/auth0-react";
import { LogoutButton } from "@/auth/AuthButtons";

const Profile = () => {
  const { user, isLoading } = useAuth0();

  if (isLoading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <div className="flex items-center gap-4">
        {user?.picture && (
          <img
            src={user.picture}
            alt={user?.name ?? "avatar"}
            className="w-16 h-16 rounded-full"
          />
        )}
        <div>
          <div className="font-medium">{user?.name}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </div>
      </div>
      <pre className="text-xs bg-muted p-4 rounded overflow-auto">
        {JSON.stringify(user, null, 2)}
      </pre>
      <LogoutButton />
    </div>
  );
};

export default Profile;
