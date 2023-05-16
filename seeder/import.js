/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
const slugify = require('slugify');
const { generate } = require('shortid');
const json = require('./data.json');
const id_user_json = require('./id_user.json');
const id_category = require('./category.json');
const id_seller = require('./mongo_data/sellers.json');
const products = json?.products;
const sellers = json.sellers;
const users = json.users;
const id_user = [...id_user_json];
const { faker } = require('@faker-js/faker');

const makeProducts = products?.map((product) => {
  return {
    author: product.author,
    description: faker.commerce.productDescription(),
    name: product.title,
    category: {
      $oid: id_category[Math.floor(Math.random() * 5)]._id.$oid,
    },
    sellerId: {
      $oid: id_seller[Math.floor(Math.random() * 9)]._id.$oid,
    },
    variants: [
      {
        type: 'kindle',
        price: Number(faker.commerce.price()),
        discount: Math.floor(Math.random() * 101),
        maxOrder: 10,
        quantity: Math.floor(Math.random() * 901) + 100,
      },
      {
        type: 'paperBack',
        price: Number(faker.commerce.price()),
        discount: Math.floor(Math.random() * 101),
        maxOrder: 10,
        quantity: Math.floor(Math.random() * 901) + 100,
      },
    ],
    slug: slugify(product.title) + '-' + generate(),
    productPictures: [`/images/products/${product.imageLink.split('/')[1]}`],
    specs: [
      { k: 'author', v: product.author },
      { k: 'printLength', v: product.pages },
      { k: 'language', v: product.language },
      { k: 'city', v: product.country },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
});

const makeUser = users.map((user) => ({
  local: {
    email: user.email,
    password: '$2a$10$U9.fs2S9r2JFshBUULmzAeHneA41SnDEXdvUHxkIvSzGyYNoI7Zk.',
    verified: true,
  },
  info: {
    name: faker.person.fullName(),
    gender: faker.person.sexType(),
    birthDay: faker.date.birthdate(),
    avatar: faker.image.avatar(),
  },
  status: 'normal',
  role: 'user',
}));

const makeSeller = sellers.map((seller, index) => ({
  userId: id_user[index]._id.$oid,
  info: {
    name: seller.name,
    phone: faker.phone.number(),
    address: [
      {
        location: faker.location.streetAddress({ useFullAddress: true }),
      },
    ],
  },
  logo: faker.image.avatar(),
  slogan: faker.company.catchPhrase(),
  type: 'normal',
  meta: {
    totalSold: 0,
    totalProduct: 0,
    totalEvaluation: 0,
    ranking: 0,
  },
  isDisabled: false,
}));
const app = express();

app.get('/fake-data', (req, res) => {
  res.json(makeProducts);
});

app.get('/fake-user', (req, res) => {
  res.json(makeUser);
});

app.get('/fake-seller', (req, res) => {
  res.json(makeSeller);
});

app.listen(4000, () => {
  console.log('server running at 4000');
});
