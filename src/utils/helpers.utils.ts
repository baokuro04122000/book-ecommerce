import mongoose from 'mongoose';
import * as _ from 'lodash';
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

export const totalPriceProduct = (
  price: number,
  quantity: number,
  discount: number,
) => {
  return discount != 0
    ? price * quantity * (1 - discount / 100)
    : price * quantity;
};

export const getPaginatedItems = (
  items: any,
  page: number,
  pageSize: number,
) => {
  const pg = page || 1;
  const pgSize = pageSize || 10;
  const offset = (pg - 1) * pgSize;
  const pagedItems = _.drop(items, offset).slice(0, pgSize);
  return {
    page: pg,
    pageSize: pgSize,
    total: items.length,
    total_pages: Math.ceil(items.length / pgSize),
    data: pagedItems,
  };
};
