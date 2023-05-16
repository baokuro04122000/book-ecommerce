import mongoose from 'mongoose';

class APIFeatures {
  query: any;
  queryStr: any;
  constructor(query: any, queryStr: any) {
    this.query = query;
    this.queryStr = queryStr;
  }

  search() {
    const sellerId = this.queryStr.sellerId
      ? {
          sellerId: new mongoose.Types.ObjectId(this.queryStr.sellerId),
        }
      : {};

    const categoryId = this.queryStr.categoryId
      ? {
          category: new mongoose.Types.ObjectId(this.queryStr.categoryId),
        }
      : {};

    const name = this.queryStr.name
      ? {
          name: { $regex: this.queryStr.name, $options: 'i' },
        }
      : {};

    const author = this.queryStr.author
      ? {
          specs: {
            $elemMatch: {
              k: 'author',
              v: { $regex: this.queryStr.author, $options: 'i' },
            },
          },
        }
      : {};

    this.query = this.query.find({
      $or: [sellerId, categoryId, name, author],
    });
    return this;
  }

  sellerCategorySearch() {
    const sellerId = this.queryStr.sellerId
      ? {
          sellerId: new mongoose.Types.ObjectId(this.queryStr.sellerId),
        }
      : {};
    const categoryId = this.queryStr.categoryId
      ? {
          category: new mongoose.Types.ObjectId(this.queryStr.categoryId),
        }
      : {};

    const query = {
      $and: [sellerId, categoryId],
    };
    this.query = this.query.find({ ...query });
    return this;
  }

  userSearch() {
    const userId = this.queryStr.userId
      ? {
          _id: new mongoose.Types.ObjectId(this.queryStr.userId),
        }
      : {};
    const name = this.queryStr.name
      ? {
          'info.name': { $regex: this.queryStr.name, $options: 'i' },
        }
      : {};
    const email = this.queryStr.email
      ? {
          $or: [
            {
              'local.email': { $regex: this.queryStr.email, $options: 'i' },
            },
            {
              'google.email': { $regex: this.queryStr.email, $options: 'i' },
            },
          ],
        }
      : {};

    this.query = this.query.find({
      ...userId,
      ...name,
      ...email,
      role: { $ne: 'admin' },
    });
    return this;
  }

  filter() {
    const queryCopy = { ...this.queryStr };

    // Removing fields from the query
    const removeFields = [
      'limit',
      'page',
      'sellerId',
      'categoryId',
      'name',
      'categoryName',
      'author',
    ];
    removeFields.forEach((el) => delete queryCopy[el]);

    // Advance filter for price, ratings etc
    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);

    const sort = new Map([
      ['desc', this.query.find(JSON.parse(queryStr)).sort({ createdAt: -1 })],
      ['asec', this.query.find(JSON.parse(queryStr)).sort({ createdAt: 1 })],
      [
        'price',
        this.query
          .find({
            variants: {
              $elemMatch: { type: 'paperBack', ...JSON.parse(queryStr) },
            },
          })
          .sort({
            'variants.price': 1,
          }),
      ],
    ]);

    if (this.queryStr.order) {
      this.query = sort.get(this.queryStr.order)
        ? sort.get(this.queryStr.order)
        : this.query.find({}).sort({ createdAt: 1 });
    }

    if (this.query.price) {
      this.query = sort.get('price')
        ? sort.get(this.queryStr.order)
        : this.query.find({}).sort({ createdAt: 1 });
    }

    return this;
  }

  pagination(resPerPage = 10) {
    const limit = resPerPage < 100 ? resPerPage : 10;
    // check max product 100
    const currentPage = Number(this.queryStr.page) || 1;
    const skip = limit * (currentPage - 1);

    this.query = this.query.limit(limit).skip(skip);
    return this;
  }
}

export default APIFeatures;
