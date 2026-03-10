import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";

const validate = (schema: ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const messages = err.issues.map((e) => e.message);

        return res.status(400).json({
          success: false,
          errors: messages,
        });
      }

      return res.status(400).json({
        success: false,
        errors: [err?.message || "Invalid data"],
      });
    }
  };
};

export default validate;