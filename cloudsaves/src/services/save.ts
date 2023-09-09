import { badData, notFound } from '@hapi/boom';
import { Response, NextFunction } from 'express';
import { AuthorizedRequest } from '../core/auth';
import { Save } from '../models';

export const load = (req: AuthorizedRequest, res: Response, next: NextFunction) => (
  Save
    .findOne({ user: req.user.id })
    .select('file')
    .orFail(notFound())
    .then((save) => res.contentType('application/json').send(save.file))
    .catch(next)
);

export const update = (req: AuthorizedRequest, res: Response, next: NextFunction) => {
  const { file } = (req as any);
  if (
    !file
    || !file.buffer
    || file.mimetype !== 'application/json'
  ) {
    return next(badData);
  }
  return Save
    .findOne({ user: req.user.id })
    .then((save) => {
      if (!save) {
        save = new Save({ file: file.buffer, user: req.user.id });
      } else {
        save.file = file.buffer;
      }
      return save.save();
    })
    .then(() => res.status(204).end())
    .catch(next);
};

export const remove = (req: AuthorizedRequest, res: Response, next: NextFunction) => (
  Save
    .deleteOne({ user: req.user.id })
    .then(() => res.status(204).end())
    .catch(next)
);
