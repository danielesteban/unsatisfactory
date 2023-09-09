import { Application } from 'express';
import multer from 'multer';
import nocache from 'nocache';
import { requireAuth } from '../core/auth';
import * as save from './save';
import * as user from './user';

const preventCache = nocache();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1048576 } });

export default (app: Application) => {
  app.get(
    '/save',
    preventCache,
    requireAuth(save.load)
  );

  app.put(
    '/save',
    preventCache,
    upload.single('file'),
    requireAuth(save.update),
  );

  app.delete(
    '/save',
    preventCache,
    requireAuth(save.remove),
  );

  app.get(
    '/user',
    preventCache,
    requireAuth(user.refreshSession)
  );

  app.put(
    '/user',
    preventCache,
    user.login
  );

  app.post(
    '/user',
    preventCache,
    user.register
  );
};
