const mongoose = require('mongoose');
const fileHelper = require('../util/file');

const { validationResult } = require('express-validator');

const Product = require('../models/product');
const product = require('../models/product');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  const price = req.body.price;
  const description = req.body.description;

  if (!req.files || !req.files.image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: { title, price, description },
      errorMessage: 'Please upload an image.',
      validationErrors: [],
    });
  }

  const image = req.files.image;

  const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];

  if (!allowedTypes.includes(image.mimetype)) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: { title, price, description },
      errorMessage: 'Only PNG, JPG, and JPEG allowed.',
      validationErrors: [],
    });
  }

  const fileName = Date.now() + '-' + image.name;
  const uploadPath = 'images/' + fileName;

  try {
    await image.mv(uploadPath);

    const product = new Product({
      title,
      price,
      description,
      imageUrl: uploadPath,
      userId: req.user._id,
    });

    await product.save();

    res.redirect('/admin/products');
  } catch (err) {
    return next(new Error(err));
  }
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const updatedDesc = req.body.description;

  const image = req.files?.image; // ✅ SAFE

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  Product.findById(prodId)
    .then((product) => {
      if (!product) return res.redirect('/');

      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect('/');
      }

      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;

      if (image) {
        // delete old image
        fileHelper.deleteFile(product.imageUrl);

        const fileName = Date.now() + '-' + image.name;
        const uploadPath = 'images/' + fileName;

        return image.mv(uploadPath).then(() => {
          product.imageUrl = '/' + uploadPath;
          return product.save();
        });
      }

      return product.save();
    })
    .then(() => {
      console.log('UPDATED PRODUCT!');
      res.redirect('/admin/products');
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  const ITEMS_PER_PAGE = 2;
  let totalItems;

  Product.find({ userId: req.user._id })
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;

      return Product.find({ userId: req.user._id })
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',

        // ✅ Required for pagination
        currentPage: page,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),

        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => console.log(err));
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return next(new Error('Porduct not found.!!'));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({ message: 'Success!!' });
    })
    .catch((err) => {
      res.status(500).json({ message: 'Error!!' });
    });
};
