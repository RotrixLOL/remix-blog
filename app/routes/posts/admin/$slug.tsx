import {
  Form,
  useActionData,
  useTransition,
  useLoaderData,
  useParams,
} from "@remix-run/react";
import type {
  ActionArgs,
  ActionFunction,
  LoaderFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createPost } from "~/models/post.server";
import invariant from "tiny-invariant";
import { requireAdminUser } from "~/session.server";
import type { LoaderArgs } from "@remix-run/node";
import type { Post } from "../../../models/post.server";
import { getPost, updatePost, deletePost } from "../../../models/post.server";
import { useCatch } from "@remix-run/react";

type LoaderData = { post?: Post };

export const loader: LoaderFunction = async ({
  request,
  params,
}: LoaderArgs) => {
  await requireAdminUser(request);
  invariant(params.slug, "slug is required");
  if (params.slug === "new") {
    return json<LoaderData>({});
  }

  const post = await getPost(params.slug);
  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }
  return json<LoaderData>({ post });
};

type ActionData =
  | {
      title: null | string;
      slug: null | string;
      markdown: null | string;
    }
  | undefined;

export const action: ActionFunction = async ({
  request,
  params,
}: ActionArgs) => {
  await requireAdminUser(request);
  invariant(params.slug, "slug is required");
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deletePost(params.slug);
    return redirect("/posts/admin");
  }

  const title = formData.get("title");
  const slug = formData.get("slug");
  const markdown = formData.get("markdown");

  const errors: ActionData = {
    title: title ? null : "Title is required",
    slug: slug ? null : "Slug is required",
    markdown: markdown ? null : "Markdown is required",
  };

  const hasErrors = Object.values(errors).some((errorMsg) => errorMsg);
  if (hasErrors) {
    return json<ActionData>(errors);
  }

  invariant(typeof title === "string", "title must be a string");
  invariant(typeof slug === "string", "title must be a string");
  invariant(typeof markdown === "string", "title must be a string");

  if (params.slug === "new") {
    await createPost({ title, slug, markdown });
  } else {
    await updatePost(params.slug, { title, slug, markdown });
  }

  return redirect("/posts/admin");
};

const inputClassName = `w-full rounded border border-gray-500 px-2 py-1 text-lg`;

export default function NewPostRoute() {
  const data = useLoaderData() as LoaderData;
  const errors = useActionData() as ActionData;

  const transition = useTransition();
  const isCreating = transition.submission?.formData.get("intent") === "create";
  const isUpdating = transition.submission?.formData.get("intent") === "update";
  const isDeleting = transition.submission?.formData.get("intent") === "delete";
  const isNewPost = !data.post;

  return (
    <Form method="post" key={data.post?.slug ?? "new"}>
      <label>
        Post Title:{" "}
        {errors?.title && <em className="text-red-600">{errors.title}</em>}
      </label>
      <input
        type="text"
        name="title"
        className={inputClassName}
        defaultValue={data.post?.title}
      />

      <label>
        Post Slug:{" "}
        {errors?.slug && <em className="text-red-600">{errors.slug}</em>}
      </label>
      <input
        type="text"
        name="slug"
        className={inputClassName}
        defaultValue={data.post?.slug}
      />

      <label>
        Markdown:{" "}
        {errors?.markdown && (
          <em className="text-red-600">{errors.markdown}</em>
        )}
      </label>
      <textarea
        id="markdown"
        name="markdown"
        rows={15}
        className={`${inputClassName} font-mono`}
        defaultValue={data.post?.markdown}
      />

      <div className="flex justify-end gap-4">
        {!isNewPost && (
          <button
            type="submit"
            name="intent"
            value="delete"
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 focus:bg-red-400 disabled:bg-red-300"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        )}
        <button
          type="submit"
          name="intent"
          value={isNewPost ? "create" : "update"}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:bg-blue-300"
          disabled={isCreating || isUpdating}
        >
          {isNewPost && (isCreating ? "Creating..." : "Create Post")}
          {!isNewPost && (isUpdating ? "Updating..." : "Update")}
        </button>
      </div>
    </Form>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  if (caught.status === 404) {
    return (
      <div>Uh oh! This post with the slug "{params.slug}" does not exist!</div>
    );
  }

  throw new Error(`Unsupported thrown response status code: ${caught.status}`);
}
