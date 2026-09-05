import { Request } from "express";

/** Express 5's req.params values are typed string | string[]; routes here never use array-producing patterns. */
export function paramId(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}
