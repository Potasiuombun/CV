const normalizePath = (pathname) => {
  if (!pathname || pathname === "") return "/";
  let next = pathname.trim();
  if (!next.startsWith("/")) next = `/${next}`;
  if (next.length > 1 && next.endsWith("/")) next = next.slice(0, -1);
  return next;
};

export const parseLocationRoute = (pathname, search) => {
  const path = normalizePath(pathname);
  const params = new URLSearchParams(search || "");
  return {
    route: path,
    contentId: params.get("content") || null,
    projectId: params.get("project") || null,
  };
};

export const buildRoomPath = (route) => normalizePath(route);

export const buildContentPath = (route, contentId) => {
  const path = normalizePath(route);
  const params = new URLSearchParams();
  params.set("content", contentId);
  return `${path}?${params.toString()}`;
};

export const buildProjectPath = (projectId) => {
  const params = new URLSearchParams();
  params.set("project", projectId);
  return `/projects?${params.toString()}`;
};
