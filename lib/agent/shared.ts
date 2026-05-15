import path from "node:path";

export const projectRoot = (): string => process.cwd();

/**
 * Resolves a relative path to the project root
 *
 * @param target The relative file path to resolve
 * @returns The resolved file path
 */
export const resolveWithinProject = (target: string): string => {
  const root = projectRoot();
  const resolved = path.resolve(root, target);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(
      `Path ${target} escapes the project directory and is not allowed.`
    );
  }
  return resolved;
};
