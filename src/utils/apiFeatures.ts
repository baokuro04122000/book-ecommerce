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
          sellerId: this.queryStr.sellerId,
        }
      : {};

    const categoryId = this.queryStr.categoryId
      ? {
          category: this.queryStr.categoryId,
        }
      : {};

    const name = this.queryStr.name
      ? {
          name: { $regex: this.queryStr.name, $options: 'i' },
        }
      : {};

    this.query = this.query.find({
      ...sellerId,
      ...categoryId,
      ...name,
    });
    return this;
  }

  sellerCategorySearch() {
    const sellerId = this.queryStr.sellerId
      ? {
          sellerId: this.queryStr.sellerId,
        }
      : {};
    const categoryId = this.queryStr.categoryId
      ? {
          category: this.queryStr.categoryId,
        }
      : {};

    const query = {
      $and: [sellerId, categoryId],
    };
    this.query = this.query.find({ ...query });
    return this;
  }

  filter() {
    const queryCopy = { ...this.queryStr };

    // Removing fields from the query
    const removeFields = ['limit', 'page', 'sellerId', 'categoryId', 'name'];
    removeFields.forEach((el) => delete queryCopy[el]);

    // Advance filter for price, ratings etc
    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  pagination(resPerPage = 10) {
    const currentPage = Number(this.queryStr.page) || 1;
    const skip = resPerPage * (currentPage - 1);

    this.query = this.query.limit(resPerPage).skip(skip);
    return this;
  }
}

export default APIFeatures;
