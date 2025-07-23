import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';


export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {

  @Prop({ required: true, unique: false })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  // @Prop({ required: true })
  // createdAt: Date;

  // @Prop({ required: true })
  // lastSignInAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
