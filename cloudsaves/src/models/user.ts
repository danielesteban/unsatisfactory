import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { model, HydratedDocument, Model, Schema } from 'mongoose';
import { sessionSecret } from '../core/config';

interface User {
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  getSession(): Promise<{ username: string; session: string; }>;
}

export type UserDocument = HydratedDocument<User, UserMethods>;

interface UserModel extends Model<User, {}, UserMethods> {
  fromToken(token: string): Promise<UserDocument>;
}

const UserSchema = new Schema<User, UserModel, UserMethods>({
  username: {
    type: String,
    required: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
  },
}, { timestamps: true });

UserSchema.index({ username: 1 }, { name: 'username_2', collation: { locale: 'en', strength: 2 }, unique: true });

UserSchema.pre('save', function onSave(next) {
  const user = this;
  if (user.isModified('username')) {
    user.username = user.username.slice(0, 15);
  }
  if (user.isModified('password')) {
    return bcrypt.genSalt(5, (err, salt) => {
      if (err) {
        return next(err);
      }
      return bcrypt.hash(user.password, salt, (err, hash) => {
        if (err) {
          return next(err);
        }
        user.password = hash;
        return next();
      });
    });
  }
  return next();
});

UserSchema.methods = {
  comparePassword(candidatePassword) {
    const user = this;
    return new Promise((resolve, reject) => (
      bcrypt.compare(candidatePassword, user.password, (err, isMatch) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(isMatch);
      })
    ));
  },
  getSession() {
    const user = this;
    return new Promise((resolve, reject) => (
      jwt.sign({ id: user.id }, sessionSecret, { expiresIn: '24h' }, (err, session) => {
        if (err || !session) {
          reject(err);
          return;
        }
        resolve({
          username: user.username,
          session,
        });
      })
    ));
  },
};

UserSchema.statics = {
  fromToken(token) {
    const User = this;
    return new Promise((resolve, reject) => (
      jwt.verify(token, sessionSecret, (err: Error | null, decoded: any) => {
        if (err || !decoded.id) {
          reject(err);
          return;
        }
        resolve(
          User.findById(decoded.id).orFail()
        );
      })
    ));
  },
};

export default model<User, UserModel>('User', UserSchema);
