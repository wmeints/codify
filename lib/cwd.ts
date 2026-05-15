import { homedir } from "node:os";

export const getDisplayCwd = (): string => {
  const cwd = process.cwd();
  const home = homedir();

  if (cwd === home) {
    return "~";
  }
  if (cwd.startsWith(`${home}/`)) {
    return `~${cwd.slice(home.length)}`;
  }
  return cwd;
};
