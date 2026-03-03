import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

// Validation middleware
const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check the body, query, and params against the schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Everything is okay, move to next middleware or route
      next();
    } catch (err: any) {
      // If the error comes from Zod validation
      if (err instanceof ZodError && Array.isArray(err.errors)) {
        // Get all error messages
        const messages = err.errors.map((e) => e.message);
        return res.status(400).json({
          success: false,
          errors: messages,
        });
      }

      // If some other error happens
      return res.status(400).json({
        success: false,
        errors: [err?.message || 'Invalid data'],
      });
    }
  };
};

export default validate;
