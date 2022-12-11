import { Link } from "@remix-run/react";
import type { LoaderFunction, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdminUser } from "~/session.server";

export const loader: LoaderFunction = async ({ request }: LoaderArgs) => {
  await requireAdminUser(request);
  return json({});
};

const AdminIndexRoute = () => {
  return (
    <p>
      <Link to="new" className="text-blue-600 underline">
        Create New Post
      </Link>
    </p>
  );
};

export default AdminIndexRoute;
