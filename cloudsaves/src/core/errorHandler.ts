import { badData, boomify, Boom } from '@hapi/boom';
import { Application, Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { production } from './config';

export const checkValidationResult = (req: Request, _res: Response, next: NextFunction) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    // const [{ location, path, msg }] = result.array({ onlyFirstError: true });
    // throw badData(`${location}[${path}]: ${msg}`);
    throw badData();
  }
  next();
};

export const setup = (app: Application) => {
  app.get('*', (_req: Request, res: Response) => res.status(404).end());
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (!(err as any).isBoom) {
      err = boomify(err);
    }
    const { output } = err as Boom;
    res.status(output.statusCode).end();
    if (!production && output.statusCode === 500) {
      console.error(err);
    }
  });
};
