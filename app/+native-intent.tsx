export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    // If notification opens "ojam://player"
    if (path.includes("player")) {
      return "/player";
    }

    return path;
  } catch {
    return "/";
  }
}