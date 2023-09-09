import { model, HydratedDocument, Model, Schema, Types } from 'mongoose';

interface Save {
  file: Buffer;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type SaveDocument = HydratedDocument<Save>;

const SaveSchema = new Schema<Save>({
  file: {
    type: Buffer,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
}, { timestamps: true });

export default model<Save, Model<Save>>('Save', SaveSchema);
