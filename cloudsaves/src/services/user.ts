import { badRequest, unauthorized } from '@hapi/boom';
import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import passport from 'passport';
import { AuthorizedRequest } from '../core/auth';
import { checkValidationResult } from '../core/errorHandler';
import { User, UserDocument } from '../models';

export const login = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 15 }),
  body('password')
    .trim()
    .not().isEmpty(),
  checkValidationResult,
  (req: Request, res: Response, next: NextFunction) => (
    passport.authenticate('local', (err: Error, user: UserDocument) => {
      if (err || !user) {
        next(err || unauthorized());
        return;
      }
      user
        .getSession()
        .then((session) => res.json(session))
        .catch(next);
    })(req, res)
  ),
];

export const refreshSession = (req: AuthorizedRequest, res: Response, next: NextFunction) => (
  req.user
    .getSession()
    .then((session) => res.json(session))
    .catch(next)
);

export const register = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 15 }),
  body('password')
    .trim()
    .not().isEmpty(),
  checkValidationResult,
  (req: Request, res: Response, next: NextFunction) => (
    User
      .create({
        username: req.body.username,
        password: req.body.password,
      })
      .then((user) => user.getSession())
      .then((session) => res.json(session))
      .catch((err) => (
        next(err.code === 11000 ? badRequest() : err)
      ))
  ),
];
