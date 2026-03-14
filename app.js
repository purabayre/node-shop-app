const path = require('path');
require('dotenv').config();
const fs = require('fs');
// const https = require('https');
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const compression = require('compression');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const errorController = require('./controllers/error');
const User = require('./models/user');
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.wh3nx2o.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;

//
const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions',
});
const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

// const fileStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'images');
//   },
//   filename: (req, file, cb) => {
//     cb(null, new Date() + '-' + file.originalname);
//   },
// });

// const allowedMimeTypes = new Set(['image/png', 'image/jpg', 'image/jpeg']);

// const fileFilter = (req, file, cb) => {
//   if (!allowedMimeTypes.has(file.mimetype)) {
//     return cb(new Error('Only PNG, JPG, and JPEG files are allowed.'), false);
//   }
//   cb(null, true);
// };

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const { image } = require('pdfkit');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' },
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: false }));
// app.use(multer({ storage: fileStorage }).single('image'));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    createParentPath: true,
  }),
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store,
  }),
);
app.use(flash());
app.use(csrfProtection);

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  // throw new Error('Sync Dummy');
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session?.isLoggedIn || false,
  });
});

app.get('/test', (req, res) => {
  res.send('Server is running');
});

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    // https
    //   .createServer({ key: privateKey, cert: certificate }, app)
    //   .listen(process.env.PORT || 3000);
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log('Server running');
    });
  })
  .catch((err) => {
    console.log(err);
  });
