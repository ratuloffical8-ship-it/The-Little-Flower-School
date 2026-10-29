// server/src/middleware/validate.ts
import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Validates a request section (body / query / params) against a Zod schema.
 * On success, REPLACES the section with the parsed+coerced value.
 * On failure, returns 400 with field-level error details.
 *
 * Usage:
 *   router.post('/apply', validate(admissionApplySchema), handler);
 *   router.get('/list', validate(listQuerySchema, 'query'), handler);
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace with parsed+coerced data
      (req as any)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.') || '_';
          if (!fieldErrors[path]) {
            fieldErrors[path] = issue.message;
          }
        }
        res.status(400).json({
          error: 'Validation failed',
          fields: fieldErrors,
        });
        return;
      }
      next(err);
    }
  };
}
