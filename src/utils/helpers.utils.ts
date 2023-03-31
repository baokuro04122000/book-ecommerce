import mongoose from 'mongoose';
const {
  Types: { ObjectId },
} = mongoose;
type CustomError = {
  status: number;
  message: string;
};
export const errorResponse = ({ status, message }: CustomError) => {
  return {
    status,
    errors: {
      message,
    },
  };
};

export const handleRequest = (promise: any) => {
  return promise
    .then((data) => [undefined, data])
    .catch((err) => [err, undefined]);
};

export const validateObjectId = (id) =>
  ObjectId.isValid(id) && new ObjectId(id).toString() === id;
